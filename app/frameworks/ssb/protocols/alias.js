import URL from 'url'
import {getBeakerServerInfo} from '../../../background-process/protocols/beaker'

export default function (sbot) {
  var beakerServer = getBeakerServerInfo()

  return function (request, callback) {
    var parsed = URL.parse(request.url, true, true)
    var pathParts = parsed.path.split('/')
    if (pathParts.length === 0) {
      return callback({error: 400})
    }

    var aliasParts = pathParts.shift().split('~')

    var author = decodeURIComponent(aliasParts.shift())
    if (aliasParts.length === 0) {
      var url = 'beaker://alias/?author=' + encodeURIComponent(author)

      // Directly redirect to localhost assets server
      callback({
        url: `http://localhost:${beakerServer.serverPort}/?url=${encodeURIComponent(url)}&nonce=${beakerServer.requestNonce}`,
        method: request.method
      })
    } else {
      var name = decodeURIComponent(aliasParts.shift())
      var path = pathParts.join('/')

      sbot.aboutResource.aliases.get((err, val) => {
        if (err) {
          console.error(err)
          return callback({error: 500})
        }
        if (!val || !val[author] || !val[author][name]) {
          return callback({error: 404})
        }

        var url = val[author][name].content.about + path
        callback({
          url: url,
          method: request.method,
          uploadData: request.uploadData
        })
      })
    }
  }
}
