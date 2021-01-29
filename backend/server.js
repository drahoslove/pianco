const { type } = require('os')
const WebSocket = require('ws')

const CMD_NOTE_ON = 1
const fromCmd = (cmd) => (cmd>>4) & 7

const ROOT_USR = 0
const ROOT_GRP = 0

const PORT = process.env.PORT || 11088
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

const groups = Array.from({ length: 256 }).map(() => new Set())

const broadcast = (data) => { // to everyone
  const [gid, uid] = data
  wss.clients.forEach(client => {
    if (client.gid == gid && client.readyState === WebSocket.OPEN) {
      client.send(new Uint8Array(data))
    }
  })
}
const echo = (data) => { // to eveyone except origin
  const [gid, uid] = data
  wss.clients.forEach(client => {
    if (client.gid == gid && client.uid !== uid && client.readyState === WebSocket.OPEN) {
      client.send(data)
    }
  })
}

const status = () => { // broadcast state of the world to everyone
  const data = JSON.stringify({
    groups: groups.map(uids => [...uids]),
    // TODO additional data in the future
  })
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(`status ${data}`)
    }
  })
}

wss.broadcast = broadcast
wss.echo = echo
wss.status = status
wss.groups = groups

groups[ROOT_GRP].add(ROOT_USR) // add ghost player to main room permanently


// return uid which is not yet in the group
const genUid = (gid) => {
  let uid
  do {
    uid = Math.floor(Math.random()*255) // 0-254 - 255 is ghost
  } while (uid === ROOT_USR || groups[gid].has(uid))
  return uid
}
const Autoplay = require('./autoplay.js')(wss)
const autoplayers = groups.map((_, gid) => new Autoplay(gid, ROOT_USR)) // init autoplaye for each group

wss.on('connection', async function connection(ws) {
  console.log('client connected')
  ws.send('connected')
  ws.on('message', function incoming(message) {
    if (message instanceof Buffer) {
      echo(message) // <--- this is the most important
      // ghost:
      const isDirectApi = ws.gid === undefined
      if (ws.gid === ROOT_GRP || isDirectApi) { // gopiano should trigger this also
        const [gid, uid, cmd] = new Uint8Array(message)
        if (fromCmd(cmd) === CMD_NOTE_ON) { // note on
          autoplayers[ROOT_GRP].resetGhost({
            delay: 120,
            stopCurrent: true,
            pretendScared: !isDirectApi,
          })
        }
      }
    } 
    if (typeof message === "string") {
      const [cmd, ...values] = message.split(' ')
      if (cmd === 'ping') {
        ws.send('pong')
      }
      if (cmd === "regroup") {
        const [oldGid, oldUid, newGid] = values.map(Number)
        if (groups[newGid].size === 255) {
          ws.send(`regroup ${oldGid} ${oldUid}`)
          wss.status()
          return
        }
        if (oldUid !== 0) {
          autoplayers[oldGid].stop(oldUid)
          groups[oldGid] && groups[oldGid].delete(oldUid)
        }
        const newUid = genUid(newGid)
        groups[newGid].add(newUid)
        ws.send(`regroup ${newGid} ${newUid}`)
        ws.gid = newGid
        ws.uid = newUid
        console.log(`${oldUid}@${oldGid} => ${newUid}@${newGid}`)
        wss.status()
        if (ws.gid === 0) {
          autoplayers[ws.gid].resetGhost({
            delay: 60,
            stopCurrent: false,
          })
        }
      }
      if (cmd === 'autoplay') {
        const [gid, uid] = values.map(Number)
        const url= values[2]
        autoplayers[gid].requestHandler(ws)(url)
      }
      if (cmd === 'playrandomfile') {
        const [gid, uid] = values.map(Number)
        autoplayers[gid].playRandomFile(uid)
      }
      if (cmd === 'playrandomnotes') {
        const [gid, uid, count] = values.map(Number)
        autoplayers[gid].playRandomNotes(uid, count)
      }
      if (cmd === 'stopplay') {
        const [gid, uid] = values.map(Number)
        autoplayers[gid].stop(uid)
      }
      // console.log(cmd, values)
    }
  })

  ws.on('close', () => {
    const { gid, uid } = ws
    if (gid !== undefined && uid !== undefined) {
      autoplayers[gid].stop(uid)
      groups[gid].delete(uid)
      console.log(`${uid}@${gid} => close`)
      wss.status()
    }
  })
})

console.log('listening on port', PORT)

