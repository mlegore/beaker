import { webFrame } from 'electron'
import importWebAPIs from './lib/fg/import-web-apis' // TODO remove
import DatArchive from './lib/web-apis/dat-archive'
import beaker from './lib/web-apis/beaker'
import frameworkLoader from './lib/web-apis/framework-loader'
import { setup as setupLocationbar } from './webview-preload/locationbar'
import { setup as setupPrompt } from './webview-preload/prompt'
import setupRedirectHackfix from './webview-preload/redirect-hackfix'

// HACKS
setupRedirectHackfix()

// register protocol behaviors
/* This marks the scheme as:
 - Secure
 - Allowing Service Workers
 - Supporting Fetch API
 - CORS Enabled
*/
webFrame.registerURLSchemeAsPrivileged('dat', { bypassCSP: false })

// setup APIs
importWebAPIs()
if (['beaker:', 'dat:', 'https:'].includes(window.location.protocol) ||
    (window.location.protocol === 'http:' && window.location.hostname === 'localhost')) {
  window.DatArchive = DatArchive
}
if (window.location.protocol === 'beaker:') {
  window.beaker = beaker
}

if (window.location.protocol === 'ssb-alias:'
  && (!window.location.pathname || window.location.pathname === '/')
  && window.location.host.split('.').length === 2) {
  window.beaker = { ssb: beaker.ssb }
}

window.frameworkLoader = frameworkLoader
setupLocationbar()
setupPrompt()
