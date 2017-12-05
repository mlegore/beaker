import {queryPermission, grantPermission, requestPermission} from '../ui/permissions'
import {getFrameworkPerm} from '../../lib/strings'
import {UserDeniedError} from 'beaker-error-constants'

// exported api
// =

export default {
  async requestFrameworkPermission (frameworkName, permissionScope) {
    var perm = getFrameworkPerm(frameworkName, permissionScope)

    var allowed = await queryPermission(perm, this.sender)
    if(allowed) return true

    allowed = await requestPermission(perm, this.sender, { title: 'requesting permission to framework ' + frameworkName })
    if (!allowed) throw new UserDeniedError()

    return true
  }
}
