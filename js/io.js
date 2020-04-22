import '../lib/Tone.js'
import { pressNote, releaseNote } from './instrument.js'

const uid = Math.floor(Math.random()*255)

// WS!

const ws = new WebSocket(
  location.hostname === 'localhost'
    ? 'ws://localhost:11088'
    : 'ws://vps.draho.cz:11088'
)

ws.onopen = () => {
  console.log('ws open')
}
ws.onerror = (err) => {
  console.log('ws error', err)
}
ws.onclose = () => {
  console.log('ws close')
}
ws.onmessage = async ({ data }) => {
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