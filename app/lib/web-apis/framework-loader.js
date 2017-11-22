import rpc from 'pauls-electron-rpc'
import { EventTarget, bindEventStream, fromEventStream } from './event-target'
import errors from 'beaker-error-constants'
import frameworkManifest from '../api-manifests/external/framework'
import hello from '../../frameworks/hello/webview-preload'
import ssb from '../../frameworks/ssb/webview-preload'
import { path } from 'path'

var frameworks = {
  hello,
  ssb
}

var frameworkLoader = {}

var frameworkRpc = rpc.importAPI('framework', frameworkManifest, { timeout: false, errors })
var readableToEventTarget = function (method) { return function (...args) { return fromEventStream(method.apply(this, args)) }}

function FrameworkHelper (frameworkName, permission) {
  return {
    importAPI (manifest, options) {
      var transformedManifest = Object.keys(manifest).reduce(function(acc, key) {
        acc[key] = manifest[key] === 'emitter' ? 'readable' : manifest[key]
        return acc
      }, {})
      var api = rpc.importAPI('framework/' + frameworkName, transformedManifest, options)
      return Object.keys(api).reduce(function(acc, key) {
        acc[key] = manifest[key] === 'emitter' ? readableToEventTarget(api[key]) : api[key]
        return acc
      }, {})
    },
    requestFrameworkPermission (permissionId) {
      return frameworkRpc.requestFrameworkPermission(frameworkName, permissionId)
    }
  }
}

frameworkLoader.load = async function (frameworkName, options) {
  if(!frameworkName in frameworks)
    throw 'framework does not exist'

  var perm = await frameworkRpc.requestFrameworkPermission(frameworkName)
  if (!perm)
    throw 'framework permission denied'

  return frameworks[frameworkName](FrameworkHelper(frameworkName), options)
}

export default frameworkLoader
