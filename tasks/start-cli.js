#!/usr/bin/env node
const NODE_FLAGS = `--js-flags="--throw-deprecation"`

var childProcess = require('child_process')
var electron = require('electron')
var utils = require('./utils')

module.exports = function () {
  if (process.env.ELECTRON_PATH) {
    electron = process.env.ELECTRON_PATH
  }
  console.log('Spawning electron', electron)

  var args = [NODE_FLAGS]

  if(process.env.inspect) {
    if(process.env.inspect === 'break') {
      args.push('--inspect-brk')
    } else {
      args.push('--inspect')
    }
  }

  args.push('./app')
  if (utils.getEnvName() === 'development') {
    console.log('intercepting 8080')
    args.push('--intercept')
  }

  childProcess.spawn(electron, args, {
    stdio: 'inherit',
    env: process.env // inherit
  })
  .on('close', function () {
    // User closed the app. Kill the host process.
    process.exit()
  })
}

if (require.main === module) {
  module.exports()
}
