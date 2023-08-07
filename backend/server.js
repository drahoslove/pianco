const WebSocket = require('ws')
const jwt = require('jsonwebtoken')
const { rand } = require('./rand.js')

const SERVER_KEY = process.env.SERVER_KEY || 'secret-server-key'
const REMOTE_KEY = process.env.REMOTE_KEY || 'secret-remote-key'

const CMD_NOTE_OFF = 0
const CMD_NOTE_ON = 1
const fromCmd = (cmd) => (cmd>>4) & 7
const toVal = (x) => Math.round(x*127)

const ROOT_SECRET = '0000000000000000'
const ROOT_USR = 0
const ROOT_GRP = 0
const HASH_BASE = 32 // 'hash' means url hash
const HASH_SIZE = 8
const MAX_HASHABLE_GID = HASH_BASE**HASH_SIZE - 1
const FIRST_EXTERNAL_GID = MAX_HASHABLE_GID + 1
const OFFLINE_GID = -1

const PORT = process.env.PORT || 11088

const wss = new WebSocket.Server({ port: PORT })

const groups = {}
const identities = {} // {[secret]: { name: 'pianco', gid: 0, uid: 0 }}
const recorders = {}
const autoplayers = {}


const verify = (secret, key) => { // return null or identity from secret
  try {
    const verified = jwt.verify(secret, key)
    const n = key === SERVER_KEY ? 1000 : 1 // keys issues remotely has iat in ms instead of s
    // const hour = n * 60 * 60 // server time is offset by 1 h, for some reason
    const iat = verified.iat * n
    const deadline = (Date.now() - (1000 * 60 * 15)) // older than 15min
    const isTooOld = iat < deadline
    if (isTooOld) {
      console.log('tooOld', iat, deadline, iat - deadline)
      return null
    }
    return verified
  } catch(e) {
    return null
  } 
}

const send = (gid, uid, message) => { // to specific identity
  wss.clients.forEach(client => {
    const { gid: clientGid, uid: clientUid } = identities[client.secret] || {}
    if (clientGid === gid && clientUid === uid && client.readyState === WebSocket.OPEN) {
      client.send(message)
    }
  })
}

