const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 11088 })
 
wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(message) {
    wss.clients.forEach(client => {
      if (ws !== client && client.readyState  === WebSocket.OPEN) { // echo to others
        client.send(message)
      }
    })
  })
  console.log('client connected')
  ws.send('connected')
})
