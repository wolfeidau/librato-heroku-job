var fs = require('fs')
var path = require('path')
var LogParser = require('./lib/heroku_log_parser.js')
var hstate = require('./lib/heroku_state.js')

var optimist = require('optimist')
var split = require('split')

process.title = 'librato-heroku-job'

var argv = optimist
  .usage('Usage: $0 -f [file]')
  .demand(['f'])
  .alias('f', 'file')
  .describe('f', 'File containing Heroku syslog data.')
  .argv

var watchContext = {file: path.basename(argv.file), path: path.dirname(argv.file)}

console.log('Opening', watchContext.file, 'located in', watchContext.path)

// model for heroku hosts
var model = {}
var readOffset = 0

function processStateChange(data) {
  /*
   statechange { date: 'May 25 05:02:32',
   service: 'd.ae122222-1b12-1a1a-1111-12a23452311',
   component: 'heroku',
   dyno: 'web.2',
   message: 'State changed from starting to up',
   previousState: 'starting',
   currentState: 'up' }
   */

  if (!model.hasOwnProperty(data.service)) {
    // add service
    model[data.service] = {}
    model[data.service].dyno = {}
    model[data.service].dyno[data.dyno] = {state: data.currentState}
    model[data.service].updated = data.date
  } else {
    // update service
    model[data.service].dyno[data.dyno] = {state: data.currentState}
    model[data.service].updated = data.date
  }

  console.log('statechange', model[data.service])
}

function processSourceEvent(data) {
  /*
   { date: 'May 25 07:16:51',
   service: 'd.ae122222-1b12-1a1a-1111-12a23452311',
   component: 'heroku',
   dyno: 'worker.2',
   message: 'source=heroku.1111111.worker.2.11111111-1111-1111-1111-c9c7056b0867 measure=load_avg_1m val=0.66',
   source: 'heroku.1111111.worker.2.11111111-1111-1111-1111-c9c7056b0867' }
   */
  if (!model.hasOwnProperty(data.service)) {
    // add service
    model[data.service] = {}
    model[data.service].dyno = {}
    model[data.service].dyno[data.dyno] = {source: data.source}
    model[data.service].updated = data.date
  } else {
    // update service
    if (model[data.service].dyno[data.dyno]) {
      model[data.service].dyno[data.dyno].source = data.source
    } else {
      model[data.service].dyno[data.dyno] = {source: data.source}
    }
    model[data.service].updated = data.date
  }

  console.log('source', model[data.service])
}

function processHostEvent(data) {

  /*
   { date: 'May 25 13:02:58',
   service: 'd.ae122222-1b12-1a1a-1111-12a23452311',
   component: 'heroku',
   dyno: 'router',
   message: 'at=info method=POST path=/rest/XXX/camera/XXX/snapshot host=host.example.com fwd=1.1.1.1 dyno=web.1 connect=4ms service=1498ms status=200 bytes=5',
   host: 'host.example.com',
   fwd: '1.1.1.1' }
   */
  if (!model.hasOwnProperty(data.service)) {
    // add service
    model[data.service] = {}
    model[data.service].dyno = {}
    model[data.service].dyno[data.dyno] = {host: data.host, fwd: data.fwd}
    model[data.service].updated = data.date
  } else {
    // update service
    if (model[data.service].dyno[data.dyno]) {
      model[data.service].dyno[data.dyno].source = data.host
      model[data.service].dyno[data.dyno].fwd = data.fwd
    } else {
      model[data.service].dyno[data.dyno] = {host: data.host, fwd: data.fwd}
    }
    model[data.service].updated = data.date
  }

  console.log('host', model[data.service])

}

function watchFile() {

  var watchContext = {file: path.basename(argv.file), path: path.dirname(argv.file)}

  fs.watch(watchContext.path, function (event, filename) {
//        console.log('event', event, 'filename', filename)
    if (filename == watchContext.file) {
      fs.stat(argv.file, function (err, stat) {
        if (err) throw err
        if (readOffset > stat.size) {
          readOffset = 0
          return
        }
        var startOffset = readOffset
        readOffset = stat.size
        fs.createReadStream(argv.file, {start: startOffset, end: readOffset})
          .pipe(split())
          .pipe(new LogParser())
          .on('data', function (line) {
            console.log('line', line)
          })
      })
    }
  })
}
var domain = require('domain')
var d = domain.create()

d.on('error', function(er) {
  console.error('error', er.stack)
})

d.add(argv)
d.add(readOffset)

d.run(function() {
  fs.stat(argv.file, function (err, stat) {
    if (err) throw err
    readOffset = stat.size
    fs.createReadStream(argv.file, {encoding: 'utf8'}).pipe(new LogParser())
      .on('statechange', processStateChange)
      .on('source', processSourceEvent)
      .on('host', processHostEvent)
      .on('end', watchFile)
      .pipe(hstate())
  })
})

