import pull from 'pull-stream'
import pullStringify from 'pull-stringify'
import fromPull from 'pull-stream-to-stream'
import { Readable, Writable } from 'stream'
import { extractOrigin, toStream } from '../../lib/functions'
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
        data: toStream('cross-origin scripting forbidden')
      })
    }

    var limit = request.headers[limitHeader]
    var start = request.headers[startHeader]
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
    let r = new Readable({
      objectMode: false,
      read() {}
    })

    pull(
      stream,
      pullStringify.ldjson(),
      pull.drain(item => {
        r.push(item)
      }, () => r.push(null))
    )

    callback({
      statusCode: 200,
      data: r
    })
  }
}
