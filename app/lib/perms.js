/* globals beaker */

import prettyHash from 'pretty-hash'
import frameworks from '../frameworks/index.js'
import { getFrameworkPerm } from './strings'

// front-end only:
var yo
if (typeof document !== 'undefined') {
  yo = require('yo-yo')
}

// HACK
// this is the best way I could figure out for pulling in the dat title, given the current perms flow
// not ideal but it works
// (note the in memory caching)
// -prf
var datTitleMap = {}
function lazyDatTitleElement (archiveKey, title) {
  // if we have the title, render now
  if (title) return title
  if (archiveKey in datTitleMap) return datTitleMap[archiveKey] // pull from cache

  // no title, we need to look it up. render now, then update
  var el = yo`<span>${prettyHash(archiveKey)}</span>`
  el.id = 'lazy-' + archiveKey
  beaker.archives.get(archiveKey).then(details => {
    datTitleMap[archiveKey] = details.title // cache
    el.textContent = details.title // render
  })
  return el
}

var staticPerms = {
  js: {
    desc: 'Run Javascript',
    icon: 'code',
    persist: true,
    alwaysDisallow: false,
    requiresRefresh: true
  },
  network: {
    desc: param => {
      if (param === '*') return 'access the network freely'
      return 'contact ' + param
    },
    icon: 'cloud',
    persist: true,
    alwaysDisallow: false,
    requiresRefresh: true
  },
  createDat: {
    desc: (param, pages, opts = {}) => {
      if (opts.title) return `create a new Dat archive, "${opts.title}"`
      return 'create a new Dat archive'
    },
    icon: 'folder',
    persist: false,
    alwaysDisallow: false,
    requiresRefresh: false
  },
  modifyDat: {
    desc: (param, pages, opts = {}) => {
      const firstWord = opts.capitalize ? 'Write' : 'write'
      const title = lazyDatTitleElement(param, opts.title)
      const viewArchive = () => pages.setActive(pages.create('beaker://library/' + param))
      return yo`<span>${firstWord} files to <a onclick=${viewArchive}>${title}</a></span>`
    },
    icon: 'folder',
    persist: true,
    alwaysDisallow: false,
    requiresRefresh: false
  },
  deleteDat: {
    desc: (param, pages, opts = {}) => {
      const firstWord = opts.capitalize ? 'Delete' : 'delete'
      const title = lazyDatTitleElement(param, opts.title)
      const viewArchive = () => pages.setActive(pages.create('beaker://library/' + param))
      return yo`<span>${firstWord} the archive <a onclick=${viewArchive}>${title}</a></span>`
    },
    icon: 'folder',
    persist: false,
    alwaysDisallow: false,
    requiresRefresh: false
  },
  media: {
    desc: 'use your camera and microphone',
    icon: 'mic',
    persist: true,
    alwaysDisallow: false,
    requiresRefresh: false
  },
  geolocation: {
    desc: 'know your location',
    icon: '',
    persist: false,
    alwaysDisallow: true, // NOTE geolocation is disabled, right now
    requiresRefresh: false
  },
  notifications: {
    desc: 'create desktop notifications',
    icon: 'comment',
    persist: true,
    alwaysDisallow: false,
    requiresRefresh: false
  },
  midiSysex: {
    desc: 'access your MIDI devices',
    icon: 'sound',
    persist: false,
    alwaysDisallow: false,
    requiresRefresh: false
  },
  pointerLock: {
    desc: 'lock your cursor',
    icon: 'mouse',
    persist: false,
    alwaysDisallow: false,
    requiresRefresh: false
  },
  fullscreen: {
    desc: 'go fullscreen',
    icon: 'resize-full',
    persist: true,
    alwaysAllow: true,
    requiresRefresh: false
  },
  openExternal: {
    desc: 'open this URL in another program: ',
    icon: '',
    persist: false,
    alwaysDisallow: false,
    requiresRefresh: false
  }
}

function getRootFrameworkPermission (frameworkName) {
  return {
    desc: 'URL requests framework access to ' + frameworkName,
    icon: '',
    persist: true,
    alwaysDisallow: false,
    requiresRefresh: false
  }
}


var frameworkPerms = {}
for (var frameworkName in frameworks.frameworks) {
  if (!frameworks.frameworks.hasOwnProperty(frameworkName)) continue;
  var frameworkPermissions = frameworks.frameworks[frameworkName].permissions
  frameworkPerms[getFrameworkPerm(frameworkName)] = getRootFrameworkPermission(frameworkName)

  if(frameworkPermissions) {
    for(var permissionKey in frameworkPermissions) {
      if (!frameworkPermissions.hasOwnProperty(permissionKey)) continue;
      frameworkPerms[getFrameworkPerm(frameworkName, permissionKey)] = frameworkPermissions[permissionKey]
    }
  }
}

export default Object.assign(staticPerms, frameworkPerms)
