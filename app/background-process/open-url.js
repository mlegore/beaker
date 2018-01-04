// handle OSX open-url event
import { ipcMain } from 'electron'
import { URL } from 'url'

var queue = []
var commandReceiver

export function setup () {
  ipcMain.once('shell-window-ready', function (e) {
    commandReceiver = e.sender
    queue.forEach(url => commandReceiver.send('command', 'file:new-tab', url))
    queue.length = 0
  })
}

export function open (url) {
  if (url.startsWith('ssb:')) {
      var parsed = new URL(url)
      console.warn(parsed)
      var link = parsed.searchParams.get('link')
      
      if (!link) {
        return
      }

      url = 'ssb-blob://' + encodeURIComponent(link)
  }

  if (commandReceiver) {
    commandReceiver.send('command', 'file:new-tab', url)
  } else {
    queue.push(url)
  }
  return commandReceiver
}
