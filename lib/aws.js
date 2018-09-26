module.exports = () => {
  const AWS = require('aws-sdk')
  const os = require('os')
  const cluster = require('cluster')
  const pid = cluster.worker && cluster.worker.process.pid ? cluster.worker.process.pid : process.pid

  return {
    getInstanceId: async () => {
      return new Promise(resolve => {
        const MetadataService = new AWS.MetadataService({httpOptions: {timeout: 1000}})
        MetadataService.request('/latest/meta-data/instance-id', (err, data) => {
          if (err) {
            return resolve({name: os.hostname(), pid: pid})
          }

          resolve({name: data, pid: pid})
        })
      }).catch(err => { console.error(err) })
    }
  }
}
