import '../lib/Tone.js'
import {
  pressNote, releaseNote, releaseAll,
  pressSustain, releaseSustain,
  instrumentById,
  allOff,
} from './instrument.js'
import {
  fromCmd, toCmd, fromVal, toVal,
  CC_SUTAIN,
} from './midi.js'

let UID = 0 // will be changed by backend
let GID = 0 

// WS!

let ws
try {
  ws = new WebSocket(
    location.hostname === 'localhost'
      ? 'ws://localhost:11088'
      : 'wss://pianoecho.draho.cz:11088'
  )

  window.addEventListener('hashchange', () => { // chagning group
    const newGid = (parseInt(location.hash.slice(1))) % 256 || 0
    sendOffAll() // to mute self for other before leaving
    sendSustain(0) // to mute self for other efore leaving
    allOff() // to mute others
    if (ws.readyState !== WebSocket.OPEN) {
      return
    }
    ws.send(`regroup ${GID} ${UID} ${newGid}`)
    console.log(`${UID}@${GID} => ?@${newGid} request`)
  })
  

  ws.addEventListener('message', async ({ data: message }) => {
    if (typeof message !== 'string') {
      return
    }
    const [cmd, ...values] = message.split(' ')
    if (cmd === 'regroup') {
      const [newGid, newUid] = values.map(Number)
      GID = newGid
      UID = newUid
      console.log(`${UID}@${GID} changed`)
    }
  })


  // hanlde incomming notes
  ws.addEventListener('message', async ({ data }) => {
    if (data instanceof Blob) {
      const [gid, uid, cmd, val1, val2] = new Uint8Array(await data.arrayBuffer())
      if (gid !== GID) { // another group
        return 
      }
      if (uid === UID) { // your notes
        return
      }
      const note = Tone.Midi(val1).toNote()
      if (fromCmd(cmd) === 1) {
        const velocity = fromVal(val2)
        pressNote(note, velocity, uid)()
      } 
      if (fromCmd(cmd) === 0) {
        releaseNote(note, uid)()
      }
      if (fromCmd(cmd) === 3) { // control command
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
  })

  ws.onopen = () => {
    const newGid = (parseInt(location.hash.slice(1))) % 256 || 0
    ws.send(`regroup 0 0 ${newGid}`)

    console.log('ws open')
    if (localStorage.DEBUG) { // pinpong
      let now
      ws.addEventListener('message', ({ data }) => {
        if (data === 'pong') {
          console.log('ping', Math.floor((performance.now() - now)*100) /100, 'ms')
        }
      })
      ;(function ping() {
        now = performance.now()
        ws.send('ping')
        setTimeout(ping, 10000 + Math.floor(Math.random()*2000))
      })()
    }
  }
  ws.onerror = (err) => {
    console.log('ws error', err)
  }
  ws.onclose = () => {
    console.log('ws close')
  }

} catch(e) {
  console.error(e)
}


const sendNoteOn = (note, velocity=0.8,) => (e) => {
  pressNote(note, velocity, UID)(e)
  if (ws.readyState !== WebSocket.OPEN) {
    return
  }
  const midiNote = Tone.Midi(note).toMidi()
  ws.send(new Uint8Array([GID, UID, toCmd(1), midiNote, toVal(velocity)]))
}

const sendNoteOff = (note) => (e) => {
  releaseNote(note, UID)(e)
  if (ws.readyState !== WebSocket.OPEN) {
    return
  }
  const midiNote = Tone.Midi(note).toMidi()
  ws.send(new Uint8Array([GID, UID, toCmd(0), midiNote]))
}

const sendOffAll = () => (e) => {
  releaseAll(UID)().forEach((note) => sendNoteOff(note))
}

const sendSustain = (value) => {
  if (value >= 0.5) {
    pressSustain(UID)
  } else {
    releaseSustain(UID)
  }
  if (ws.readyState !== WebSocket.OPEN) {
    return
  }
  ws.send(new Uint8Array([GID, UID, toCmd(3), CC_SUTAIN, toVal(value)]))
}

export {
  sendNoteOn,
  sendNoteOff,
  sendOffAll,
  sendSustain,
}


window.autoplay = (url='/audio/midi/blues.mid') => {
  if (url.startsWith('/')) {
    url = location.origin + url
  }
  ws.send(`autoplay ${GID} ${UID} ${url}`)
  console.log('will play', url, 'soon')
  const selectOptions = ({ data: msg }) => {
    if (typeof msg !== 'string') return;
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