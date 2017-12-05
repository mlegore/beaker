import party from 'ssb-party'
import toStream from 'pull-stream-to-stream'
import pull from 'pull-stream'
import {protocol} from 'electron'
import {cbPromise} from '../../lib/functions'
import protocolHandler from './protocol'
import manifest from './manifest'
import permissions from './permissions'

export default function (framework) {
  var party = require('ssb-party')
  var partyReady = cbPromise(cb => party(cb))
  var sbot = null

  partyReady.then(function (ssb) {
    sbot = ssb
  })

  var unboxMessage = function (ssb, message, cb) {
    if (message && message.value && message.value.content && typeof message.value.content === 'string') {
      ssb.private.unbox(message.value.content, (err, value) => {
        if (err) {
          cb(err)
        } else {
          message.value.content = value
          message.value.private = true
          cb(null, message)
        }
      })
    } else {
      cb(null, message)
    }
  }

  var unbox = function (stream, decrypt) {
    if(decrypt) {
      return pull(
        stream,
        pull.asyncMap((message, cb) => unboxMessage(sbot, message, cb)))
    }

    return stream
  }

  var api = {
    async ready () {
      sbot = await partyReady
      return true
    },
    get (msgId, cb) {
      return sbot.get(msgId, cb)
    },
    createFeedStream (opts = {}) {
      return toStream.source(sbot.createFeedStream(opts))
    },
    createLogStream (opts = {}) {
      return toStream.source(sbot.createLogStream(opts))
    },
    messagesByType (opts = {}) {
      return toStream.source(sbot.messagesByType(opts))
    },
    createHistoryStream (opts = {}) {
      return toStream.source(sbot.createHistoryStream(opts))
    },
    createUserStream (opts = {}, decrypt = true) {
      if (!opts.id) {
        throw 'Must specify id'
      }

      return toStream.source(unbox(sbot.createUserStream(opts), decrypt))
    },
    whoami (cb) {
      sbot.whoami(cb)
    },
    async publish (message, cb) {
      if (!(message && message.type)) {
        cb('message type required')
      }

      var permission = await framework.queryPermission('publish:' + message.type, this.sender)
      if(!permission) {
        throw 'cannot publish this message type'
      }

      sbot.publish(message, cb)
    },
    since (cb) {
      var updateSince = function () {
        sbot.status((err, status) => {
          if(err)
            throw err
          cb('update', status.sync.since)
          setTimeout(updateSince, 200)
        })
      }
      updateSince()
    }
  }

  var setup = async function () {
    framework.exportAPI(manifest, api)
    var sbot = await partyReady
    protocol.registerBufferProtocol('ssb-blob', protocolHandler(sbot), (error) => {
      if (error) console.error('Failed to register protocol')
    })
  }

  return {
    api,
    manifest,
    permissions,
    setup
  }
}
