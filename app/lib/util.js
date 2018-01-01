var atob = require('atob')
var base32 = require('base32')

function encodeFeedIdBase32 (feedId) {
  var parts = feedId.substring(1).split('.')
  return base32.encode(atob(parts[0])) + '.' + parts[1]
}

module.exports = function encodeAliasUri(feedId, name) {
  return 'ssb://' + name + '.' + encodeFeedIdBase32(feedId)
}
