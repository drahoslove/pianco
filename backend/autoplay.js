const { Midi } = require('@tonejs/midi')
const fs = require('fs').promises
const path = require('path')
const fetch = require('node-fetch')
const { normalRand, rand } = require('./rand.js')

const MIDI_CACHE_DIR = '../audio/midi'

const GHOST_UID = 255

// TODO move to common file
const CC_BANK_0 = 0
const CC_BANK_1 = 32
const CC_SUTAIN = 64
const A0_NOTE = 21
const C8_NOTE = 108

const toCmd = (x) => (1<<3 | x)<<4
const fromCmd = (cmd) => (cmd>>4) & 7
const toVal = (x) => Math.round(x*127)
const fromVal = (val) => val/127


class Autoplay {
  static midis = {}
  static wss
  timers = Array.from({ length: 256 }).map(() => [])
  ghostTimer = 0
  gid = 0
  uid = 0

  constructor (room, user) {
    this.gid = room
    this.uid = user
  }

  resetGhost = (delay=60) => {
    this.stop(GHOST_UID)
    clearTimeout(this.ghostTimer)
    this.ghostTimer = setTimeout(() => {
      this.playRandomFile(GHOST_UID)
    }, 1000 * delay)
  }

  playRandomNotes = (uid, count) => {
    this.stop(uid)
    for (let i = 0; i < count; i++) {
      const midi = A0_NOTE + normalRand(C8_NOTE-A0_NOTE)
      const note = { midi, velocity: 0.5, duration: 0.5 + normalRand(0.25), time: i + rand(7)/7 }

      this.timers[uid].push(setTimeout(this.sendNoteOn, note.time*1000, note))
      this.timers[uid].push(setTimeout(this.sendNoteOff, note.time*1000 + note.duration*1000, note))
    }
  }

  playRandomFile = async (uid) => {
    const files = await fs.readdir(MIDI_CACHE_DIR)
    if (files.length === 0) {
      return
    }
    const fileName = files[rand(files.length)]
    const midiFile = await fs.readFile(path.join(MIDI_CACHE_DIR, fileName))
    const midi = new Midi(midiFile)
    const tracks = this.getTracks(midi)
    this.playTracks(tracks, uid)
  }

  stop = (uid) => {
    while (this.timers[uid].length > 0) { // empty current timers
      clearTimeout(this.timers[uid].shift())
    }
    for (let note = A0_NOTE; note <= C8_NOTE; note++) {
      this.sendNoteOff({midi: note}, uid)
    }
    this.sendSustain(0, uid)
  }


  requestHandler = (ws) => async (url) => {
    console.log('midi autoplay requested', url)
    if (!(url in Autoplay.midis)) {
      const res = await fetch(url).catch(e => {
        console.error(`failed to fetch ${url}\n${e.message}`)
      })
      if (!res) return
      const midiFile = await res.buffer().catch(e => {
        console.error(`failed to get data from fetched file ${url}\n${e}`)
      })
      let midi
      try {
        midi = new Midi(midiFile)
      } catch (e) {
        console.error(`failed to parse midi file ${url}\n${e}`)
        return
      }
      Autoplay.midis[url] = midi
      const filePath = path.join(MIDI_CACHE_DIR, path.basename(url))
      fs.writeFile(filePath, midiFile) // save to midi cache
      console.log('file saved', filePath)
    }
    this.askForTracks(Autoplay.midis[url], ws)
  }

  playTracks = (tracks, uid) => {
    this.stop(uid)
    for (let track of tracks) {
      console.log(' - scheduling notes')
      track.notes.forEach(note => {
        this.timers[uid].push(setTimeout(this.sendNoteOn, note.time*1000, note))
        this.timers[uid].push(setTimeout(this.sendNoteOff, note.time*1000 + note.duration*1000, note))
      })
      track.controlChanges.sustain && track.controlChanges.sustain.forEach(cc => {
        this.timers[uid].push(setTimeout(this.sendSustain, cc.time*1000, cc.value))
      })
      console.log(` - will play ${track.notes.length} ${track.instrument.family} notes`)
    }
  }
  
  askForTracks = (midi, client) => {
    const tracksInfo = this.getTracks(midi)
      .map(({ instrument, notes }) => [instrument.number, notes.length].join(':'))
      .join(';')
    client.send(`auto?instrument ${tracksInfo}`)
    client.once('message', (message) => {
      if (typeof message !== "string") {
        return
      }
      const [cmd, data] = message.split(' ')
      if (cmd !== 'auto!') {
        return
      }
      const [url, selection] = data.split(';')
      const selectedIndexes = selection.split(',').map(Number)
      const midi = Autoplay.midis[url]
      const selectedTracks = this.getTracks(midi).filter((_, i) => selectedIndexes.includes(i))
      this.playTracks(selectedTracks, client.uid)
    })
  }
  
  
  getTracks = ({ tracks }) => (
    tracks
      .filter(({ notes }) => notes.length > 0)
      .sort(({ instrument: iA, notes: nA }, { instrument: iB, notes: nB }) => {
        return (iA.number !== iB.number)
          ? iA.number - iB.number // less is better
          : nB.length - nA.length // more is better 
      })
  )

  sendSustain = (value) => {
    Autoplay.wss.broadcast([this.gid, this.uid, toCmd(3), 64, toVal(value)])
  }
  
  sendNoteOn = (note) => {
    Autoplay.wss.broadcast([this.gid, this.uid, toCmd(1), note.midi, toVal(note.velocity)])
  }
  
  sendNoteOff = (note) => {
    Autoplay.wss.broadcast([this.gid, this.uid, toCmd(0), note.midi])
  }

}



module.exports = (server) => {
  Autoplay.wss = server
  return Autoplay
}
