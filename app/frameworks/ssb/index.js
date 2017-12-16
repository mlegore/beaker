import party from 'ssb-party'
import toStream from 'pull-stream-to-stream'
import pull from 'pull-stream'
import {protocol} from 'electron'
import {cbPromise} from '../../lib/functions'
import blobProtocolHandler from './protocol'
import manifest from './manifest'
import permissions from './permissions'
import onConnect from './muxrpcApi'
import channelProtocol from './channelProtocol'
import URL from 'url'
import http from 'http'
import streamToBuffer from 'stream-to-buffer'
import getFileType from 'file-type'
import {get as getSetting} from '../../background-process/dbs/settings'

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
      sbot.status((err, status) => {
        if(err)
          return cb(err)
        cb(null, status.sync.since)
      })
    },
    sinceStream () {
      var updateSince = function () {
        sbot.status((err, status) => {
          if(err)
            throw err
          cb('data', status.sync.since)
          setTimeout(updateSince, 200)
        })
      }
      updateSince()
    },
    connect () {
      return onConnect(sbot, framework, this.sender)
    }
  }

  var createLogStream = async function (sender, start, limit) {
    var permission = await framework.queryPermission(undefined, sender)
    if(!permission) {
      throw 'cannot publish access this api'
    }

    return sbot.createLogStream({ gt: start, limit, seq: true, values: true })
  }

  var setup = async function () {
    framework.exportAPI(manifest, api)
    var sbot = await partyReady
    protocol.registerBufferProtocol('ssb-blob', (request, callback) => {
      var parsed = URL.parse(request.url, true, true)
      if (parsed.path === '/$$$') {
        channelProtocol(createLogStream)(request, callback)
      } else {
        blobProtocolHandler(sbot)(request, callback)
      }
    }, (error) => {
      if (error) console.error('Failed to register protocol')
    })

    if (getSetting('intercept8080')) {
      console.warn('intercepting 8080 to serve ssb logStream to http://localhost:8080/$$$')
      protocol.interceptBufferProtocol('http', (request, callback) => {
        var parsed = URL.parse(request.url, true, true)
        if (parsed.pathname === '/$$$') {
          channelProtocol(createLogStream)(request, callback)
        } else {
          var opts = {
            hostname: parsed.hostname,
            path: parsed.path,
            port: parsed.port,
            headers: request.headers
          }

          var req = http.get(opts, res => {
            streamToBuffer(res, (err, buffer) => {
              if(err)
                return callback({
                  statusCode: 500,
                  mimeType: 'text/html',
                  data: Buffer.from(JSON.stringify(err))
                })

              var ct = res.headers['content-type']
              if (ct) {
                ct = ct.split(';')[0]
              }

              if (!ct) {
                var ft = getFileType(buffer)
                if (ft && ft.mime) {
                  ct = ft
                }
              }

              callback({
                statusCode: 200,
                mimeType: ct ? ct : 'text/html',
                data: buffer
              })
            })
          })

          req.on('error', e => console.error(e))
        }
      }, (error) => {
        if (error) console.error('Failed to register protocol')
      })
    }
  }

  return {
    api,
    manifest,
    permissions,
    setup
  }
}
