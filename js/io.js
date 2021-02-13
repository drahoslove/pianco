import '../lib/Tone.js'
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
import { networkingApp } from './vue/networking.js'
import { recorderApp } from './vue/recorder.js'


Blob.prototype.arrayBuffer = Blob.prototype.arrayBuffer || function () {
  return new Response(this).arrayBuffer()
} // polyfill for safari

let UID = 0 // will be changed by backend
let GID = 0 

// WS!
let ws

export const rename = (newName) => {
  const { secret } = localStorage
  if (newName) {
    ws.send(`regroup ${GID} ${UID} ${GID} ${secret||''} ${newName||''}`)
  }
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

const onRegroup = onCmd('regroup', (values) => {
  const [newGid, newUid] = values.map(Number)
  const [secret, name] = values.slice(2)
  networkingApp.gid = GID = newGid
  networkingApp.uid = UID = newUid
  if (secret) {
    localStorage.secret = secret
  }
  if (name) {
    localStorage.name = name
  }
  const hashRoom = (parseInt(location.hash.slice(1))) % 256 || 0
  if (hashRoom !== newGid) {
    location.hash = (newGid || '') + (location.hash.endsWith('m') ? 'm' : '')
  }
  recorderApp.reset()
  console.log(`${UID}@${GID} changed`)
})

const onUserStatus = onCmd('status', (values) => {
  const status = JSON.parse(values.join(''))
  networkingApp.groups = status.groups || []
  networkingApp.names = status.names || {}
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
  const [gid, uid, cmd, val1, val2] = new Uint8Array(await data.arrayBuffer())
  if (gid !== GID) { // another group
    return 
  }

  const isMuted = networkingApp.isMuted(uid)

  if (uid === UID && chanFromCmd(cmd) === CHANNEL) { // your notes
    return
  }
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
        pressSustain(uid)
      } else {
        releaseSustain(uid)
      }
    }
  }
}

window.addEventListener('hashchange', () => { // chagning group
  const newGid = (parseInt(location.hash.slice(1))) % 256 || 0
  sendOffAll() // to mute self for others before leaving
  sendSustain(0) // to mute self for others before leaving
  allOff() // to mute others
  if (ws.readyState !== WebSocket.OPEN) {
    return
  }
  const { secret, name } = localStorage
  ws.send(`regroup ${GID} ${UID} ${newGid} ${secret||''} ${name||''}`)
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
    timeout = setTimeout(ping, 5000 + Math.floor(Math.random()*2000))
  }
  ws.addEventListener('message', ({ data }) => {
    if (data === 'pong') {
      pongs++
      if (localStorage.DEBUG){
        console.log('ping', Math.floor((performance.now() - now)*100) /100, 'ms')
      }
    }
  })
  ping()
}

const connect = () => {
  console.log('connecting')
  try {
    ws = new WebSocket(
      location.hostname !== 'pianco.online'
        ? `ws://${location.hostname}:11088`
        : 'wss://pianoecho.draho.cz'
    )
    // handle regroup
    ws.addEventListener('message', onRegroup)
    // hanlde incomming notes
    ws.addEventListener('message', onBlob)
    // handle status
    ws.addEventListener('message', onUserStatus)
    // handle recorder status
    ws.addEventListener('message', onRecorderStatus)
    
    ws.onopen = () => {
      const newGid = (parseInt(location.hash.slice(1))) % 256 || 0
      const { secret, name } = localStorage
      ws.send(`regroup 0 0 ${newGid} ${secret||''} ${name||''}`)
      networkingApp.isOnline = true
      console.log('ws open')
      pingPong()
    }
    ws.onerror = (err) => {
      console.log('ws error', err)
    }
    ws.onclose = () => {
      console.log('ws close')
      networkingApp.isOnline = false
      setTimeout(connect, 3000)
    }
  
  } catch(e) {
    console.error(e)
  }
}

connect()

const sendNoteOn = (note, velocity=0.5) => (source) => {
  pressNote(note, velocity, UID)(source)
  if (ws.readyState !== WebSocket.OPEN) {
    return
  }
  const midiNote = Tone.Midi(note).toMidi()
  ws.send(new Uint8Array([GID, UID, toCmd(1), midiNote, toVal(velocity)]))
}

const sendNoteOff = (note) => (source) => {
  releaseNote(note, UID)(source)
  if (ws.readyState !== WebSocket.OPEN) {
    return
  }
  const midiNote = Tone.Midi(note).toMidi()
  ws.send(new Uint8Array([GID, UID, toCmd(0), midiNote, toVal(0)]))
}

const sendOffAll = () => (source) => {
  releaseAll(UID)(source).forEach((note) => sendNoteOff(note))
}

const sendSustain = (value, source) => {
  if (value >= 0.5) {
    pressSustain(UID, source)
  } else {
    releaseSustain(UID, source)
  }
  if (ws.readyState !== WebSocket.OPEN) {
    return
  }
  ws.send(new Uint8Array([GID, UID, toCmd(3), CC_SUTAIN, toVal(value)]))
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
        if (i<3) {
          preselection.push(i+1)
        }
        return `${i+1}: ${instrumentById[id]} - ${notes} notes`
      }).join('\n')
      const selection = prompt(question, preselection).split(',').map(i => i-1).join(',')
      ws.removeEventListener('message', selectOptions)
      ws.send(`auto! ${url};${selection}`)
    }
  }
  ws.addEventListener('message', selectOptions)
}
window.randomfile = () => {
  ws.send(`playrandomfile ${GID} ${UID}`)
}
window.randomnotes = (count=16) => {
  ws.send(`playrandomnotes ${GID} ${UID} ${count}`)
}
window.stopplay = () => {
  ws.send(`stopplay ${GID} ${UID}`)
}
window.interrupt = () => {
  sendNoteOn('C4', 0)({})
  sendNoteOff('C4')({})
}