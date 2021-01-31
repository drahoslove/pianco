const { CLIENT_RENEG_LIMIT } = require('tls')
const WebSocket = require('ws')
const { randomString, rand } = require('./rand.js')

const CMD_NOTE_ON = 1
const fromCmd = (cmd) => (cmd>>4) & 7

const ROOT_SECRET = '0000000000000000'
const ROOT_USR = 0
const ROOT_GRP = 0

const PORT = process.env.PORT || 11088

const wss = new WebSocket.Server({ port: PORT })

const groups = Array.from({ length: 256 }).map(() => new Set())
const identities = {}

const broadcast = (data) => { // to everyone
  const [gid, uid] = data
  wss.clients.forEach(client => {
    const { gid: clientGid } = identities[client.secret] || {}
    if (clientGid === gid && client.readyState === WebSocket.OPEN) {
      client.send(new Uint8Array(data))
    }
  })
}
const echo = (data) => { // to eveyone except origin
  const [gid, uid] = data
  wss.clients.forEach(client => {
    const { gid: clientGid, uid: clientUid } = identities[client.secret] || {}
    if (clientGid === gid && clientUid !== uid && client.readyState === WebSocket.OPEN) {
      client.send(data)
    }
  })
}

const status = () => { // broadcast state of the world to everyone
  const data = JSON.stringify({
    groups: groups.map(uids => [...uids]),
    names: groups.map((_, group) => // [0: {0: 'draho'}, 3: {}]
      Object.values(identities)
      .filter(({ gid }) => gid === group)
      .reduce((map, {uid, name}) => ({...map, [uid]: name}), {})
    ),
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
identities[ROOT_SECRET] = { name: 'draho', gid: 0, uid: 0 }


// return uid which is not yet in the group
const genUid = (gid) => {
  let uid
  do {
    uid = rand(255) // 0-254 - 255 is ghost
  } while (uid === ROOT_USR || groups[gid].has(uid))
  return uid
}
const Autoplay = require('./autoplay.js')(wss)
const autoplayers = groups.map((_, gid) => new Autoplay(gid, ROOT_USR)) // init autoplaye for each group

wss.on('connection', async function connection(ws) {
  console.log('client connected')
  ws.isAlive = true
  ws.send('connected')
  ws.on('message', function incoming(message) {
    if (message instanceof Buffer) {
      echo(message) // <--- this is the most important
      // ghost:
      const isDirectApi = ws.secret === undefined

      if ((ws.secret in identities && identities[ws.secret].gid === 0) || isDirectApi) { // gopiano should trigger this also
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

        const [boldGid, boldUid , newGid] = values.map(Number)

        let [secret, name] = values.slice(3)

        const { uid: oldUid, gid: oldGid} = identities[secret] || { uid: boldUid, gid: boldGid }

        // remove old values
        if (oldUid) {
          autoplayers[oldGid].stop(oldUid)
          groups[oldGid] && groups[oldGid].delete(oldUid)
        }
        // prepare new values:
        let { uid: newUid } = identities[secret] || {} // possibly unchanged
        if (oldGid !== newGid) { // only change uid when changing gid
          if (groups[newGid].size === 255) {
            ws.send(`group full ${newGid} ${newUid}`)
            wss.status()
            return
          }
          newUid = genUid(newGid)
        }
        if (!secret) {
          if (ws.secret) {
            return console.error('cant change secret of ws')
          }
          secret = randomString(16)
        }
        if (!name) {
          name = `anon${rand(255)+1}`
        }
        // set new values
        groups[newGid].add(newUid)
        identities[secret] = { name, gid: newGid, uid: newUid }

        // update sockets
        ws.secret = secret
        wss.clients
        .forEach(ws => {
          const { uid, gid } = identities[secret]
          // send response to all ws from device
          if (ws.secret === secret && ws.readyState === WebSocket.OPEN) {
            ws.send(`regroup ${newGid} ${newUid} ${secret} ${name}`)
            console.log(`${secret}:${name} - ${uid}@${gid} => ${newUid}@${newGid}`)
          }
        })
        wss.status()
        if (newGid === 0) {
          autoplayers[newGid].resetGhost({
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

const healthInterval = setInterval(() => {
  wss.clients.forEach(ws => {
    if (ws.secret === undefined) { // ignore health of gopiano connection
      return 
    }
    if (ws.isAlive === false) {
      ws.terminate()
      return
    }
    ws.isAlive = false
    ws.ping()
    ws.once('pong', () => {
      ws.isAlive = true
    })
  })
}, 30000)

wss.on('close', () => {
  clearInterval(healthInterval)
})

console.log('listening on port', PORT)

