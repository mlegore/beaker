import { Readable, Writable } from 'stream';
import emitStream from 'emit-stream'
import EventEmitter from 'events'
import permissions from './permissions'
import manifest from './manifest'

export default function (framework) {
  var promiseHello = function (message) {
    return new Promise((resolve, reject) => {
      setTimeout(function () {
        resolve('Hello ' + message)
      }, 1000);
    })
  }

  var readable = new Readable({ objectMode: true, read() {} })
  readable.close = () => {
    readable.push(null)
  }

  var helloEvents = new EventEmitter()

  var api = {
    sayHelloSync (message) {
      return 'Hello ' + message
    },
    sayHelloAsync (message, cb) {
      setTimeout(function () {
        cb(null, 'Hello ' + message)
      }, 1000);
    },
    listenHello (cb) {
      helloEvents.on('message', data => cb('message', data))
    },
    sendHello (message) {
      helloEvents.emit('message', message)
    },
    promiseHello (message) { return promiseHello('promise ' + message) }
  }

  var setup = function () {
    framework.exportAPI(manifest, api)
  }

  return {
    api,
    manifest,
    permissions,
    setup
  }
}
