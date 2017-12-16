import {toOutputStream} from 'ssb-afterparty/connect'
import fromPull from 'pull-stream-to-stream'

var manifest = {
  get: 'async',
  createFeedStream: 'source',
  createLogStream: 'source',
  createHistoryStream: 'source',
  createUserStream: 'source',
  messagesByType: 'source',
  whoami: 'async',
  publish: 'async',
  since: 'async',
  manifest: 'sync'
}

function createApi (sbot, framework, sender) {
  var api = {
    get (msgId, cb) {
      return sbot.get(msgId, cb)
    },
    createFeedStream (opts = {}) {
      return sbot.createFeedStream(opts)
    },
    createLogStream (opts = {}) {
      return sbot.createLogStream(opts)
    },
    messagesByType (opts = {}) {
      return sbot.messagesByType(opts)
    },
    createHistoryStream (opts = {}) {
      return sbot.createHistoryStream(opts)
    },
    createUserStream (opts = {}, decrypt = true) {
      if (!opts.id) {
        throw 'Must specify id'
      }

      return unbox(sbot.createUserStream(opts), decrypt)
    },
    whoami (cb) {
      sbot.whoami(cb)
    },
    async publish (message, cb) {
      if (!(message && message.type)) {
        cb('message type required')
      }

      var permission = await framework.queryPermission('publish:' + message.type, sender)
      if(!permission) {
        cb('cannot publish this message type')
        throw 'cannot publish this message type'
      }

      sbot.publish(message, cb)
    },
    since (cb) {
      sbot.status((err, status) => {
        if(err)
          return cb(err)
        cb(null, status.sync.since)
      })
    },
    manifest () {
      return manifest
    }
  }

  return api
}

export default function onConnect (sbot, framework, sender) {
  return fromPull(toOutputStream(createApi(sbot, framework, sender), manifest))
}
