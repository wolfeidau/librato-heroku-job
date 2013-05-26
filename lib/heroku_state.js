var through = require('through')

module.exports = function(callback){
  return through(onData)

  function onData(data){
    this.emit('data', data)
  }
}