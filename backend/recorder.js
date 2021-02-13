const { performance } = require('perf_hooks')

const { fromCmd, toCmd, toVal, CC_SUTAIN, NOTE_A0, NOTE_C8 } = require('./midi.js')

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
    this.tape = this.tape.slice(0,this.seekIndex)
    this.isRecording = true
    this.startTime = this.tape.length > 0
      ? performance.now() - this.tape[this.tape.length-1].time
      : performance.now()
    Recorder.wss.send(this.gid, this.uid, `isRecording ${true}`)
  }
  stop () {
    this.isRecording = false
    Recorder.wss.send(this.gid, this.uid, `isRecording ${false}`)
    this.isPlaying = false
    Recorder.wss.send(this.gid, this.uid, `isPlaying ${false}`)
    this.seekTime = 0
    this.seekIndex = 0
    clearTimeout(this.timeout)
    this.timeout = 0
  }
  play () {
    if (this.isRecording) {
      this.isRecording = false
      Recorder.wss.send(this.gid, this.uid, `isRecording ${false}`)
    }
    this.isPlaying = true
    Recorder.wss.send(this.gid, this.uid, `isPlaying ${true}`)
    const event = this.tape[this.seekIndex]
    if (event) { // schedule replay of event
      this.timeout = setTimeout(() => {
        this.seekIndex++
        this.seekTime = event.time
        Recorder.wss.broadcast(event.data)
        this.play() // next note
      }, event.time - this.seekTime)
    } else {
      this.stop()
    }
  }
  pause () {
    this.isPlaying = false
    this.isRecording = false
    clearTimeout(this.timeout)
    Recorder.wss.send(this.gid, this.uid, `isPlaying ${false}`)
  }
  write (data) {
    if (!this.isRecording) {
      return
    }
    if (this.tape.length === 0) {
      this.startTime = performance.now() - 250
    }
    // change channel in data
    data[2] = toCmd(fromCmd(data[2]))
    const time = performance.now() - this.startTime
    this.tape.push({ time, data })
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
    Recorder.wss.broadcast([this.gid, uid, toCmd(3), CC_SUTAIN, toVal(value)])
  }
  
  sendNoteOn = (note, uid) => {
    Recorder.wss.broadcast([this.gid, uid, toCmd(1), note, toVal(note.velocity)])
  }
  
  sendNoteOff = (note, uid) => {
    Recorder.wss.broadcast([this.gid, uid, toCmd(0), note, toVal(0)])
  }
}


module.exports = (server) => {
  Recorder.wss = server
  return Recorder 
}