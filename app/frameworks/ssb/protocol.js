import concat from 'pull-concat/buffer'
import URL from 'url'
import ident from 'pull-identify-filetype'
import mime from 'mime-types'
import pull from 'pull-stream'

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

  var serve = function (hash, callback) {
    var mimeType = 'text/html'
    pull(
      sbot.blobs.get(hash),
      ident(type => {
        if(type) {
          mimeType = mime.lookup(type)
        }
      }),
      concat(function (err, buffer) {
        if(err) {
          callback({
            statusCode: 500,
            mimeType: 'text/html',
            data: Buffer.from(JSON.stringify(err))
          })
        } else {
          callback({
            statusCode: 200,
            mimeType: mimeType,
            data: buffer
          })
        }
      })
    )
  }

  return function (request, callback) {
    var parsed = URL.parse(request.url, true, true)
    var hash = decodeURIComponent(parsed.path)

    waitFor(hash, function (_, has) {
      if (!has) {
        callback({
          statusCode: 404,
          mimeType: 'text/html',
          data: Buffer.from('File not found')
        })
        return
      } else {
        serve(hash, callback)
      }
    })
  }
}
