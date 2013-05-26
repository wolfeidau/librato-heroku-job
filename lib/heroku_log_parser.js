var stream = require('stream')
var util = require('util')
var hevents = require('./heroku_state_calls.js')


var logRe = /([a-zA-z]+\s[0-9]+\s[0-9]+:[0-9]+:[0-9]+)\s([0-9abcdef.-]+)\s([a-z]+)\[([\w.]+)\]\s(.*)/
var stateRe = /State changed from (\w+) to (\w+)/
var sourceRe = /source=([\w.-]+)/
var hostRe = /at=\w+\smethod=\w+\spath=[\w\/._-]+\shost=([\w.-]+)\sfwd=([\d\\."]+)\sdyno=([\w\.\d]+).*/


var LogParser = function (model) {
  stream.Transform.call(this, {objectMode: true})
  this._counter = 0
  this._counterMatched = 0
  this._logstats = true

  this._heventCalls = hevents(model)

  this.on('statechange', this._heventCalls.processStateChange)
  this.on('source', this._heventCalls.processSourceEvent)
  this.on('host', this._heventCalls.processHostEvent)
}

util.inherits(LogParser, stream.Transform)

// Just matches the main log statements at the moment
LogParser.prototype._transform = function (chunk, encoding, callback) {

  if (chunk) {
    var matches = logRe.exec(chunk)

    this._stats(matches)

    // is this a log entry
    if (matches) {

      var data = {date: matches[1], service: matches[2], component: matches[3], dyno: matches[4], message: matches[5]}

      // build a list of match functions to run against the log message
      var flist = Object.keys(this._matchers)

      // run through these functions till one returns true or we finish
      for (var i = 0; i < flist.length; i++) {
        if (this._matchers[flist[i]].apply(this, [data])) {
          // push the log entry down the line
          //this.push(data)
          break
        }
      }
    }
  }
  return callback()
}

LogParser.prototype._stats = function (matches) {
  this._counter++

  if (matches)
    this._counterMatched++

  if (this._logstats && this._counter % 10000 === 0) {
    console.log('stats count:', this._counter, 'matched:', this._counterMatched)
  }
}

LogParser.prototype._matchers = {
  statechange: function (data) {
    var matches = stateRe.exec(data.message)

    if (matches) {
      data.previousState = matches[1]
      data.currentState = matches[2]
      this.emit('statechange', data)
      return true
    }
  },
  source: function (data) {
    var matches = sourceRe.exec(data.message)

    if (matches) {
      data.source = matches[1]
      this.emit('source', data)
      return true
    }
  },
  host: function (data) {
    var matches = hostRe.exec(data.message)
    if (matches) {
      data.host = matches[1]
      data.fwd = matches[2]
      data.dyno = matches[3] // clober the dyno previously set
      this.emit('host', data)
      return true
    }

  }
}

module.exports = LogParser