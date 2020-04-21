import './Tone.js'

const playingNotes = new Set()
let transposition = 0

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
      releaseAll(allNotes)()
      instrumentSelector.value = 'piano'
    },
    baseUrl : "./salamander/",
  }).toMaster(),

}


// instrument selector
const instrumentSelector = document.getElementById('instrument')
instrumentSelector.onchange = function () { this.blur() }
const getInstrument = () => instruments[instrumentSelector.value]


// note playing 
const pressNote = (note, velocity=0.8) => (e) => {
  if (playingNotes.has(note)) return
  playingNotes.add(note)
  document.querySelectorAll(`[data-note="${note}"]`).forEach(({ classList }) => classList.add('pressed'))
  getInstrument().triggerAttack([note], undefined, velocity)
}
const releaseNote = (note) => (e) => {
  if (!playingNotes.has(note)) return
  playingNotes.delete(note)
  document.querySelectorAll(`[data-note="${note}"]`).forEach(({ classList }) => classList.remove('pressed'))
  getInstrument().triggerRelease([note])
}
const releaseAll = (notes) => () => {
  getInstrument().triggerRelease(notes)
  playingNotes.clear()
  document.querySelectorAll('.pressed').forEach(({ classList }) => classList.remove('pressed'))
}

const _ = cb => e => {
  e.preventDefault()
  cb(e)
}

