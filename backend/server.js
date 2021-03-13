const WebSocket = require('ws')
const { randomString, rand } = require('./rand.js')

const CMD_NOTE_ON = 1
const fromCmd = (cmd) => (cmd>>4) & 7

const ROOT_SECRET = '0000000000000000'
const ROOT_USR = 0
const ROOT_GRP = 0

const PORT = process.env.PORT || 11088

const wss = new WebSocket.Server({ port: PORT })

const groups = Array.from({ length: 255 }).map(() => new Set()) // 255 is offline 'room''
const identities = {} // {[secret]: { name: 'pianco', gid: 0, uid: 0 }}

const send = (gid, uid, message) => { // to specific identity
  wss.clients.forEach(client => {
    const { gid: clientGid, uid: clientUid } = identities[client.secret] || {}
    if (clientGid === gid && clientUid === uid && client.readyState === WebSocket.OPEN) {
      client.send(message)
    }
  })
}

const broadcast = (data) => { // to everyone in group
  const [gid, uid] = data
  wss.clients.forEach(client => {
    const { gid: clientGid } = identities[client.secret] || {}
    if (clientGid === gid && client.readyState === WebSocket.OPEN) {
      client.send(new Uint8Array(data))
    }
  })
}

const broadcastText = (gid, text) => {
  wss.clients.forEach(client => {
    const { gid: clientGid } = identities[client.secret] || {}
    if (clientGid === gid && client.readyState === WebSocket.OPEN) {
      client.send(text)
    }
  })
}

const echo = (data) => { // to eveyone in group except origin
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

wss.send = send
wss.broadcast = broadcast
wss.echo = echo
wss.status = status

groups[ROOT_GRP].add(ROOT_USR) // add ghost player to main room permanently
identities[ROOT_SECRET] = { name: 'pianco', gid: 0, uid: 0 }


const Autoplay = require('./autoplay.js')(wss)
const autoplayers = groups.map((_, gid) => new Autoplay(gid, ROOT_USR)) // init autoplaye for each group

const Recorder = require('./recorder.js')(wss)
const recorders = groups.map((_, gid) => new Recorder(gid)) // init recorder for each group

// return uid which is not yet in the group
const genUid = (gid) => {
  if (groups[gid].size >= 255) {
    return null
  }
  let uid
  do {
    uid = rand(255) // 0-254 - 255 is ghost
  } while (uid === ROOT_USR || groups[gid].has(uid))
  return uid
}


wss.on('connection', async function connection(ws) {
  console.log('client connected')
  ws.isAlive = true
  ws.send('connected')
  ws.on('message', function incoming(message) {
    // common vars
    let { uid, gid } = identities[ws.secret] || { uid: undefined, gid: undefined}
    const isDirectApi = ws.secret === undefined 
    if (isDirectApi) { // assume gid=0 for gopiano
      gid = ROOT_GRP
    }

    if (message instanceof Buffer) {
      if (message[0] !== 255 && message[0] !== -1) {
        echo(message) // <--- this is the most important
        recorders[gid].pass(message) // pass message to recorder
      }

      // interrupt ghost:
      if (gid === ROOT_GRP) { // gopiano also triggesr this
        const [_, __, cmd] = new Uint8Array(message)
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

      if (cmd === 'reaction') {
        const [gid, uid] = values.map(Number)
        broadcastText(gid, message)
      }

      if (cmd === "regroup") {
        const [_, __, newGid] = values.map(Number)
        let [secret, name] = values.slice(3) // optional
        const { uid: oldUid, gid: oldGid } = identities[secret] ||
          { uid: undefined, gid: undefined } // after reset, or for new users - to force gen of new uid
        let newUid = oldUid // possibly unchanged

        // wipe user activity in group
        if (oldUid && oldGid >=0) {
          autoplayers[oldGid].stop(oldUid)
          recorders[oldGid].stop(oldUid)
        }
        // prepare new values:
        if (oldGid !== newGid || oldUid === undefined) { // only change uid when changing gid
          if (newGid >= 0) {
            newUid = genUid(newGid)
          } else {
            newUid = -1
          }
          if (newUid === null) {
            ws.send(`group full ${newGid} ${newUid}`)
            wss.status()
            return
          }
        }
        if (!secret) {
          if (ws.secret) {
            return console.error('cant change secret of wssecre')
          }
          secret = randomString(16)
        }
        if (!name) { // assign default random name
          name = `anon${newUid}`
        }
        // update stored values
        groups[oldGid] && groups[oldGid].delete(oldUid)
        if (newGid >= 0) {
          groups[newGid].add(newUid)
        }
        identities[secret] = { name, gid: newGid, uid: newUid }

        // update sockets
        ws.secret = secret
        // inform clients of secret
        wss.clients.forEach(ws => {
          const { uid, gid } = identities[secret]
          // send response to all ws from device
          if (ws.secret === secret && ws.readyState === WebSocket.OPEN) {
            ws.send(`regroup ${newGid} ${newUid} ${secret} ${name}`)
            console.log(`${secret}:${name} - ${uid}@${gid} => ${newUid}@${newGid}`)
          }
        })
        wss.status()

        // reset ghost player timer
        if (newGid === 0) {
          autoplayers[newGid].resetGhost({
            delay: 60,
            stopCurrent: false,
          })
        }
      }

      const recorder = recorders[gid]

      if (gid !== -1) {
        if (cmd === 'record') {
          recorder.record(uid)
        }
        if (cmd === 'stop') {
          recorder.stop(uid)
        }
        if (cmd === 'replay') {
          recorder.replay(uid)
        }
        if (cmd === 'pause') {
          recorder.pause(uid)
        }

        // debug only:
        if (cmd === 'autoplayurl') {
          const [gid, uid] = values.map(Number)
          const url = values[2]
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
      }

      // console.log(cmd, values)
    }
  })

  ws.on('close', () => {
    const { gid, uid } = identities[ws.secret] || {}
    let isLast = true
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN
        && client.secret === ws.secret
      ) {
        isLast = false
      }
    })
    if (isLast && gid !== undefined && uid !== undefined) {
      if (gid >=0) {
        autoplayers[gid].stop(uid)
        recorders[gid].stop(uid)
        groups[gid].delete(uid)
      }
      if (ws.secret in identities) {
        identities[ws.secret].uid = undefined
        identities[ws.secret].gid = undefined
      }
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
      console.log(`ws.secret`, ws.secret)
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

