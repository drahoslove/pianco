import './Tone.js'

const playingNotes = new Set()
let transposition = 0

// prepare synth
const polySynth = new Tone.PolySynth(32, Tone.Synth).toMaster()
const pressNote = (note, velocity=0.8) => (e) => {
  if (playingNotes.has(note)) return
  playingNotes.add(note)
  document.querySelector(`[data-note="${note}"]`).classList.add('pressed')
  polySynth.triggerAttack([note], undefined, velocity)
}
const releaseNote = (note) => (e) => {
  if (!playingNotes.has(note)) return
  playingNotes.delete(note)
  document.querySelector(`[data-note="${note}"]`).classList.remove('pressed')
  polySynth.triggerRelease([note], "+1i")
}
const releaseAll = (notes) => () => {
  polySynth.triggerRelease(notes)
  playingNotes.clear()
  keys.forEach(key => { key.classList.remove('pressed') })
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
  keyboard.appendChild(key)
  keys.push(key)
})

// init transpose buttons
const setTransposition = (n) => {
  transposition = n
  if (transposition < -3) transposition = -3
  if (transposition > +3) transposition = +3
  keyboard.style.left = `${-transposition*21}rem`
  releaseAll(allNotes)()
}
const goBottom = () => setTransposition(-3)
const goDown = () => setTransposition(transposition-1)
const goMid = () => setTransposition(0)
const goUp = () => setTransposition(transposition+1)
const goTop = () => setTransposition(+3)

document.querySelector('.go-up').onclick = goUp
document.querySelector('.go-down').onclick = goDown
document.querySelector('.go-mid').onclick = goMid
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
  key.innerText = note
  key.addEventListener('mousedown', pressNote(note))
  key.addEventListener('mouseup', releaseNote(note))
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
  const [command, midiNote, midiVelocity = 0 ] = data

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
  if (window.screen.orientation.type?.includes('portrait')) {
    document.body.classList.add('rotated')
  } else {
    document.body.classList.remove('rotated')
  }
}

window.onorientationchange = reorient
reorient()