import errors from 'beaker-error-constants'
import frameworkManifest from './manifest'

export default function (frameworkLoader, options) {
  var ssbRpc = frameworkLoader.importAPI(frameworkManifest, { timeout: false, errors })

  var ssb = {
    createFeedStream() {
      return ssbRpc.createFeedStream()
    },
    async createMyUserStream() {
      var info = await ssbRpc.whoami()
      return ssbRpc.createUserStream(info.id)
    }
  }

  return ssb
}
