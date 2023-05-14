import {
  pressNote, releaseNote, releaseAll,
  pressSustain, releaseSustain,
  instrumentById,
  allOff,
} from './instrument.js'
import {
  fromCmd, toCmd, fromVal, toVal,
  CMD_NOTE_ON, CMD_NOTE_OFF, CMD_CONTROL_CHANGE,
  CC_SUTAIN,
  CHANNEL,
  chanFromCmd,
} from './midi.js'
import { getStorage } from './storage.js'
import { networkingApp } from './vue/networking.js'
import { recorderApp } from './vue/recorder.js'


Blob.prototype.arrayBuffer = Blob.prototype.arrayBuffer || function () {
  return new Response(this).arrayBuffer()
} // polyfill for safari


const isFramed = false

let lastJwt

const getJwtData = (jwt) => {
  try {
    return jwt
      ? JSON.parse(window.atob(jwt.split('.')[1]))
      : {}
  } catch (e) {
    return {}
  }
}

const isJwtNew = (jwt) => {
  const old = getJwtData(lastJwt)
  const newOne = getJwtData(jwt)
  return Object.entries(newOne)
    .filter(([key]) => (
      ['iat', 'name', 'mod', 'avatar'].includes(key) // ignore unknown fields
    ))
    .some(([key, val]) => {
      if (key === 'iat') {
        return val - (old[key] || 0) > 1000 * 60 * 15 // is older than 15 minutes
      }
      return val !== old[key]
    })
}

const onMessage = (event) => {
  if (getStorage().DEBUG) {
    console.log('globev', event)
  }
  if (!(event.data instanceof Object)) {
    return
  }
  if (event.data.test) {
    console.log('Test data received', event.data)
  }
  if (event.data.userJwt) {
    const secret = (event.data.userJwt || '').replace(/ /g, '')
    const name = ''
    if (isJwtNew(secret)) {
      lastJwt = secret
      send(`regroup ${GID} ${UID} ${GID} ${secret} ${name}`)
    }
  }
}

const requestUserData = async () => {
  if (!isFramed) {
    return {}
  }

  return new Promise((resolve) => {
    const timer = new AbortController()
    const { signal } = timer
    setTimeout(() => {
      timer.abort()
      resolve({})
      window.addEventListener('message', onMessage)
    }, 1000)
    const handleResponse = (event) => {
      if (getStorage().DEBUG) {
        console.log('locev', event)
      }
      if (!(event.data instanceof Object)) {
        return
      }
      resolve({ secret: event.data.userJwt.replace(/ /g, '') })
    }
    window.removeEventListener('message', onMessage)
    window.addEventListener('message', handleResponse, {
      once: true,
      signal,
    })
    window.parent.postMessage({ getUserJwt: true }, '*')
  })
}

const HASH_BASE = 32
const HASH_SIZE = 8
const MAX_HASHABLE_GID = HASH_BASE ** HASH_SIZE - 1
const FIRST_EXTERNAL_GID = MAX_HASHABLE_GID + 1
const DEF_GID = isFramed
  ? FIRST_EXTERNAL_GID // musn't be accesible from url in nonframed (noraml) mode
  : 0
const OFFLINE_GID = -1

export { MAX_HASHABLE_GID, OFFLINE_GID }

let UID = 0 // will be changed by backend
let GID = DEF_GID

// WS!
let ws

const BASE32_LETTERS = "abcdefghijkmnopqrstvwxyz23456789" // l u 0 1
const fromBase32 = str =>
  parseInt(String(str)
    .toLowerCase()
    .replace(/[0]/g, 'o')
    .replace(/[1l]/g, 'i')
    .replace(/[u]/g, 'v')
    .split('')
    .filter(c => BASE32_LETTERS.includes(c))
    .map(c => BASE32_LETTERS.indexOf(c).toString(HASH_BASE))
    .join(''),
    HASH_BASE)

export const toBase32 = (int) =>
  ((+int) % MAX_HASHABLE_GID)
    .toString(HASH_BASE)
    .padStart(HASH_SIZE, '0')
    .split('')
    .map(c => BASE32_LETTERS[parseInt(c, HASH_BASE)])
    .join('')

const gidFromHash = () => {
  const result =
    location.hash === '#-'
      ? OFFLINE_GID
      : fromBase32(location.hash.slice(1)) || DEF_GID
  if ( // normalize hash url
    result < MAX_HASHABLE_GID && result > 0 &&
    location.hash.slice(1) !== toBase32(result)) {
    window.history.replaceState(null, null, `#${toBase32(result)}`)
  }
  return result
}

export const rename = async (newName) => {
  if (isFramed) { // no self renaming in framed
    return
  }
  const { secret } = getStorage()
  if (newName) {
    send(`regroup ${GID} ${UID} ${GID} ${secret || ''} ${newName || ''}`)
  }
}

export const react = (symbol) => {
  send(`reaction ${GID} ${UID} ${symbol}`)
}

// ws message handlers

const onCmd = (cmdName, callback) => async ({ data: message }) => {
  if (typeof message !== 'string') {
    return
  }
  const [cmd, ...values] = message.split(' ')
  if (cmd === cmdName) {
    callback(values)
  }
}

