[![JavaScript Style Guide](https://cdn.rawgit.com/standard/standard/master/badge.svg)](https://github.com/standard/standard)

# Osseus Config

The osseus configuration module parses: 

* Environment variables
* Environment specific files
* [AWS Secrets](https://aws.amazon.com/secrets-manager/)
* CLI arguments


The result is an object which will be used by other [osseus](https://github.com/colucom/osseus) modules.

*Note: all keys will be lowercased in the result object*

## Install
```bash
$ npm install osseus-config
```

## Usage

First, create `index.js`:

```javascript
const OsseusConfig = require('osseus-config')
const config = await OsseusConfig.init()
console.log(config)
```

## Special Properties

### hostInfo

You can use the `hostInfo` property in the osseus.config object.

In case your app is running on:
* localhost
    * `hostname` is the machine name
* aws
    * `hostname` is the instance id

These props can be accessed by: 
`osseus.config.hostInfo.hostname` and `osseus.config.hostInfo.pid`

### Environment variables
Environment variables must have a `CFG_` prefix in order to be parsed by `osseus-config`

##### Example
Running:

```bash
$ export CFG_SOME_VAR=value
$ node index.js
```

Will result in:

```js
{ some_var: 'value', keys: [ 'some_var' ] }
```

### Environment specific files

Environment files should be placed under `/config` folder in the root of the application.

In order for environment files to be parsed, need to define `ENV` variable matching the file name.

##### Example
Create `/config/LOCAL.js`

```javascript
module.exports = {
  DEBUG: true,
  OSSEUS_LOGGER_LOG_LEVEL: 'debug',
  OSSEUS_SERVER_PORT: '8888'
}
```

Running:

```sh
$ export CFG_ENV=LOCAL
$ node index.js
```

Will result in:

```js
{ env: 'LOCAL',
  debug: true,
  osseus_logger: { log_level: 'debug' },
  osseus_server: { port: 8888 },
  keys: [ 'env', 'debug', 'osseus_logger', 'osseus_server' ] }
```

*Note that keys starting with "osseus_" are broken into objects, more on this later*

### AWS Secrets

In order to use AWS Secrets need to define the following variables:

* `ENV` (or `CFG_ENV`)
	* no default
* `APPLICATION_NAME` (or `CFG_APPLICATION_NAME`)
	* no default
* `AWS_SECRETS_ENDPOINT` (or `CFG_AWS_SECRETS_ENDPOINT`)
	* default is `https://secretsmanager.eu-west-1.amazonaws.com`
* `AWS_REGION` (or `CFG_AWS_REGION`)
	* default is `eu-west-1`

When all relevant variables are defined, the secrets file names should be `ENV/APPLICATION_NAME_*`

Another secrets file which will be parsed if exists is `ENV/GLOBAL_*`

##### Example
Running:

```sh
$ export CFG_ENV=QA
$ export CFG_APPLICATION_NAME=MY_APP
$ node index.js
```

Will look for `QA/MY_APP_*` and `QA/GLOBAL_*` in AWS secrets manager and add the keys to the config result object.


### CLI arguments
`osseus-config` is using [yargs](https://github.com/yargs/yargs) to parse CLI arguments.

##### Example
Running:

```sh
$ node index.js --PARAM_1 hello --PARAM_2 123 --PARAM_3 ["'something'"]
```

Will result in:

```js
{ param_1: 'hello',
  param_2: 123,
  param_3: [ 'something' ],
  keys: [ 'param_1', 'param_2', 'param_3' ] }
```

## Parsers Hierarchy
1. CLI arguments
2. AWS Secrets
3. Environment specific files
4. Environment variables

##### Example
Create `/config/LOCAL.js`

```javascript
module.exports = {
  MY_PARAM: from_file
}
```

Running:

```sh
$ export CFG_ENV=LOCAL
$ export CFG_MY_PARAM=from_env
$ node index.js --MY_PARAM from_cli
```

Will result in:

```js
{ my_param: 'from_cli',
  env: 'LOCAL',
  keys: [ 'my_param', 'env' ] }
```

## Contributing
Please see [contributing guidelines](https://github.com/colucom/osseus-config/blob/master/.github/CONTRIBUTING.md).

## License
Code released under the [MIT License](https://github.com/colucom/osseus-config/blob/master/LICENSE).
