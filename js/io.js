import '../lib/Tone.js'
import { pressNote, releaseNote } from './instrument.js'

const uid = Math.floor(Math.random()*255)

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
      const [uid, on, midiNote, midiVelocity] = new Uint8Array(await data.arrayBuffer())
      const note = Tone.Midi(midiNote).toNote()
      if (on) {
        const velocity = midiVelocity/127
        pressNote(note, velocity)()
      } else {
        releaseNote(note)()
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
        setInterval(ping, 10000 + Math.floor(Math.random()*2000))
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


const sendNoteOn = (note, velocity) => (e) => {
  pressNote(note, velocity)(e)
  if (ws.readyState !== WebSocket.OPEN) {
    return
  }
  const midiNote = Tone.Midi(note).toMidi()
  const midiVelocity = Math.floor(velocity*255)
  ws.send(new Uint8Array([uid, 1, midiNote, midiVelocity]))
}

const sendNoteOff = (note) => (e) => {
  releaseNote(note)(e)
  if (ws.readyState !== WebSocket.OPEN) {
    return
  }
  const midiNote = Tone.Midi(note).toMidi()
  ws.send(new Uint8Array([uid, 0, midiNote]))
}

export {
  sendNoteOn,
  sendNoteOff,
}