const broadcast = (gid, data) => { // to everyone in group
  wss.clients.forEach(client => {
    const { gid: clientGid } = identities[client.secret] || {}
    if (clientGid === gid && client.readyState === WebSocket.OPEN) {
      client.send(new Uint8Array(data)) // gid is being truncated here
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

const echo = (gid, uid, data) => { // to eveyone in group except origin
  wss.clients.forEach(client => {
    const { gid: clientGid, uid: clientUid } = identities[client.secret] || {}
    if (clientGid === gid && clientUid !== uid && client.readyState === WebSocket.OPEN) {
      client.send(data)
    }
  })
}

const status = () => {
  let tempGroups = {}
  let tempMods = {}
  let tempMics = {}
  let tempNames = {}
  let tempAvatars = {}
  for (const [g, uids] of Object.entries(groups)) {
    tempGroups = { ...tempGroups, ...(uids.size > 0 && { [g]: [...uids] }) }
    tempMods = {
      ...tempMods,
      ...(uids.size > 0 && {
        [g]: Object.values(identities)
          .filter(({ gid, mod }) => gid === +g && mod)
          .map(({ uid }) => uid),
      }),
    }
    tempMics = {
      ...tempMics,
      ...(uids.size > 0 && {
        [g]: Object.values(identities)
          .filter(({ gid, hasMic }) => gid === +g && hasMic)
          .map(({ uid }) => uid),
      }),
    }
    tempNames = {
      ...tempNames,
      ...(uids.size > 0 && {
        [g]: Object.values(identities)
          .filter(({ gid }) => gid === +g)
          .reduce((map, { uid, name }) => ({ ...map, [uid]: name }), {}),
      }),
    }
    tempAvatars = {
      ...tempAvatars,
      ...(uids.size > 0 && {
        [g]: Object.values(identities)
          .filter(({ gid, avatar }) => gid === +g && avatar)
          .reduce((map, { uid, avatar }) => ({ ...map, [uid]: avatar }), {}),
      }),
    }
  }
  // broadcast state of the world to everyone
  const data = JSON.stringify({
    groups: tempGroups,
    mods: tempMods,
    mics: tempMics,
    names: tempNames,
    avatars: tempAvatars,
  })
  console.log('identities', identities)
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

groups[`${ROOT_GRP}`] = new Set().add(ROOT_USR)
identities[ROOT_SECRET] = { name: 'Pianco', gid: ROOT_GRP, uid: ROOT_USR }


const Autoplay = require('./autoplay.js')(wss)
autoplayers[`${ROOT_GRP}`] = new Autoplay(ROOT_GRP, ROOT_USR) // init autoplayer for each group

const Recorder = require('./recorder.js')(wss)
recorders[`${ROOT_GRP}`] = new Recorder(ROOT_GRP) // init recorder for each group

// return uid which is not yet in the group
const genUid = (gid) => {
  if (!groups[`${gid}`]) {
    return rand(255)
  } else {
    if (groups[`${gid}`].size >= 255) {
      return null
    }
    let uid
    do {
      uid = rand(255) // 0-254 - 255 is ghost
    } while (uid === ROOT_USR || groups[`${gid}`].has(uid))
    return uid
  }
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
      uid = ROOT_USR
    }

    if (message instanceof Buffer) {
      const mic = Object.values(identities)
        .find(iden => iden.gid === gid && iden.hasMic)
      if (mic && mic.uid !== uid) { // do not propagate if someone not you has mic
        return
      }

      recorders[`${gid}`].pass(message) // pass message to recorder
      echo(gid, uid, message) // <--- this is the most important

      // interrupt ghost:
      const [_, __, cmd] = new Uint8Array(message)
      if (gid === ROOT_GRP) { // gopiano also triggesr this
        if (fromCmd(cmd) === CMD_NOTE_ON) {
          // note on
          autoplayers[`${ROOT_GRP}`].resetGhost({
            delay: 120,
            stopCurrent: true,
            pretendScared: !isDirectApi,
          })
        }
      }
      if (ws.secret in identities) {
        if (fromCmd(cmd) === CMD_NOTE_ON) {
          identities[ws.secret].lastNoteOnTime = Date.now()
        }
        if (fromCmd(cmd) === CMD_NOTE_OFF) {
          identities[ws.secret].lastNoteOnTime = undefined
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

      if (cmd === 'givemic') {
        const { secret } = ws
        const iden = identities[secret]
        const [gid, uid, toUid] = values.map(Number)
        if (!iden || iden.gid !== gid || !iden.mod) {
          // only mod in current group can give mic
          return
        }
        Object.values(identities).forEach(iden => {
          if (iden.gid === gid) {
            iden.hasMic = iden.uid === toUid && !iden.hasMic
          }
        })
        wss.status()
      }

      if (cmd === 'dropmic') {
        const { secret } = ws
        const iden = identities[secret]
        const [gid, uid] = values.map(Number)
        if (!iden || iden.gid !== gid || !iden.hasMic) {
          // only mic owner in current group can drop mic
          return
        }
        iden.hasMic = false
        wss.status()
      }

      if (cmd === "regroup") {
        const [gid, uid, newGid] = values.map(Number)
        let [secret, name] = values.slice(3) // optional
        const { uid: oldUid, gid: oldGid } = identities[secret] ||
          { uid: undefined, gid: undefined } // after reset, or for new users - to force gen of new uid
        let newUid = oldUid // possibly unchanged

        // wipe user activity in group
        if (oldUid && oldGid >= 0) {
          autoplayers[`${oldGid}`].stop(oldUid)
          recorders[`${oldGid}`].stop(oldUid)
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
        let remoteIdentity = verify(secret, REMOTE_KEY)
        let serverIdentity = verify(secret, SERVER_KEY)


        const nameExistsInGroup = Object.entries(identities).some(([key, iden]) => (
          iden.name === name && iden.gid === newGid && key !== secret
        ))
        if (!name || nameExistsInGroup) { // assign default anon name derived from uid
          name = `anon${newUid}` // might be overwritten by remoteIdentity.name
        }

        const identity = {
          ...serverIdentity,
          name,
          ...remoteIdentity,
          gid: newGid,
          uid: newUid,
        }
        if (!remoteIdentity && !serverIdentity) {
          console.error('no or invalid secret', secret)// invalid secret
          if (ws.secret) {
            ws.terminate()
            return console.error('cant change secret of ws.secret')
          }
          if (gid >= FIRST_EXTERNAL_GID) {
            // remote room must be accesed by remote signed secret only
            ws.terminate()
            return
          }
          secret = jwt.sign(identity, SERVER_KEY)
        }

        // update stored values
        // groups[oldGid]?.delete(oldUid)
        groups[`${oldGid}`]?.delete(oldUid)
        if (groups[`${oldGid}`] && !groups[`${oldGid}`].size) {
          delete groups[`${oldGid}`]
          delete recorders[`${oldGid}`]
          delete autoplayers[`${oldGid}`]
        }
        if (newGid >= 0) {
          // groups[newGid].add(newUid)
          if (groups[`${newGid}`]) {
            groups[`${newGid}`].add(newUid)
          } else {
            groups[`${newGid}`] = new Set().add(newUid)
            recorders[`${newGid}`] = new Recorder(newGid)
            autoplayers[`${newGid}`] = new Autoplay(newGid, ROOT_USR)
          }
        }
        // remove deprecated identity
        Object.entries(identities).forEach(([key, iden]) => {
          if (iden.gid === oldGid && iden.uid === oldUid) {
            delete identities[key]
          }
          // update secret of existing clients of the same remote user
          if (iden.name === identity.name && key !== secret && remoteIdentity && verify(key, REMOTE_KEY)) { // new secret - remove old one
            wss.clients
              .forEach(cws => {
                if (cws.secret === key) {
                  cws.secret = secret
                }
              })
            const oldIdent = identities[key]
            groups[`${oldIdent?.gid}`]?.delete(oldIdent.uid)
            delete identities[key]
          }
        })
        identities[secret] = identity

        // inform clients of secret
        // update sockets
        ws.secret = secret
        wss.clients.forEach(cws => {
          const { uid, gid } = identities[secret]
          // send response to all ws from device
          if (cws.secret === secret && cws.readyState === WebSocket.OPEN) {
            cws.send(`regroup ${newGid} ${newUid} ${secret} ${identity.name}`)
            console.log(`${secret.substr(-4)}:${identity.name} - ${uid}@${gid} => ${newUid}@${newGid}`)
          }
        })
        wss.status()

        // reset ghost player timer
        if (newGid === 0) {
          autoplayers[`${newGid}`].resetGhost({
            delay: 60,
            stopCurrent: false,
          })
        }
      } // end regroup

      const recorder = recorders[`${gid}`]

      if (gid !== OFFLINE_GID) {
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
          autoplayers[`${gid}`].requestHandler(ws)(url, uid)
        }
        if (cmd === 'playrandomfile') {
          const [gid, uid] = values.map(Number)
          autoplayers[`${gid}`].playRandomFile(uid)
        }
        if (cmd === 'playrandomnotes') {
          const [gid, uid, count] = values.map(Number)
          autoplayers[`${gid}`].playRandomNotes(uid, count)
        }
        if (cmd === 'stopplay') {
          const [gid, uid] = values.map(Number)
          autoplayers[`${gid}`].stop(uid)
        }
      }

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
      if (gid >= 0) {
        autoplayers[`${gid}`].stop(uid)
        recorders[`${gid}`].stop(uid)
        groups[`${gid}`].delete(uid)
      }
      if (ws.secret in identities) {
        identities[ws.secret].uid = undefined
        identities[ws.secret].gid = undefined
        identities[ws.secret].hasMic = false
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
      // console.log(`ws.secret`, ws.secret)
      ws.terminate()
      return
    }
    ws.isAlive = false
    ws.ping()
    ws.once('pong', () => {
      ws.isAlive = true
    })
    Object.values(identities).forEach((iden) => { // cleanup
      if (iden.lastNoteOnTime && iden.lastNoteOnTime < Date.now() - 1000 * 15) { // stucked for more than 12s
        console.log('cealing up', iden.gid, iden.uid, iden.lastNoteOnTime)
        for (let i=0; i<88; i++) { // unstuck all keys
          echo(
            iden.gid, iden.uid,
            new Uint8Array([iden.gid, iden.uid, toCmd(CMD_NOTE_OFF), toVal(i)])
          )
        }
      }
    })
  })
}, 15000)

wss.on('close', () => {
  clearInterval(healthInterval)
})

console.log('listening on port', PORT)

