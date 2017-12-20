import URL from 'url'

export default function (sbot) {
  return function (request, callback) {
    var parsed = URL.parse(request.url, true, true)
    var pathParts = parsed.path.split('/')
    if (pathParts.length === 0) {
      return callback({error: 400})
    }

    var author = decodeURIComponent(pathParts.shift())
    if (pathParts.length === 0) {
      callback({
        url: 'beaker://aliases/?author=' + encodeURIComponenet(author)
      })
    } else {
      var name = decodeURIComponent(pathParts.shift())
      var path = pathParts.join('/')

      sbot.aboutResource.aliases.get((err, val) => {
        if (err) {
          console.error(err)
          callback({error: 500})
        }
        if (!val || !val[author] || !val[author][name]) {
          callback({error: 404})
        }

        var url = val[author][name].about + '/' + path
        callback({
          url: url,
          method: request.method,
          uploadData: request.uploadData
        })
      })
    }
  }
}
