import {queryPermission, grantPermission, requestPermission} from '../ui/permissions'
import {extractOrigin} from '../../lib/functions'
import {getFrameworkPerm} from '../../lib/strings'
import {UserDeniedError} from 'beaker-error-constants'

// exported api
// =

var permissionCache = {}

export default {
  async requestFrameworkPermission (frameworkName, permissionScope) {
    var perm = getFrameworkPerm(frameworkName, permissionScope)

    var allowed = await queryPermission(perm, this.sender)
    var origin = extractOrigin(this.sender.getURL())
    if(!permissionCache[origin]) {
      permissionCache[origin] = {}
    }

    permissionCache[origin][perm] = allowed
    if (allowed) return true

    allowed = await requestPermission(perm, this.sender, { title: 'requesting permission to framework ' + frameworkName })
    if (!allowed) throw new UserDeniedError()

    return true
  }
}

export function getPermission (url, frameworkName, permissionScope) {
  var origin = extractOrigin(url)
  var perm = getFrameworkPerm(frameworkName, permissionScope)

  if (permissionCache[origin]) {
    return permissionCache[origin][perm]
  }

  return false
}
