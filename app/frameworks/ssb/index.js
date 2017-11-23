import manifest from './manifest'
import party from 'ssb-party'
import {cbPromise} from '../../lib/functions'
import toStream from 'pull-stream-to-stream'
import pull from 'pull-stream'
import {protocol} from 'electron'
import protocolHandler from './protocol'

export default function (framework) {
  var party = require('ssb-party')
  var partyReady = cbPromise(cb => party(cb))

  var unbox = function (ssb, message, cb) {
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

  var api = {
    async createFeedStream () {
      var ssbClient = await partyReady
      return toStream.source(ssbClient.createFeedStream({ live: true }))
    },
    async whoami(cb) {
      var ssbClient = await partyReady
      return await cbPromise(cb => ssbClient.whoami(cb))
    },
    async createUserStream(id) {
      var ssbClient = await partyReady

      var stream = pull(
        ssbClient.createUserStream({ id: id, live: true }),
        pull.asyncMap((message, cb) => unbox(ssbClient, message, cb)))

      return toStream.source(stream)
    },
    async publish (message) {
      var ssbClient = await partyReady
      return await cbPromise(cb => ssbClient.publish(message, cb))
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
    permissions: {},
    setup
  }
}
