var fs = require('fs')
var path = require('path')
var util = require('util')
var split = require('split')

describe('Parse Heroku Logs', function(){

  it('should recognise and parse a state change event', function(done){
    fs.createReadStream('./data/state.log', {encoding: 'utf8'})
      .pipe(split())
    done()
  })

})