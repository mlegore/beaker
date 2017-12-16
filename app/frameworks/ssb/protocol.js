import concat from 'pull-concat/buffer'
import URL from 'url'
import ident from 'pull-identify-filetype'
import mime from 'mime-types'
import getFileType from 'file-type'
import pull from 'pull-stream'
import {unzipArchive, hashArchiveExists, getFromArchive} from './archive'
import { toStream } from '../../lib/functions'

export default function (sbot) {
  var waitFor = function (hash, cb) {
    sbot.blobs.has(hash, function (err, has) {
      if (err) return cb(err)
      if (has) {
        cb(null, has)
      } else {
        sbot.blobs.want(hash, cb)
      }
    })
  }

  var serve = function (hash, subDir, callback) {
    var fileType = null
    pull(
      sbot.blobs.get(hash),
      ident(type => {
        // docx shows up the same as zip
        if (type === 'docx')
          fileType = "zip"
        else
          fileType = type
      }),
      concat(function (err, buffer) {
        if(err) {
          callback({
            statusCode: 500,
            headers: {
              'Content-Type': 'text/html'
            },
            data: toStream(JSON.stringify(err))
          })
        } else {
          if (fileType === 'zip' && subDir !== null) {
            serveFromArchive(hash, subDir, buffer, callback)
          } else {
            callback({
              statusCode: 200,
              headers: {
                'Content-Type': fileType ? mime.lookup(fileType) : 'text/html'
              },
              data: toStream(buffer)})
          }
        }
      })
    )
  }

  function serveFromArchive (hash, subDir, archiveBuffer, callback) {
    let Duplex = require('stream').Duplex;

    var cb = function (err, buffer) {
      if (err) {
        if (err.code && err.code === "ENOENT") {
          callback({
            statusCode: 404,
            headers: {
              'Content-Type': 'text/html'
            },
            data: toStream('File not found')
          })
        } else {
          callback({
            statusCode: 500,
            headers: {
              'Content-Type': 'text/html'
            },
            data: toStream(JSON.stringify(err))
          })
        }
        return
      }

      // We need to provide filetype for when suffix is not given
      if (subDir === '') {
        callback({
          statusCode: 200,
          headers: {
            'Content-Type': 'text/html'
          },
          data: toStream(buffer)})
      } else {
        var ft = getFileType(buffer)
        callback({
          statusCode: 200,
          headers: {
            'Content-Type': (ft && ft.mime) ? ft.mime : 'text/html'
          },
          data: toStream(buffer)
        })
      }
    }

    if (archiveBuffer)
      unzipArchive(hash, archiveBuffer)
    getFromArchive(hash, subDir, cb)
  }


  return function (request, callback) {
    var parsed = URL.parse(request.url, true, true)
    var pathParts = parsed.path.split('/')

    if (!parsed.path) {
      return callback({
        statusCode: 400,
        headers: {
          'Content-Type': 'text/html'
        },
        data: toStream('Bad url')
      })
    }

    var hash = decodeURIComponent(pathParts.shift())
    var subDir = null
    if (pathParts.length > 0) {
      subDir = pathParts.join('/')
    }

    if (hashArchiveExists(hash)) {
      return serveFromArchive(hash, subDir, null, callback)
    }

    waitFor(hash, function (_, has) {
      if (!has) {
        callback({
          statusCode: 404,
          headers: {
            'Content-Type': 'text/html'
          },
          data: toStream('File not found')
        })
        return
      } else {
        serve(hash, subDir, callback)
      }
    })
  }
}
