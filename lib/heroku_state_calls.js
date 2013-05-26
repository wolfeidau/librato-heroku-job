var events = require('events')

var _events = new events.EventEmitter()

module.exports = function herokuEvents(model) {
  return {
    processStateChange: function (data) {
      processStateChange(model, data)
    }, processSourceEvent: function (data) {
      processSourceEvent(model, data)
    }, processHostEvent: function (data) {
      processHostEvent(model, data)
    }, events: _events
  }
}

function processStateChange(model, data) {
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
    _events.emit('newservice', model[data.service])
  } else {
    // update service
    model[data.service].dyno[data.dyno] = {state: data.currentState}
    model[data.service].updated = data.date
    _events.emit('statechangeservice', model[data.service])
  }

  //console.log('statechange', model[data.service])
}

function processSourceEvent(model, data) {
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
    _events.emit('newservice', model[data.service])
  } else {
    // update service
    if (model[data.service].dyno[data.dyno]) {
      model[data.service].dyno[data.dyno].source = data.source
      _events.emit('newsource', model[data.service])
    } else {
      model[data.service].dyno[data.dyno] = {source: data.source}
      _events.emit('updatesource', model[data.service])
    }
    model[data.service].updated = data.date
    _events.emit('updateservice', model[data.service])
  }

  //console.log('source', model[data.service])
}

function processHostEvent(model, data) {

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
    _events.emit('newservice', model[data.service])
  } else {
    // update service
    if (model[data.service].dyno[data.dyno]) {
      model[data.service].dyno[data.dyno].source = data.host
      model[data.service].dyno[data.dyno].fwd = data.fwd
    } else {
      model[data.service].dyno[data.dyno] = {host: data.host, fwd: data.fwd}
    }
    model[data.service].updated = data.date
    _events.emit('updateservice', model[data.service])
  }

  //console.log('host', model[data.service])

}