const onReaction = onCmd('reaction', (values) => {
  const [gid, uid] = values.map(Number)
  const symbol = values[2]
  networkingApp.showReaction(gid, uid, symbol)
})

const onRegroup = onCmd('regroup', (values) => {
  const [newGid, newUid] = values.map(Number)
  if (isFramed && newGid !== GID) { // regroup forbidden in frame
    return
  }
  if (newGid !== GID && newGid > 141167095653375) {
    // no regroup of hidden groups
    return
  }
  const [secret, name] = values.slice(2)
  allOff() // to mute others from old group
  networkingApp.gid = GID = newGid
  networkingApp.uid = UID = newUid
  if (!isFramed) {
    if (secret) {
      getStorage().secret = secret
    }
    if (name) {
      getStorage().name = name
    }
  }
  // update url if group changed
  if (gidFromHash() !== newGid) {
    location.hash = newGid === OFFLINE_GID
      ? '-'
      : toBase32(newGid) || ''
  }
  recorderApp.reset()
  recorderApp.visible = newGid !== OFFLINE_GID // hide recorder in offline mode
  console.log(`${UID}@${GID} changed`)
})

const onUserStatus = onCmd('status', (values) => {
  const status = JSON.parse(values.join(' '))

  const removedUsers = (networkingApp.groups[GID] || [])
    .filter(uid => !status.groups[GID].includes(uid))
  networkingApp.groups = status.groups || {}
  networkingApp.names = status.names || {}
  networkingApp.avatars = status.avatars || {}
  networkingApp.mods = status.mods || {}
  networkingApp.mics = status.mics || {}

  removedUsers.forEach(uid => {
    releaseAll(uid)('cleanage')
    releaseSustain(uid, 'cleanage')
  })
})

const onRecorderStatus = ({ data: message }) => {
  if (typeof message !== 'string') {
    return
  }
  const [cmd, val] = message.split(' ')
  if (!['isRecording', 'isPlaying'].includes(cmd)) {
    return
  }
  const isTrue = val === 'true'
  const isFalse = val === 'false'
  if (!isTrue && !isFalse) {
    return
  }

  // set vue states
  if (cmd === 'isRecording') {
    recorderApp.isRecording = isTrue
  }
  if (cmd === 'isPlaying') {
    recorderApp.isPlaying = isTrue
  }
}

const onBlob = async ({ data }) => {
  if (!(data instanceof Blob)) {
    return
  }
  if (GID === OFFLINE_GID) { // ignore incoming notes in offline mode
    return
  }
  const [gidTopByte, uid, cmd, val1, val2] = new Uint8Array(await data.arrayBuffer())
  if (gidTopByte !== (GID & 0xFF)) { // another group
    return
  }
  if (uid === UID && chanFromCmd(cmd) === CHANNEL) { // your notes
    return
  }

  const isMuted = networkingApp.isMuted(uid)
  const note = Tone.Midi(val1).toNote()
  if (fromCmd(cmd) === CMD_NOTE_ON) {
    const velocity = fromVal(val2)
    pressNote(note, velocity, uid)(isMuted ? "mutedIO" : "IO")
  }
  if (fromCmd(cmd) === CMD_NOTE_OFF) {
    releaseNote(note, uid)(isMuted ? "mutedIO" : "IO")
  }
  if (fromCmd(cmd) === CMD_CONTROL_CHANGE) { // control command
    if (val1 === CC_SUTAIN) {
      const sustain = fromVal(val2)
      if (sustain >= 0.5) {
        pressSustain(uid, 'IO')
      } else {
        releaseSustain(uid, 'IO')
      }
    }
  }
}

window.addEventListener('hashchange', () => { // chagning group
  if (isFramed) { // no hash change in frame
    return
  }
  const newGid = gidFromHash()
  sendOffAll() // to mute self for others before leaving
  sendSustain(0) // to mute self for others before leaving
  allOff() // to mute others
  const { secret, name } = getStorage()
  send(`regroup ${GID} ${UID} ${newGid} ${secret || ''} ${name || ''}`)
  console.log(`${UID}@${GID} => ?@${newGid} request`)
})

const pingPong = () => {
  let now
  let pings = 0
  let pongs = 0
  let timeout = 0
  const ping = () => {
    if (pings !== pongs) {
      // networkingApp.isOnline = false
      ws.close()
      clearTimeout(timeout)
      return
    }
    now = performance.now()
    if (ws.readyState === WebSocket.OPEN) {
      ws.send('ping')
    }
    pings++
    timeout = setTimeout(ping, 5000 + Math.floor(Math.random() * 2000))
  }
  ws.addEventListener('message', ({ data }) => {
    if (data === 'pong') {
      pongs++
      if (getStorage().DEBUG) {
        console.log('ping', Math.floor((performance.now() - now) * 100) / 100, 'ms')
      }
    }
  })
  ping()
}

