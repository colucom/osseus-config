# Osseus Config

The Osseus configuration module parses: 

* CLI arguments
* Environment variables
* Environment files

The result is an object which will be passed to other Osseus modules

### Install
```bash
$ npm install osseus-config
```

### Usage

##### config/LOCAL.js
```code
module.exports = {
  DEBUG: true,
  OSSEUS_LOGGER_LOG_LEVEL: 'debug',
  OSSEUS_SERVER_PORT: '8888'
}
```

##### index.js
```code
const OsseusConfig = require('osseus-config')
const config = await OsseusConfig.init()

console.log(`env: ${config.env}`) // env: local
console.log(`debug: ${config.debug}`) // debug: true
console.log(`logger_log_level: ${config.logger.log_level}`) // logger_log_level: debug
console.log(`server_port: ${config.server.port}`) // server_port: 8888

console.log(`config keys: ${config.keys}`) // config keys: env,debug,logger,server
```

##### CLI
```console
$ node index.js --ENV LOCAL
```

##### IMPORTANT NOTE
Environment variables should have a prefix `CFG_`