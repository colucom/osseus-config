const path = require('path')
const argv = require('yargs').argv
const _ = require('lodash')
const async = require('async')
const AWS = require('aws-sdk')
const env = (argv['ENV'] || process.env['ENV'] || 'local').toUpperCase()
const application = (argv['APPLICATION_NAME'] || process.env['APPLICATION_NAME']).toUpperCase()

const result = {}

const parser = function (keys, data) {
  keys.forEach((k) => {
    let value = data[k]
    if (typeof value === 'string') {
      value = value.split('\'').join('"')
    }
    try {
      value = JSON.parse(value)
    } catch (e) {}
    let lowerK = k.toLowerCase()
    if (_.startsWith(lowerK, 'osseus_')) {
      let temp = lowerK.split('_')
      let topKey = _.slice(temp, 0, 2).join('_')
      let innerKey = _.slice(temp, 2, temp.length).join('_')

      result[topKey] = result[topKey] || {}
      result[topKey][innerKey] = value
    } else if (_.startsWith(lowerK, 'cfg_')) {
      let key = lowerK.replace('cfg_', '')
      result[key] = value
    } else {
      result[lowerK] = value
    }
  })
  return result
}

const cliParser = function () {
  const keys = _.difference(Object.keys(argv), ['_', 'help', 'version', '$0'])
  return parser(keys, argv)
}

const envParser = function () {
  const keys = _.remove(Object.keys(process.env), (k) => {
    let lowerK = k.toLowerCase()
    return _.startsWith(lowerK, 'cfg') || _.startsWith(lowerK, 'osseus')
  })
  return parser(keys, process.env)
}

const fileParser = function () {
  const cwd = process.cwd()

  if (!env) {
    return {}
  }

  const envFile = require(path.join(cwd, '/config/', env))
  const keys = Object.keys(envFile)
  return parser(keys, envFile)
}

const secretsParser = function () {
  const endpoint = argv['AWS_SECRETS_ENDPOINT'] || process.env['AWS_SECRETS_ENDPOINT'] || 'https://secretsmanager.eu-west-1.amazonaws.com'
  const region = argv['AWS_REGION'] || process.env['AWS_REGION'] || 'eu-west-1'

  if (!endpoint || !region || !env || !application) {
    console.log('missing secrets configuration skipping')
    return {}
  }

  // Create a Secrets Manager client
  const client = new AWS.SecretsManager({
    endpoint: endpoint,
    region: region
  })

  client.listSecrets({}, function (err, secretList) {
    if (err) {
      console.log('cannot get secrets list skipping')
      return {}
    }

    var filtered = secretList.SecretList.filter(function (entry) {
      const name = entry.Name && entry.Name.toUpperCase()
      const check = env + '/' + application + '_'
      const general = env + '/' + 'GLOBAL_'

      return (!!~(name.indexOf(check.toUpperCase())) || !!~(name.indexOf(general.toUpperCase())))
    })

    async.each(filtered, function (secretFile, icb) {
      console.log('loading ', secretFile.ARN)
      client.getSecretValue({SecretId: secretFile.ARN}, function (err, data) {
        if (err) {
          if (err.code === 'ResourceNotFoundException') {
            console.log('The requested secret ' + secretFile.ARN + ' was not found')
          } else if (err.code === 'InvalidRequestException') {
            console.log('The request was invalid due to: ' + err.message)
          } else if (err.code === 'InvalidParameterException') {
            console.log('The request had invalid params: ' + err.message)
          }

          icb(err)
        } else {
          if (data.SecretString !== '') {
            try {
              const JSONdata = JSON.parse(data.SecretString)
              return icb(null, parser(Object.keys(JSONdata), JSONdata))
            } catch (e) {
              icb(e)
            }
          } else {
            console.log('AWS secrets is empty!!')
            icb()
          }
        }
      })
    }, function (err, result) {
      if (err) {
        console.log(err)
        throw new Error(err)
      }

      return _.merge({}, result)
    })
  })
}

const init = function () {
  return new Promise((resolve, reject) => {
    const cliConf = cliParser()
    const envConf = envParser()
    const fileConf = fileParser()
    const secretsConf = secretsParser()

    _.assign(this, envConf, fileConf, secretsConf, cliConf)
    this.keys = Object.keys(this)

    resolve(this)
  })
}

module.exports = {
  init: init
}