const connect = () => {
  console.log('connecting')
  try {
    ws = new WebSocket(
      location.hostname === 'pianco.deskntea.com'
        ? 'wss://ws.deskntea.com'
        : `ws://${location.hostname}:11088`
    )
    // handle regroup
    ws.addEventListener('message', onRegroup)
    // hanlde incomming notes
    ws.addEventListener('message', onBlob)
    // handle status
    ws.addEventListener('message', onUserStatus)
    // handle recorder status
    ws.addEventListener('message', onRecorderStatus)
    // handle reaction
    ws.addEventListener('message', onReaction)

    ws.onopen = async () => {
      const newGid = gidFromHash()
      let { secret, name } = isFramed
        ? await requestUserData()
        : getStorage()
      send(`regroup ${GID} ${UID} ${newGid} ${secret || ''} ${name || ''}`)
      networkingApp.isOnline = true
      networkingApp.gid = newGid
      console.log('ws open')
      pingPong()
    }
    ws.onerror = (err) => {
      console.log('ws error', err)
    }
    ws.onclose = () => {
      console.log('ws close')
      networkingApp.isOnline = false
      networkingApp.gid = OFFLINE_GID
      // unpress keys of all users in group
      const leavingUsers = (networkingApp.groups[GID] || [])
        .filter(uid => uid !== UID)
      leavingUsers.forEach(uid => {
        releaseAll(uid)('cleanage')
        releaseSustain(uid, 'cleanage')
      })
      networkingApp.groups = []
      networkingApp.names = {}
      networkingApp.avatars = {}
      setTimeout(connect, 3000)
    }

  } catch (e) {
    console.error(e)
  }
}

connect()

const queuedMessages = []

const send = (data) => {
  if (ws.readyState !== WebSocket.OPEN) {
    queuedMessages.push(data)
    return
  }
  while (queuedMessages.length > 0) {
    ws.send(queuedMessages.shift())
  }
  if (data) {
    ws.send(data)
  }
}

const sendNoteOn = (note, velocity = 0.5) => (source) => {
  pressNote(note, velocity, UID)(source)
  if (networkingApp.isMuted(UID) || GID === OFFLINE_GID) {
    return
  }
  const midiNote = Tone.Midi(note).toMidi()
  send(new Uint8Array([GID, UID, toCmd(1), midiNote, toVal(velocity)]))
}

const sendNoteOff = (note) => (source) => {
  releaseNote(note, UID)(source)
  if (networkingApp.isMuted(UID) || GID === OFFLINE_GID) {
    return
  }
  const midiNote = Tone.Midi(note).toMidi()
  send(new Uint8Array([GID, UID, toCmd(0), midiNote, toVal(0)]))
}

const sendSustain = (value, source) => {
  if (value >= 0.5) {
    pressSustain(UID, source)
  } else {
    releaseSustain(UID, source)
  }
  if (GID === OFFLINE_GID) {
    return
  }
  send(new Uint8Array([GID, UID, toCmd(3), CC_SUTAIN, toVal(value)]))
}

const sendOffAll = () => (source) => {
  releaseAll(UID)(source).forEach((note) => sendNoteOff(note)(source))
  sendSustain(0, source)
}

const giveMic = (toUid) => {
  send(`givemic ${GID} ${UID} ${toUid}`)
}
const dropMic = () => {
  send(`dropmic ${GID} ${UID}`)
}

const recorder = ['record', 'stop', 'replay', 'pause'].reduce((recorder, action) => ({
  ...recorder,
  [action]: () => {
    ws.send(action)
  },
}), {})

window.recorder = recorder

export {
  recorder,
  sendNoteOn,
  sendNoteOff,
  sendOffAll,
  sendSustain,
  giveMic,
  dropMic,
}


// hidden features
// debug only:

window.autoplay = (url) => {
  if (url.startsWith('/')) {
    url = location.origin + url
  }
  ws.send(`autoplayurl ${GID} ${UID} ${url}`)
  console.log('will play', url, 'soon')
  const selectOptions = ({ data: msg }) => {
    if (typeof msg !== 'string') {
      return
    }
    const [cmd, data] = msg.split(' ')
    if (cmd === 'auto?instrument') {
      let question = "Select intruments:\n"
      const preselection = []
      question += data.split(';').map((str, i) => {
        const [id, notes] = str.split(':')
        if (i < 3) {
          preselection.push(i + 1)
        }
        return `${i + 1}: ${instrumentById[id]} - ${notes} notes`
      }).join('\n')
      const selection = prompt(question, preselection).split(',').map(i => i - 1).join(',')
      ws.removeEventListener('message', selectOptions)
      ws.send(`auto! ${url};${selection}`)
    }
  }
  ws.addEventListener('message', selectOptions)
}
window.randomfile = () => {
  ws.send(`playrandomfile ${GID} ${UID}`)
}
window.randomnotes = (count = 16) => {
  ws.send(`playrandomnotes ${GID} ${UID} ${count}`)
}
window.stopplay = () => {
  ws.send(`stopplay ${GID} ${UID}`)
}
window.interrupt = () => {
  sendNoteOn('C4', 0)({})
  sendNoteOff('C4')({})
}
