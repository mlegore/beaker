import path from 'path'
import fs from 'fs'
import {app} from 'electron'
import atob from 'atob'
import base32 from 'base32'
import AdmZip from 'adm-zip'

var archiveStoragePath = path.join(app.getPath('userData'), 'ssb-archives')

if (!fs.existsSync(archiveStoragePath)) {
  fs.mkdirSync(archiveStoragePath);
}

export function hashArchiveExists (hash) {
  return fs.existsSync(getHashPath(hash))
}

export function getFromArchive (hash, filePath, cb) {
  if (filePath === '')
    filePath = "index.html"

  var parent = getHashPath(hash)
  var file = path.join(parent, filePath)

  // Ensure the user is not able to explore outside the archive directory
  if (!isChild(parent, file)) {
    var error = new Error('File not found')
    error.code = "ENOENT"
    cb(error)
  }
  else {
    fs.readFile(file, cb)
  }
}

export function unzipArchive (hash, buf) {
  var zip = new AdmZip(buf);
  zip.extractAllTo(getHashPath(hash), true)
}

// Base32 encoding is file path safe, we'll use that to encode the hash
function getHashPath(hash) {
  return path.join(archiveStoragePath, base32.encode(atob(hash)))
}

function isChild (parent, dir) {
  var relative = path.relative(parent, dir)
  return !!relative && !relative.startsWith('..') && !path.isAbsolute(relative)
}
