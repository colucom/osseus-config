const path = require('path')
const argv = require('yargs').argv
const _ = require('lodash')
const async = require('async')
const AWS = require('aws-sdk')
const env = (argv['ENV'] || process.env['ENV'] || process.env['CFG_ENV'] || '').toUpperCase()
const application = (argv['APPLICATION_NAME'] || process.env['APPLICATION_NAME'] || process.env['CFG_APPLICATION_NAME'] || '').toUpperCase()
const endpoint = argv['AWS_SECRETS_ENDPOINT'] || process.env['AWS_SECRETS_ENDPOINT'] || process.env['CFG_AWS_SECRETS_ENDPOINT'] || 'https://secretsmanager.eu-west-1.amazonaws.com'
const region = argv['AWS_REGION'] || process.env['AWS_REGION'] || process.env['CFG_AWS_REGION'] || 'eu-west-1'

console.log(`env: ${env || 'undefined'}, application: ${application || 'undefined'}`)
console.log(`=========================================`)

// Create a Secrets Manager client
const secretsClient = new AWS.SecretsManager({
  endpoint: endpoint,
  region: region
})

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

const fetchSecrets = function (token, limit, list, cb) {
  if (!env || !application) {
    console.warn(`missing secrets configuration - skipping`)
    return cb(null, [])
  }

  list = list || []

  let options = {
    MaxResults: limit
  }

  if (token) options.NextToken = token

  secretsClient.listSecrets(options, function (err, secretList) {
    if (err) {
      console.error(`cannot get secrets list with error: ${err}`)
      return cb(null, [])
    }

    if (!secretList || secretList.length === 0) {
      console.warn(`secretList undefined or empty`)
      return cb(null, [])
    }

    const filtered = secretList.SecretList.filter(function (entry) {
      const name = entry.Name && entry.Name.toUpperCase()
      const check = env + '/' + application + '_'
      const general = env + '/' + 'GLOBAL_'

      return (!!~(name.indexOf(check.toUpperCase())) || !!~(name.indexOf(general.toUpperCase())))
    })

    const concated = list.concat(filtered)

    if (secretList.NextToken) {
      return fetchSecrets(token, limit, concated, cb)
    } else {
      return cb(null, concated)
    }
  })
}

const cliParser = function () {
  return new Promise((resolve, reject) => {
    const keys = _.difference(Object.keys(argv), ['_', 'help', 'version', '$0'])
    const result = parser(keys, argv)
    resolve(result)
  })
}

const envParser = function () {
  return new Promise((resolve, reject) => {
    const keys = _.remove(Object.keys(process.env), (k) => {
      let lowerK = k.toLowerCase()
      return _.startsWith(lowerK, 'cfg') || _.startsWith(lowerK, 'osseus')
    })
    const result = parser(keys, process.env)
    resolve(result)
  })
}

const fileParser = function () {
  return new Promise((resolve, reject) => {
    if (!env) {
      console.warn(`missing env configuration - skipping`)
      resolve({})
    }

    const cwd = process.cwd()
    const envFilePath = path.join(cwd, '/config/', env)

    try {
      const envFile = require(envFilePath)
      const keys = Object.keys(envFile)
      const result = parser(keys, envFile)
      resolve(result)
    } catch (err) {
      console.warn(`could not require ${envFilePath} - skipping`)
      resolve({})
    }
  })
}

const secretsParser = function () {
  return new Promise((resolve, reject) => {
    fetchSecrets(null, 50, [], function (err, filtered) {
      if (err) {
        reject(err)
      }

      async.each(filtered, function (secretFile, icb) {
        console.log(`loading ${secretFile.ARN}`)
        secretsClient.getSecretValue({SecretId: secretFile.ARN}, function (err, data) {
          if (err) {
            if (err.code === 'ResourceNotFoundException') {
              console.error(`The requested secret ${secretFile.ARN} was not found`)
            } else if (err.code === 'InvalidRequestException') {
              console.error(`The request was invalid due to: ${err.message}`)
            } else if (err.code === 'InvalidParameterException') {
              console.error(`The request had invalid params: ${err.message}`)
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
              console.warn(`AWS secrets is empty!!, ${secretFile.ARN}`)
              icb()
            }
          }
        })
      }, function (err, result) {
        if (err) {
          console.error(err)
          reject(err)
        }
        resolve(_.merge({}, result))
      })
    })
  })
}

const init = function () {
  return new Promise(async (resolve, reject) => {
    try {
      const envConf = await envParser()
      const fileConf = await fileParser()
      const secretsConf = await secretsParser()
      const cliConf = await cliParser()

      let result = {}
      _.assign(result, envConf, fileConf, secretsConf, cliConf)
      result.keys = Object.keys(result)
      let keysWithOsseusPrefix = result.keys.filter(obj => {
        return obj.startsWith('osseus')
      })

      if (keysWithOsseusPrefix.length === 0) {
        reject(new Error(`no configuration found - see https://github.com/colucom/osseus-config#usage`))
      }

      resolve(result)
    } catch (err) {
      reject(err)
    }
  })
}

module.exports = {
  init: init
}
