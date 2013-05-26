var https = require('https')
var request = require('request')

var Librato = function (options) {
  this._options = options || {}
  this._id = this._options.id || process.env.LIBRATO_ID
  this._key = this._options.key || process.env.LIBRATO_KEY
}

// https://metrics-api.librato.com/v1/metrics
Librato.prototype.getMetrics = function (options, callback) {
  console.log('getMetrics', options)
  request('https://metrics-api.librato.com/v1/metrics', {
      auth: {user: this._id, pass: this._key},
      qs: {offset: options.offset || 0, length: options.length | 100}
    },
    function (error, response, body) {
      if (error) callback(error)
      if (response.statusCode != 200) callback(new Error('bad response ' + response.statusCode + ' ' + body))
      callback(null, body)
    })
}

Librato.prototype.updateMetric = function (name, options, callback) {
  console.log('getMetrics', name, options)

  request.put('https://metrics-api.librato.com/v1/metrics/' + name, {
    auth: {user: this._id, pass: this._key},
    qs: options
  }, function(error, response, body){

    if (error) callback(error)
    if (response.statusCode != 204) callback(new Error('bad response ' + response.statusCode + ' ' + body))

    callback(null, body)

  })

}


module.exports = Librato