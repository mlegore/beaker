import mapMerge from 'map-merge'
import Hookable from 'hoox'
var isArray = Array.isArray
import flumeFill from './flume'

// Mixin to allow loading of plugins for an already
// started instance of ssb or ssb-client
function clone (obj, mapper) {
  function map(v, k) {
    return isObject(v) ? clone(v, mapper) : mapper(v, k)
  }
  if(isArray(obj))
    return obj.map(map)
  else if(isObject(obj)) {
    var o = {}
    for(var k in obj)
      o[k] = map(obj[k], k)
    return o
  }
  else
    return map(obj)
}

function hookOptionalCB (syncFn) {
  // syncFn is a function that's expected to return its result or throw an error
  // we're going to hook it so you can optionally pass a callback
  syncFn.hook(function(fn, args) {
    // if a function is given as the last argument, treat it as a callback
    var cb = args[args.length - 1]
    if (typeof cb == 'function') {
      var res
      args.pop() // remove cb from the arguments
      try { res = fn.apply(this, args) }
      catch (e) { return cb(e) }
      cb(null, res)
    } else {
      // no cb provided, regular usage
      return fn.apply(this, args)
    }
  })
}

var merge = {
  api (a, b, mapper) {
    for(var k in b) {
      if(b[k] && 'object' === typeof b[k] && !Buffer.isBuffer(b[k]))
        merge.api(a[k] = {}, b[k], mapper)
      else
        a[k] = mapper(b[k], k)
    }

    return a
  },
  permissions (perms, _perms, name) {
    return mapMerge(perms,
      clone(_perms, function (v) {
        return name ? name + '.' + v : v
      })
    )
  },
  manifest (manf, _manf, name) {
    if(name) {
      var o = {}; o[name] = _manf; _manf = o
    }
    return mapMerge(manf, _manf)
  }
}

function init (api, plug, opts) {
  var _api = plug.init.call({createClient: api}, api, opts)
  if(plug.name) {
    var o = {}; o[plug.name] = _api; _api = o
  }

  return mapMerge(api, _api, function (v, k) {
    if ('function' === typeof v) {
      v = Hookable(v)
      if (plug.manifest && plug.manifest[k] === 'sync') {
        hookOptionalCB(v)
      }
    }
    return v
  })
}

export default function (api, opts = {}) {
  var plugins = []
  if (!('manifest' in api))
    api.manifest = {}
  if (!('permissions' in api))
    api.permissions = {}

  if (!('use' in api)) {
    process.env.FV_REDUCE_LS = true

    api.use = function (plug) {
      if('function' === typeof plug) {
        var p = {init: plug}
        plugins.push(p)
        init(api, plugin)
        return api
      }

      if(plug.name && 'string' === typeof plug.name)
        if(plugins.some(function (_plug) { return _plug.name === plug.name })) {
          console.warn(plug.name + ' already loaded')
          return api
        }

      if(!plug.init)
        throw new Error('plugins *must* have "init" method')

      var name = plug.name
      if(plug.manifest)
        api.manifest =
          merge.manifest(api.manifest, plug.manifest, name)
      if(plug.permissions)
        api.permissions =
          merge.permissions(api.permissions, plug.permissions, name)

      plugins.push(plug)
      init(api, plug, opts)
      return api
    }
  }

  api = flumeFill(api)
  return api
}
