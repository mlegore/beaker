import party from 'ssb-party'
import toStream from 'pull-stream-to-stream'
import pull from 'pull-stream'
import {protocol} from 'electron'
import URL from 'url'
import http from 'http'
import streamToBuffer from 'stream-to-buffer'
import getFileType from 'file-type'
import aboutResource from 'ssb-about-resource'
import plugify from 'ssb-afterparty/plugify'
import path from 'path'
import {app} from 'electron'
import fs from 'fs'

import {cbPromise} from '../../lib/functions'
import {get as getSetting} from '../../background-process/dbs/settings'

import manifest from './manifest'
import internalManifest from './internalManifest'
import permissions from './permissions'
import onConnect from './muxrpcApi'
import aliasProtocol from './protocols/alias'
import blobProtocol from './protocols/blob'
import channelProtocol from './protocols/channel'

var flumedbStoragePath = path.join(app.getPath('userData'), 'flumedb')
if (!fs.existsSync(flumedbStoragePath)) {
  fs.mkdirSync(flumedbStoragePath);
}

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
    latest () {
      return toStream.source(sbot.latest())
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

  var getRealBlobPath = function (path) {
    if(!path) {
      return null
    }

    var parts = path.split('/')
    if (parts.length > 1) {
      return parts.slice(1).join('/')
    }

    return null
  }

  var aliasRegex = /^[a-zA-Z0-9-_]+$/;

  var setup = async function () {
    var sbot = await partyReady
    var sbotOptions = {
      flumeOpts: { dir: flumedbStoragePath }
    }
    var internalApi = plugify(sbot, sbotOptions).use(aboutResource)

    framework.exportAPI(manifest, api)
    framework.exportInternalAPI(internalManifest, {
      getAliases: function (author, cb) {
        if ('function' === typeof author) {
          cb = author
          author = null
        }

        internalApi.aboutResource.aliases.get((err, val) => {
          if (err) {
            return cb(err)
          }

          if (author) {
            return cb(null, val[author])
          }

          cb(null, val)
        })
      },
      getAbout: function (cb) {
        internalApi.aboutResource.about.get((err, val) => {
          if (err) {
            return cb(err)
          }

          cb(null, val)
        })
      },
      publishAlias: function(message, cb) {
        if(!message) {
          return cb('Message must be provided')
        }

        if(!message['name'] || !message['about']) {
          return cb('Message alias must be provided')
        }

        if(!aliasRegex.test(message['name'])) {
          return cb('Alias not properly formed')
        }

        var msg = {
          type: 'about-resource',
          about: message['about'],
          name: message['name']
        }

        if(message['description']) {
          msg['description'] = message['description']
        }

        console.log(msg)
        sbot.publish(msg, cb)
      }
    })

    protocol.registerBufferProtocol('ssb-blob', (request, callback) => {
      var parsed = URL.parse(request.url, true, true)
      var realPath = getRealBlobPath(parsed.pathname)
      if (realPath && realPath.startsWith('/$$$')) {
        channelProtocol(createLogStream)(request, callback)
      } else {
        blobProtocol(sbot)(request, callback)
      }
    }, (error) => {
      if (error) console.error('Failed to register protocol')
    })

    protocol.registerHttpProtocol('ssb', aliasProtocol(sbot), (error) => {
      if (error) console.error('Failed to register protocol')
    })

    protocol.registerHttpProtocol('ssb-extra', (request, callback) => {
      var url = request.url.replace('ssb-extra:', 'ssb:')
      callback({
        url: url,
        method: request.method,
        uploadData: request.uploadData
      })
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
