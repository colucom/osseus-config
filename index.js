const path = require('path')
const argv = require('yargs').argv
const _ = require('lodash')

const parser = function (keys, data) {
  const result = {}
  keys.forEach((k) => {
    let value = data[k]
    if (typeof value == 'string') {
      value = value.toLowerCase()
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
    return _.startsWith(lowerK, 'cfg')
  })
  return parser(keys, process.env)
}

const fileParser = function () {
  const cwd = process.cwd()
  const env = argv['ENV'] || process.env['ENV']

  if (!env) {
    return {}
  }

  const envFile = require(path.join(cwd, '/config/', env))
  const keys = Object.keys(envFile)
  return parser(keys, envFile)
}

const init = function () {
  return new Promise((resolve, reject) => {
    const cliConf = cliParser()
    const envConf = envParser()
    const fileConf = fileParser()

    _.assign(this, cliConf, envConf, fileConf)
    this.keys = Object.keys(this)

    resolve(this)
  })
}

module.exports = {
  init: init
}
