const { performance } = require('perf_hooks')

const {
  fromCmd, toCmd, toVal,
  CC_SUTAIN, NOTE_A0, NOTE_C8,
} = require('./midi.js')

let WSS // set on import


// stopped -> recording
// recording -> stopped
// recording -> playing
// stopped -> playing
// playing -> stopped (auto)
// paying -> paused
// paused -> playing
// paused !x! recording

//            seekTime      isRecording     isPlaying
// stopped    0             false           false
// recording  ?             true            false
// playing    >0            false           true
// paused     >0            false           false


class Tape {
  isRecording = false
  startTime = 0
  seekTime = 0
  seekIndex = 0
  timeout = 0
  tape = []
  constructor(gid, uid) {
    this.gid = gid
    this.uid = uid
  }
  record () {
    this.isRecording = true
    WSS.send(this.gid, this.uid, `isRecording ${true}`)
  }
  stop () {
    this.isRecording = false
    this.isPlaying = false
    WSS.send(this.gid, this.uid, `isRecording ${false}`)
    WSS.send(this.gid, this.uid, `isPlaying ${false}`)
    this.seekTime = 0
    this.seekIndex = 0
    clearTimeout(this.timeout)
  }
  play () {
    if (this.isRecording) {
      this.seekIndex = 0
      this.seekTime = 0
      this.isRecording = false
      WSS.send(this.gid, this.uid, `isRecording ${false}`)
    }
    this.isPlaying = true
    WSS.send(this.gid, this.uid, `isPlaying ${true}`)
    const event = this.tape[this.seekIndex]
    if (!event) {
      this.stop()
      return
    }
    // schedule replay of event
    this.timeout = setTimeout(() => {
      this.seekIndex++
      this.seekTime = event.time
      WSS.broadcast(this.gid, event.data)
      this.play() // next note
    }, event.time - this.seekTime)
  }
  pause () {
    this.isPlaying = false
    clearTimeout(this.timeout)
    WSS.send(this.gid, this.uid, `isPlaying ${false}`)
  }
  write (data) {
    if (!this.isRecording) {
      return
    }
    if (this.seekIndex < this.tape.length) { // chop off rest of the tape
      this.tape.length = this.seekIndex
      if (this.tape.length > 0) { // adjust depending on the last times
        this.startTime = performance.now() - this.tape[this.tape.length-1].time
      }
    }
    if (this.tape.length === 0) { // leave fixed space at start
      this.startTime = performance.now() - 250
    }

    // change channel in data
    data[2] = toCmd(fromCmd(data[2]))
    const time = performance.now() - this.startTime
    this.tape.push({ time, data })
    this.seekIndex = this.tape.length
  }
}

class Recorder {
  static wss

  gid = 0
  
  constructor (gid) {
    this.tapes = Array.from({ length: 256 }).map((_, uid) => new Tape(gid, uid)) // one for each user
    this.gid = gid
  }

  pass (data) {
    this.tapes
      .forEach(tape => {
        tape.write(data)
      })
  }
  record (uid) {
    this.tapes[uid].record()
  }
  stop (uid) {
    this.tapes[uid].stop()
    // silence
    for (let note = NOTE_A0; note <= NOTE_C8; note++) {
      this.sendNoteOff(note, uid)
    }
    this.sendSustain(0, uid)
  }
  replay (uid) {
    this.tapes[uid].play()
  }
  pause (uid) {
    this.tapes[uid].pause()
  }

  sendSustain = (value, uid) => {
    WSS.broadcast(this.gid, [this.gid, uid, toCmd(3), CC_SUTAIN, toVal(value)])
  }
  
  sendNoteOn = (note, uid) => {
    WSS.broadcast(this.gid, [this.gid, uid, toCmd(1), note, toVal(note.velocity)])
  }
  
  sendNoteOff = (note, uid) => {
    WSS.broadcast(this.gid, [this.gid, uid, toCmd(0), note, toVal(0)])
  }
}


module.exports = (server) => {
  WSS = server
  return Recorder 
}