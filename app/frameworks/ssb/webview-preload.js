import errors from 'beaker-error-constants'
import {cbPromise} from '../../lib/functions'
import frameworkManifest from './manifest'
import toPull from 'stream-to-pull-stream'
import afterParty from './afterparty'
import Observable from 'obv'

export default async function (frameworkLoader, options) {
  var ssbRpc = frameworkLoader.importAPI(frameworkManifest, { timeout: false, errors })

  var views = {}

  // Wait for ssb to be ready
  await ssbRpc.ready()

  var manifest = {
    get: 'async',
    createFeedStream: 'source',
    createLogStream: 'source',
    createHistoryStream: 'source',
    createUserStream: 'source',
    latest: 'source',
    messagesByType: 'source',
    whoami: 'async',
    publish: 'async',
    since: 'async',
    manifest: 'sync'
  }

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
    latest (raw) {
      var stream = ssbRpc.latest()
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
    publish (message, cb) {
      ssbRpc.publish(message, cb)
    },
    whoami (cb) {
      if (cb)
        ssbRpc.whoami(cb)
      else
        return cbPromise(innerCb => ssbRpc.whoami(innerCb))
    },
    requestPublishPermission (type) {
      return frameworkLoader.requestFrameworkPermission('publish:' + type)
    },
    since (cb) {
      return ssbRpc.since(cb)
    },
    connect () {
      return ssbRpc.connect()
    },
    manifest
  }

  return ssb
}
