var fs = require('fs')
var path = require('path')
var LogParser = require('./lib/heroku_log_parser.js')
var hstate = require('./lib/heroku_state.js')
var through = require('through')

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


function watchFile() {

  console.log('watchFile call')

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
          .pipe(new LogParser(model))
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
    fs.createReadStream(argv.file, {encoding: 'utf8'})
      .on('end', watchFile)
      .pipe(split())
      .pipe(new LogParser(model))
  })
})