// create keys
const keyboard = document.querySelector('.keyboard')
const keys = []
const allNotes = []
allNotes.push("A0","A#0","B0")
;[1,2,3,4,5,6,7].forEach(octave => {
  "CDEFGAB".split('').forEach(letter => {
    allNotes.push(`${letter}${octave}`, `${letter}#${octave}`)
  })
})
allNotes.push('C8')
allNotes.forEach(note => {
  const key = document.createElement('button')
  key.dataset.note = note
  key.innerHTML = note.replace(/([A-G])(#?)(\d)/g, (_, n, s, i) => `<span>${n}${s&&'♯'}<sub>${i}</sub>`)
  keyboard.appendChild(key)
  keys.push(key)
})

// init transpose buttons
const goUpBtn = document.getElementById('go-up')
const goMidBtn = document.getElementById('go-mid')
const goDownBtn = document.getElementById('go-down')
goMidBtn.className = transposition === 0 ? 'on': ''
goUpBtn.className = transposition > 0 ? 'on': ''
goDownBtn.className = transposition < 0 ? 'on': ''
const setTransposition = (n) => {
  transposition = n
  if (transposition < -3) transposition = -3
  if (transposition > +3) transposition = +3
  keyboard.style.left = `${-transposition*21}rem`
  releaseAll(allNotes)()
  goMidBtn.className = transposition === 0 ? 'on': ''
  goUpBtn.className = Array.from(new Array(Math.max(transposition+1, 0)))
    .fill('').join('on')
  goDownBtn.className = Array.from(new Array(Math.max(-transposition+1,0)))
    .fill('').join('on')
}
const goBottom = () => setTransposition(-3)
const goDown = () => setTransposition(transposition-1)
const goMid = () => setTransposition(0)
const goUp = () => setTransposition(transposition+1)
const goTop = () => setTransposition(+3)

goUpBtn.onmousedown = goUp
goUpBtn.ontouchstart = goUp
goDownBtn.onmousedown = goDown
goDownBtn.ontouchstart = goDown
goMidBtn.onmousedown = goMid
goMidBtn.ontouchstart = goMid
window.addEventListener('keydown', (e) => {
  switch(e.code) {
    case 'ArrowRight':
    case 'KeyN':
      return goUp()
    case 'ArrowLeft':
    case 'KeyV':
      return goDown()
    case 'Space':
    case 'ArrowUp':
    case 'KeyB':
      return goMid()
    case 'PageDown':
      return goTop()
    case 'PageUp':
      return goBottom()
    
  }
})


// init mouse keys
keys.forEach(key => {
  const { note } = key.dataset
  key.addEventListener('mousedown', _(pressNote(note)))
  key.addEventListener('mouseup', _(releaseNote(note)))
  key.addEventListener('mouseenter', (e) => {
    if (e.buttons === 1) pressNote(note)(e)
  })
  key.addEventListener('mouseleave', (e) => {
    if (e.buttons === 1) releaseNote(note)(e)
  })
  key.addEventListener('touchend', releaseNote(note))
  
  key.onselect = e => {
    e.preventDefault()
    return false
  }
  key.onselectstart = e => {
    e.preventDefault()
    return false
  }
})
keyboard.addEventListener('mouseover', releaseAll(allNotes))


// init touch kyes
{
  const touchedKeys = []
  keyboard.addEventListener('touchstart', (e) => {
    ;[...e.targetTouches].forEach(({ clientX: x, clientY: y }, i) => {
      const key = document.elementFromPoint(x, y)
      if (key) {
        const { note } = key.dataset
        if (!playingNotes.has(note)) pressNote(note)(e)
        touchedKeys[i] = key
      }
    })
  })
  keyboard.addEventListener('touchmove', (e) => {
    ;[...e.targetTouches].forEach(({ clientX: x, clientY: y }, i) => {
      const key = document.elementFromPoint(x, y)
      if (key) {
        const { note } = key.dataset
        if (!playingNotes.has(note)) pressNote(note)(e)
      }
      if (touchedKeys[i] && key !== touchedKeys[i]) {
        const { note } = touchedKeys[i].dataset
        if (playingNotes.has(note)) releaseNote(note)(e)
      }
      if (key) {
        touchedKeys[i] = key
      }
    })
  })
  keyboard.addEventListener('touchend', (e) => {
    ;[...e.changedTouches].forEach(({ clientX: x, clientY: y }, i) => {
      const key = document.elementFromPoint(x, y)
      if (touchedKeys[i]) {
        const { note } = touchedKeys[i].dataset
        if (playingNotes.has(note)) releaseNote(note)(e)
      }
      touchedKeys[i] = null
    })
  })
  keyboard.addEventListener('touchcancel', releaseAll(allNotes))
}

// init keyboard keys
const keyMap = (n) => ({
  'KeyA': `C${n+4}`,
    'KeyW': `C#${n+4}`,
  'KeyS': `D${n+4}`,
    'KeyE': `D#${n+4}`,
  'KeyD': `E${n+4}`,
  'KeyF': `F${n+4}`,
    'KeyT': `F#${n+4}`,
  'KeyG': `G${n+4}`,
    'KeyY': `G#${n+4}`,
  'KeyH': `A${n+4}`,
    'KeyU': `A#${n+4}`,
  'KeyJ': `B${n+4}`,

  'KeyK': `C${n+5}`,
    'KeyO': `C#${n+5}`,
  'KeyL': `D${n+5}`,
    'KeyP': `D#${n+5}`,
  'Semicolon': `E${n+5}`,
  'Quote': `F${n+5}`,
  // 'Backslash': `G${n+5}`,
})
window.addEventListener('keydown', e => {
  const note = keyMap(transposition)[e.code]
  if (note && !playingNotes.has(note)) {
    pressNote(note)(e)
  }
})
window.addEventListener('keyup', e => {
  const note = keyMap(transposition)[e.code]
  if (note && playingNotes.has(note)) {
    releaseNote(note)(e)
  }
})


// MIDI
const midiEl = document.getElementById('midi')
if (navigator.requestMIDIAccess) {
  console.log('This browser supports WebMIDI!')
  midiEl.innerText = 'supported'
  navigator.requestMIDIAccess()
    .then(onMIDISuccess, () => {
      console.log('Could not access your MIDI devices.')
      midiEl.innerText = 'failed'
    })
} else {
  console.log('WebMIDI is not supported in this browser.')
  midiEl.innerText = 'not supported'
}

function onMIDISuccess(midiAccess) {
  for (var input of midiAccess.inputs.values()) {
    midiEl.innerText = input.name
    input.onstatechange = (e) => { }
    input.onmidimessage = getMIDIMessage
  }
}

function getMIDIMessage(midiMessage) {
  const { data } = midiMessage
  const [command, midiNote, midiVelocity = 0] = data

  const note = Tone.Midi(midiNote).toNote()
  const velocity = midiVelocity/127

  switch (command) {
    case 144: // noteOn
      if (velocity > 0) {
        pressNote(note, velocity)()
      } else {
        releaseNote(note)()
      }
      break;
    case 128: // noteOff
      releaseNote(note)()
      break;
  }
}


// orientation


const reorient = () => {
  if (window.screen.orientation.type.includes('portrait')) {
    document.body.classList.add('rotated')
  } else {
    document.body.classList.remove('rotated')
  }
}

window.onorientationchange = reorient
reorient()