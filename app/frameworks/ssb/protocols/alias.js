import URL from 'url'

export default function (sbot) {
  return function (request, callback) {
    var parsed = URL.parse(request.url, true, true)
    var pathParts = parsed.path.split('/')
    if (pathParts.length === 0) {
      return callback({error: 400})
    }

    var aliasParts = pathParts.shift().split('~')

    var author = decodeURIComponent(aliasParts.shift())
    if (aliasParts.length === 0) {
      callback({
        url: 'beaker://alias/?author=' + encodeURIComponenet(author)
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
