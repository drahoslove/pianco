import '../lib/Tone.js'
import { pressNote, releaseNote, releaseAll, instrumentById } from './instrument.js'

const UID = Math.floor(Math.random()*255) // TODO obtain from backend
let GID = (+location.hash.slice(1)) % 256 || 0

window.onhashchange = () => {
  GID = (+location.hash.slice(1)) % 256 || 0
  console.log(`${UID}@${GID}`)
}

console.log(`${UID}@${GID}`)

// WS!

let ws = {}
try {
  ws = new WebSocket(
    location.hostname === 'localhost'
      ? 'ws://localhost:11088'
      : 'wss://pianoecho.draho.cz:11088'
  )


  ws.addEventListener('message', async ({ data }) => {
    if (data instanceof Blob) {
      const [gid, uid, on, midiNote, midiVelocity] = new Uint8Array(await data.arrayBuffer())
      if (gid !== GID) { // another group
        return 
      }
      if (uid === UID) { // your notes
        return
      }
      const note = Tone.Midi(midiNote).toNote()
      if (on) {
        const velocity = midiVelocity/127
        pressNote(note, velocity, uid)()
      } else {
        releaseNote(note, uid)()
      }
    }
  })

  ws.onopen = () => {
    console.log('ws open')
    if (localStorage.DEBUG) {
      let now
      ws.addEventListener('message', ({ data }) => {
        if (data === 'pong') {
          console.log('ping', Math.floor((performance.now() - now)*100) /100, 'ms')
        }
      })
      ws.onrea
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


const sendNoteOn = (note, velocity=0.8, uid=UID) => (e) => {
  pressNote(note, velocity, uid)(e)
  if (ws.readyState !== WebSocket.OPEN) {
    return
  }
  const midiNote = Tone.Midi(note).toMidi()
  const midiVelocity = Math.floor(velocity*127)
  ws.send(new Uint8Array([GID, UID, 1, midiNote, midiVelocity]))
}

const sendNoteOff = (note, uid=UID) => (e) => {
  releaseNote(note, uid)(e)
  if (ws.readyState !== WebSocket.OPEN) {
    return
  }
  const midiNote = Tone.Midi(note).toMidi()
  ws.send(new Uint8Array([GID, UID, 0, midiNote]))
}

const sendOffAll = (uid=UID) => (e) => {
  releaseAll(uid)().forEach((note) => sendNoteOff(note))
}

export {
  sendNoteOn,
  sendNoteOff,
  sendOffAll,
}


window.autoplay = (url='/audio/midi/blues.mid') => {
  if (url.startsWith('/')) {
    url = location.origin + url
  }
  ws.send(`autoplay ${url}`)
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