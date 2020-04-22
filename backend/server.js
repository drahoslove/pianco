const WebSocket = require('ws')

const PORT = 11088
const { SSL_KEY, SSL_CA, SSL_CERT } = process.env

let server
if (!SSL_KEY || !SSL_CA || !SSL_CERT) { // http
	server = require('http').createServer().listen(PORT, '0.0.0.0')
} else { // https
  console.log("using certificate", SSL_KEY)
	let fs = require('fs')
	server = require('https').createServer({
		key: fs.readFileSync(SSL_KEY),
		cert: fs.readFileSync(SSL_CERT),
		ca: fs.readFileSync(SSL_CA),
	}).listen(PORT)
}

const wss = new WebSocket.Server({ server })

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

console.log('listening on port', PORT)