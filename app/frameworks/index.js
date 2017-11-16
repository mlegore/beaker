import { lstatSync, readdirSync } from 'fs'
import { toStream } from 'emit-stream'
import through from 'through'
import { path, join } from 'path'
import hello from './hello/index.js'
import { Writable } from 'stream';
import rpc from 'pauls-electron-rpc'

function emitterAPIToStream(method) {
  return (...args) => {
    var cb = function(type, data) {
      s.writable && s.write([type, {data}]);
    }

    args.push(cb)
    var emitter = method.apply(this, args)

    var s = through(
        function write (a) {
            this.emit('data', a);
        },
        function end () {
            // If we need to remove listeners upstream, do so
            cb.close && cb.close()
        }
    )

    return s
  }
}

function framework (frameworkName) {
  return {
    exportAPI (manifest, api, options) {
      // Extend api to support EventEmitters and Listeners
      api = Object.keys(api).reduce(function (acc, key) {
        acc[key] = manifest[key] === 'emitter' ? emitterAPIToStream(api[key]) : api[key]
        return acc
      }, {})

      manifest = Object.keys(manifest).reduce(function (acc, key) {
        acc[key] = manifest[key] === 'emitter' ? 'readable' : manifest[key]
        return acc
      }, {})

      rpc.exportAPI('framework/' + frameworkName, manifest, api, options)
    }
  }
}

var frameworks = { hello: hello(framework('hello')) }

export default {
  frameworks,
  setup () {
    for(var framework in frameworks) {
      if(frameworks.hasOwnProperty(framework)) {
        frameworks[framework].setup()
      }
    }
  }
}
