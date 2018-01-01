import URL from 'url'
import base32 from 'base32'
import {decodeAliasHost} from '../../../lib/functions'

function join (host, path) {
  if(!path) {
    return host
  }
  if(path.startsWith('/')) {
    path = path.substring(1)
  }
  if (path === '') {
    return host
  }
  if (host[host.length - 1] === '/') {
    return host + path
  }
  return host + '/' + path
}

export default function (sbot) {
  return function (request, callback) {
    var parsed = URL.parse(request.url, true, true)
    var {feedId, name} = decodeAliasHost(parsed.host)

    if (!name) {
      callback({
        url: 'beaker://alias/?author=' + encodeURIComponent(feedId)
      })
    } else {
      if (name === 'debugging') {
        return callback({
          url: join('http://localhost:8080/', parsed.path),
          method: request.method,
          uploadData: request.uploadData
        })
      }

      sbot.aboutResource.aliases.get((err, val) => {
        if (err) {
          console.error(err)
          return callback({error: 500})
        }
        if (!val || !val[feedId] || !val[feedId][name]) {
          return callback({error: 404})
        }

        var url = join(val[feedId][name].content.about, parsed.path)
        callback({
          url: url,
          method: request.method,
          uploadData: request.uploadData
        })
      })
    }
  }
}
