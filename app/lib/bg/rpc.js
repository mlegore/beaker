import URL from 'url'
const SECURE_ORIGIN_REGEX = /^(beaker:|dat:|https:|http:\/\/localhost(\/|:))/i

export function internalOnly (event, methodName, args) {
  return (event && event.sender && event.sender.getURL().startsWith('beaker:'))
}

export function internalOnlyOrAuthorPage (event, methodName, args) {
  if (!event || !event.sender) {
    return false
  }

  var url = URL.parse(event.sender.getURL())
  var isAliasAuthorPage = url.protocol === 'ssb-alias:'
    && (!url.pathname || url.pathname === '/')
    && url.host.split('.').length === 2

  return isAliasAuthorPage || event.sender.getURL().startsWith('beaker:')
}

export function secureOnly (event, methodName, args) {
  if (!(event && event.sender)) {
    return false
  }
  var url = event.sender.getURL()
  return SECURE_ORIGIN_REGEX.test(url)
}
