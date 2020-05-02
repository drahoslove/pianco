const { Midi } = require('@tonejs/midi')
const fetch = require('node-fetch')


// TODO move to common file
const CC_BANK_0 = 0
const CC_BANK_1 = 32
const CC_SUTAIN = 64

const toCmd = (x) => (1<<3 | x)<<4
const fromCmd = (cmd) => (cmd>>4) & 7
const toVal = (x) => Math.round(x*127)
const fromVal = (val) => val/127


class Autoplay {
  static midis = {}
  static wss
  timers = []
  gid = 0
  uid = 0

  constructor (room, user) {
    this.gid = room
    this.uid = user
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
    }
    this.askForTracks(Autoplay.midis[url], ws)
  }

  playTracks = (tracks) => {
    while (this.timers.length > 0) { // empty current timers
      clearTimeout(this.timers.shift())
    }
    for (let track of tracks) {
      console.log(' - scheduling notes')
      track.notes.forEach(note => {
        this.timers.push(setTimeout(this.sendNoteOn, note.time*1000, note))
        this.timers.push(setTimeout(this.sendNoteOff, note.time*1000 + note.duration*1000, note))
      })
      track.controlChanges.sustain && track.controlChanges.sustain.forEach(cc => {
        this.timers.push(setTimeout(this.sendSustain, cc.time*1000, cc.value))
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
      this.playTracks(selectedTracks)
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
