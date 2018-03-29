const path = require('path')
const argv = require('yargs').argv

let envFile = {}

const init = function () {
  var self = this
  return new Promise((resolve, reject) => {
    const cwd = process.cwd()
    const env = argv['ENV'] || process.env['ENV']

    if (env) {
      envFile = require(path.join(cwd, '/config/', env))
      let keys = Object.keys(envFile)
      keys.forEach((k) => {
        process.env[k] = envFile[k]
      })
    }

    resolve(self)
  })
}

const get = function (param) {
  param = param.toUpperCase()
  return argv[param] || process.env[param] || envFile[param]
}

module.exports = {
  init: init,
  get: get
}
