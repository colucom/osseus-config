const path = require('path')
const argv = require('yargs').argv
const _ = require('lodash')

const parser = function (keys, data) {
  const result = {}
  keys.forEach((k) => {
    let lowerK = k.toLowerCase()
    if (_.startsWith(lowerK, 'osseus_')) {
      let temp = lowerK.split('_')
      let topKey = temp[1]
      let innerKey = _.slice(temp, 2, temp.length).join('_')

      result[topKey] = result[topKey] || {}
      result[topKey][innerKey] = data[k].toLowerCase()
    } else {
      result[lowerK] = data[k].toLowerCase()
    }
  })
  return result
}

const cliParser = function () {
  const keys = _.difference(Object.keys(argv), ['_', 'help', 'version', '$0'])
  return parser(keys, argv)
}

const envParser = function () {
  // TODO
  return {}
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
