import errors from 'beaker-error-constants'
import frameworkManifest from './manifest'

export default function (frameworkLoader, options) {
  var helloRpc = frameworkLoader.importAPI(frameworkManifest, { timeout: false, errors })
  var i = 0
  var api = {
    helloSync (message) {
      helloRpc.helloSync(message)
    },
    sayHelloSync (message) {
      return helloRpc.sayHelloSync(message)
    },
    sayHelloAsync (message, cb) {
      return helloRpc.sayHelloAsync(message, cb)
    },
    listenHello (cb) {
      var eventTarget = helloRpc.listenHello()
      eventTarget.addEventListener('message', event => cb(event.data))
    },
    sendHello (message) {
      helloRpc.sendHello(message)
    },
    promiseHello (message) {
      return helloRpc.promiseHello(message)
    },
    async requestAllPermissions() {
      await frameworkLoader.requestFrameworkPermission('helloSync')
      await frameworkLoader.requestFrameworkPermission('helloAsync')
      await frameworkLoader.requestFrameworkPermission('helloPromise')
      await frameworkLoader.requestFrameworkPermission('helloListen')
      await frameworkLoader.requestFrameworkPermission('helloSend')
    }
  }

  return api
}
