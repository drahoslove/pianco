import '../lib/Tone.js'

const playingNotes = new Set()

const instruments = {
  polySynth: new Tone.PolySynth(16, Tone.Synth, {
    envelope: {
      attack: 0.01,
      release: .5,
    }
  }).toMaster(),
  AMSynth: new Tone.AMSynth().toMaster(),
  FMSynth: new Tone.FMSynth().toMaster(),
  piano: new Tone.Sampler({
    "A0" : "A0.[mp3|ogg]",
    "C1" : "C1.[mp3|ogg]",
    "D#1" : "Ds1.[mp3|ogg]",
    "F#1" : "Fs1.[mp3|ogg]",
    "A1" : "A1.[mp3|ogg]",
    "C2" : "C2.[mp3|ogg]",
    "D#2" : "Ds2.[mp3|ogg]",
    "F#2" : "Fs2.[mp3|ogg]",
    "A2" : "A2.[mp3|ogg]",
    "C3" : "C3.[mp3|ogg]",
    "D#3" : "Ds3.[mp3|ogg]",
    "F#3" : "Fs3.[mp3|ogg]",
    "A3" : "A3.[mp3|ogg]",
    "C4" : "C4.[mp3|ogg]",
    "D#4" : "Ds4.[mp3|ogg]",
    "F#4" : "Fs4.[mp3|ogg]",
    "A4" : "A4.[mp3|ogg]",
    "C5" : "C5.[mp3|ogg]",
    "D#5" : "Ds5.[mp3|ogg]",
    "F#5" : "Fs5.[mp3|ogg]",
    "A5" : "A5.[mp3|ogg]",
    "C6" : "C6.[mp3|ogg]",
    "D#6" : "Ds6.[mp3|ogg]",
    "F#6" : "Fs6.[mp3|ogg]",
    "A6" : "A6.[mp3|ogg]",
    "C7" : "C7.[mp3|ogg]",
    "D#7" : "Ds7.[mp3|ogg]",
    "F#7" : "Fs7.[mp3|ogg]",
    "A7" : "A7.[mp3|ogg]",
    "C8" : "C8.[mp3|ogg]"
  }, {
    release: 1,
    onload: () => {
      console.log('piano samples loaded')
      releaseAll()()
      instrumentSelector.value = 'piano'
    },
    baseUrl : "/audio/salamander/",
  }).toMaster(),

}


// TODO move?
// instrument selector
const instrumentSelector = document.getElementById('instrument')
instrumentSelector.onchange = function () { this.blur() }
const getInstrument = () => instruments[instrumentSelector.value]

// note playing 
const pressNote = (note, velocity=0.8) => (e) => {
  if (playingNotes.has(note)) {
    return
  }
  playingNotes.add(note)
  document.querySelectorAll(`[data-note="${note}"]`).forEach(({ classList }) => classList.add('pressed'))
  getInstrument().triggerAttack([note], undefined, velocity)
}
const releaseNote = (note) => (e) => {
  if (!playingNotes.has(note)) {
    return
  }
  playingNotes.delete(note)
  document.querySelectorAll(`[data-note="${note}"]`).forEach(({ classList }) => classList.remove('pressed'))
  getInstrument().triggerRelease([note])
}
const releaseAll = () => () => {
  getInstrument().triggerRelease(allNotes)
  playingNotes.clear()
  document.querySelectorAll('.pressed').forEach(({ classList }) => classList.remove('pressed'))
}


const allNotes = []
allNotes.push("A0","A#0","B0")
;[1,2,3,4,5,6,7].forEach(octave => {
  "CDEFGAB".split('').forEach(letter => {
    allNotes.push(`${letter}${octave}`)
    if (letter !== 'E' && letter !== 'B') {
      allNotes.push(`${letter}#${octave}`)
    }
  })
})
allNotes.push('C8')


export {
  allNotes,
  pressNote,
  releaseNote,
  releaseAll,
}
