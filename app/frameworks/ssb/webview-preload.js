import errors from 'beaker-error-constants'
import {cbPromise} from '../../lib/functions'
import frameworkManifest from './manifest'
import toPull from 'stream-to-pull-stream'
import afterParty from './afterparty'
import Observable from 'obv'

export default function (frameworkLoader, options) {
  var ssbRpc = frameworkLoader.importAPI(frameworkManifest, { timeout: false, errors })

  var views = {}

  var since = Observable()
  var eventTarget = ssbRpc.since()
  eventTarget.addEventListener('update', event => since.set(event.data))

  var ssb = {
    ready () {
      return ssbRpc.ready()
    },
    get (msgId, cb) {
      return ssbRpc.get(msgId, cb)
    },
    createFeedStream (opts, raw) {
      var stream = ssbRpc.createFeedStream(opts)
      return raw ? stream : toPull.source(stream)
    },
    createLogStream (opts, raw) {
      var stream = ssbRpc.createLogStream(opts)
      return raw ? stream : toPull.source(stream)
    },
    messagesByType (opts, raw) {
      var stream = ssbRpc.createLogStream(opts)
      return raw ? stream : toPull.source(stream)
    },
    createUserStream (opts, raw) {
      var stream = ssbRpc.createUserStream(opts)
      return raw ? stream : toPull.source(stream)
    },
    async createMyUserStream(raw) {
      var info = await cbPromise(cb => ssbRpc.whoami(cb))
      var stream = ssbRpc.createUserStream({id: info.id, live: true})
      return raw ? stream : toPull.source(stream)
    },
    whoami (cb) {
      if (cb)
        ssbRpc.whoami(cb)
      else
        return cbPromise(innerCb => ssbRpc.whoami(innerCb))
    },
    since
  }

  return afterParty(ssb)
}
