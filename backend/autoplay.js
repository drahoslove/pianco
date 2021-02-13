const { Midi } = require('@tonejs/midi')
const fs = require('fs').promises
const path = require('path')
const fetch = require('node-fetch')
const { normalRand, rand } = require('./rand.js')

const MIDI_CACHE_DIR = '../audio/midi'

const {
  CC_SUTAIN,
  NOTE_A0,
  NOTE_C8,
  toCmd,
  toVal,
} = require('./midi.js')

class Autoplay {
  static midis = {}
  static wss
  timers = Array.from({ length: 256 }).map(() => [])
  ghostTimer = 0
  gid = 0
  uid = 0

  constructor (group, user) {
    this.gid = group
    this.uid = user
  }

  resetGhost = ({delay=60, stopCurrent, pretendScared}) => {
    if (stopCurrent) {
      if (this.timers[this.uid].filter(id => !id._destroyed).length > 0) {
        setTimeout(() => {
          this.stop(this.uid)
          if (pretendScared) {
            this.playRandomNotes(this.uid, 5, 7)
          }
        }, 500)
      }
    }
    clearTimeout(this.ghostTimer)
    this.ghostTimer = setTimeout(() => {
      this.playRandomFile(this.uid)
    }, 1000 * delay)
  }

  playRandomNotes = (uid, count, tempo=1.0) => {
    this.stop(uid)
    for (let i = 0; i < count; i++) {
      const midi = NOTE_A0 + normalRand(NOTE_C8-NOTE_A0)
      const note = { midi, velocity: 0.5, duration: 0.5/tempo + normalRand(0.25), time: (i + rand(7)/7)/tempo }

      this.timers[uid].push(setTimeout(this.sendNoteOn, note.time*1000, note, uid))
      this.timers[uid].push(setTimeout(this.sendNoteOff, note.time*1000 + note.duration*1000, note, uid))
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
    while (this.timers[uid] && this.timers[uid].length > 0) { // empty current timers
      clearTimeout(this.timers[uid].shift())
    }
    for (let note = NOTE_A0; note <= NOTE_C8; note++) {
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
        this.timers[uid].push(setTimeout(this.sendNoteOn, note.time*1000, note, uid))
        this.timers[uid].push(setTimeout(this.sendNoteOff, note.time*1000 + note.duration*1000, note, uid))
      })
      track.controlChanges.sustain && track.controlChanges.sustain.forEach(cc => {
        this.timers[uid].push(setTimeout(this.sendSustain, cc.time*1000, cc.value, uid))
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

  sendSustain = (value, uid) => {
    Autoplay.wss.broadcast([this.gid, uid || this.uid, toCmd(3), CC_SUTAIN, toVal(value)])
  }
  
  sendNoteOn = (note, uid) => {
    Autoplay.wss.broadcast([this.gid, uid || this.uid, toCmd(1), note.midi, toVal(note.velocity)])
  }
  
  sendNoteOff = (note, uid) => {
    Autoplay.wss.broadcast([this.gid, uid || this.uid, toCmd(0), note.midi,toVal(0)])
  }

}


module.exports = (server) => {
  Autoplay.wss = server
  return Autoplay
}
