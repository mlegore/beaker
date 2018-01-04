import {app} from 'electron'
import ipc from 'node-ipc'
import {open} from './open-url'
const clientId = "petribrowser-client"
const serverId = "petribrowser-server"

export default function (url, cb) {
  ipc.config.retry = 500;
  ipc.config.id = clientId
  ipc.config.maxRetries = 1
  var connected = false
  var spawned = false

  ipc.connectTo(serverId, () => {
    ipc.of[serverId].on('connect', () => {
      connected = true
      if (url) {
        console.log('Petribrowser already open, sending url to other process...')
        ipc.of[serverId].emit('message', url)
      } else {
        console.log('Petribrowser already open, closing...')
      }

      ipc.disconnect(serverId)
      if(!spawned) {
        app.quit()
      }
    })

    ipc.of[serverId].on('disconnect', () => {
      if (!connected && !spawned) {
        spawned = true
        console.log('No other process instances responded, listening')
        if(url) {
          open(url)
        }
        ipc.disconnect(serverId)
        cb()
        serve()
      }
    })
  })
}

function serve() {
  ipc.config.id = serverId
  ipc.serve(() => {
    ipc.server.on('message', (data, socket) => {
      console.log('Received link from another process: ' + data);
      open(data)
    })
  })

  ipc.server.start();
  app.on('quit', () => ipc.server.stop())
}
