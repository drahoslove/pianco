const WebSocket = require('ws')

const ROOT_USR = 0
const ROOT_GRP = 0

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

const broadcast = (data) => {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(new Uint8Array(data))
    }
  })
}

const echo = (data, sender) => {
  wss.clients.forEach(client => {
    if (client !== sender && client.readyState === WebSocket.OPEN) {
      client.send(data)
    }
  })
}

wss.broadcast = broadcast
wss.echo = echo

const Autoplay = require('./autoplay.js')(wss)
const autoplayer = new Autoplay(ROOT_GRP, ROOT_USR)

wss.on('connection', function connection(ws) {
  ws.on('message', autoplayer.requestHandler(ws))
  ws.on('message', function incoming(message) {
    if (typeof message === "string") {
      if (message === 'ping') {
        ws.send('pong')
      }
    } else {
      echo(message, ws)
    }
  })
  console.log('client connected')
  ws.send('connected')
})

console.log('listening on port', PORT)

