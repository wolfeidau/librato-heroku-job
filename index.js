var fs = require('fs')
var path = require('path')
var through = require('through')
var optimist = require('optimist')
var sf = require('slice-file')
var LogParser = require('./lib/heroku_log_parser.js')

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

function buildLogParser(model) {
  var logParser = new LogParser(model)

  logParser.on('newservice', function(service){
    console.log('newservice', require('util').inspect(service))
  })

  logParser.on('statechangeservice', function(service){
    console.log('statechangeservice', require('util').inspect(service))
  })

  return logParser
}

var xs = sf(argv.file, {bufsize: 1048576})

xs.follow().pipe(buildLogParser(model))