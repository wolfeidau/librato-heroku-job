#!/usr/bin/env node

var Librato = require('../lib/librato.js')
var async = require('async')
var librato = new Librato()


var queue = async.queue(function (metric, callback) {

  librato.updateMetric(metric.name, metric.attributes, function (err, data) {
    if (err) throw err;
    console.log(data)
    callback()
  }, 20)
})

// looking for metrics which end in the tags below
// as these are measurements of memory and need to
// be configured with some attributes
var regexRss = /.*\.(rss|heapUsed|heapTotal)/

var memAttributes = {'attributes[display_units_long]': 'memory', 'attributes[display_units_short]': 'bytes', 'attributes[display_min]': 0}

function processResults(data) {
  data.metrics.forEach(function (metric) {
    if (regexRss.exec(metric.name)) {
      //console.log('metric', metric)
      // if memory is set don't bother
      if(metric.attributes.display_units_long !== 'memory') {
        queue.push({name: metric.name, attributes: memAttributes})
      }
    }
  })
}

function complete(err) {
  if (err) throw err
//  done()
}

function listMetrics(offset, length, processResults, callback) {
  var options = {offset: offset, length: length}
  librato.getMetrics(options, function (err, data) {

    if (err) {
      callback(err)
      return
    }

    var obj = JSON.parse(data)
    var position = obj.query.offset + obj.query.length
    var remaining = obj.query.total - position

    processResults(obj)

    if (remaining > 0) {
      if (remaining < options.length) {
        listMetrics(position, length, processResults, callback)
      } else {
        listMetrics(position, length, processResults, callback)
      }
    } else {
      callback()
    }

  })
}

listMetrics(0, 100, processResults, complete)
