import pull from 'pull-stream'
import pullStringify from 'pull-stringify'
import fromPull from 'pull-stream-to-stream'
import { Readable, Writable } from 'stream'
import URL from 'url'
import { extractOrigin, toStream } from '../../../lib/functions'
const limitHeader = 'limit'
const startHeader = 'start'
const maxLimit = 2000

function getSender (request) {
  return {
    getURL() {
      return request.referrer
    }
  }
}

export default function channelProtocol (createChannel) {
  return async function (request, callback) {
    var referrerOrigin = await extractOrigin(request.referrer)
    var pathOrigin = await extractOrigin(request.url)
    if (referrerOrigin !== pathOrigin) {
      return callback({
        statusCode: 401,
        mimeType: 'text/html',
        data: Buffer.from('cross-origin scripting forbidden')
      })
    }

    var urlp = URL.parse(request.url, true)

    var limit = urlp.query['limit']
    var start = urlp.query['start']
    if (request.headers) {
      limit = request.headers[limitHeader] || urlp.query['limit']
      start = request.headers[startHeader] || urlp.query['start']
    }

    if(!limit || limit > maxLimit) {
      limit = maxLimit
    } else {
      limit = parseInt(limit)
    }

    if (start) {
      start = parseInt(start)
    }

    var sender = getSender(request)
    var stream = await createChannel(sender, start, limit)

    pull(
      stream,
      pullStringify.ldjson(),
      pull.concat(function (err, buffer) {
        callback(Buffer.from(buffer))
      })
    )
  }
}
