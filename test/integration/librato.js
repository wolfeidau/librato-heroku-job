var Librato = require('../../lib/librato.js')
var async = require('async')

var librato = new Librato()

describe('Librato API', function () {

  this.timeout(50000)


  it('should retrieve a list of metrics', function (done) {


/*
    async.queue(function(metric, options, callback){

      librato.updateMetric(metric, options, function(err, data){

        if(err)

      })


    }, 20)
*/

    var regexRss = /.*\.rss/

    function processResults(data){
      data.metrics.forEach(function(metric){
        if(regexRss.exec(metric.name)){
          console.log('metric', metric)
        }
      })
    }

    function complete(err){
      if(err) throw err
      done()
    }

    function listMetrics(offset, length, processResults, callback) {
      var options = {offset: offset, length: length}
      librato.getMetrics(options, function (err, data) {

        if(err) {
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

  })

  it('should retrieve update of metrics attributes', function (done) {

    var metric = 'us-east-1.staging.stream.e01bb921bb244501b69a47b2158121a7.node.gauge.process.rss'
    var options = {'attributes[display_units_long]': 'memory', 'attributes[display_units_short]': 'bytes', 'attributes[display_min]': 0}

    librato.updateMetric(metric, options, function(err, data){

      if(err) throw err

      console.log(data)

      done()
    })
  })

})