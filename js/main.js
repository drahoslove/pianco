import {
  allNotes,
} from './instrument.js'
import {
  sendNoteOn as pressNote,
  sendNoteOff as releaseNote,
  sendOffAll as releaseAll,
} from './io.js'

let transposition = 0

const _ = cb => e => {
  e.preventDefault()
  cb && cb(e)
  return false
}

// create keys
const keyboard = document.querySelector('.keyboard')
const pianoroll = document.querySelector('.pianoroll')
const keys = []

allNotes.forEach((note, i, { length }) => {
  const key = document.createElement('button')
  key.dataset.note = note
  key.innerHTML = note.replace(/([A-G])(#?)(\d)/g, (_, n, s, i) => `<span>${n}${s&&'♯'}<sub>${i}</sub></span>`)
  keyboard.querySelector('.top-keys').appendChild(key)
  const hue = 360*((i-3)/(12*4))
  key.style.setProperty('--hue', hue)
  if (!note.includes('#')) {
    const wideKey = key.cloneNode(true)
    keyboard.querySelector('.bottom-keys').appendChild(wideKey)
    keys.push(wideKey)
  } else {
    keys.push(key)
  }

  const column = document.createElement('div')
  column.dataset.note = note
  column.style.setProperty('--hue', hue)
  pianoroll.appendChild(column)
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
  keyboard.querySelector('.hint').style.left = `${transposition*21}rem`
  releaseAll()()
  goMidBtn.className = transposition === 0 ? 'on': ''
  goUpBtn.className = Array.from(new Array(Math.max(transposition+1, 0)))
    .fill('').join('on')
  goDownBtn.className = Array.from(new Array(Math.max(-transposition+1, 0)))
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


// init mouse input
if (!('ontouchstart' in document.documentElement)) { // only for nontouch devices
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
    key.onselect = _()
    key.onselectstart = _()
  })
  keyboard.addEventListener('mouseover', releaseAll())
}

// init touch input 
if ('ontouchstart' in document.documentElement) { // only for touch devices
  const touchedKeys = []
  const keyFromTouchPoint = ({ clientX: x, clientY: y}) => {
    let key = document.elementFromPoint(x, y)
    while (key && !key.dataset.note) {
      key = key.parentElement
    }
    return key
  }
  keyboard.addEventListener('touchstart', _((e) => {
    ;[...e.targetTouches].forEach((touch, i) => {
      let key = keyFromTouchPoint(touch)
      if (key) {
        const { note } = key.dataset
        pressNote(note)(e)
        touchedKeys[i] = key
      }
    })
  }))
  keyboard.addEventListener('touchmove', _((e) => {
    ;[...e.targetTouches].forEach((touch, i) => {
      const key = keyFromTouchPoint(touch)
      if (key) {
        const { note } = key.dataset
        pressNote(note)(e)
      }
      if (touchedKeys[i] && key !== touchedKeys[i]) {
        const { note } = touchedKeys[i].dataset
        releaseNote(note)(e)
      }
      if (key) {
        touchedKeys[i] = key
      }
    })
  }))
  keyboard.addEventListener('touchend', _((e) => {
    ;[...e.changedTouches].forEach((touch, i) => {
      const key = keyFromTouchPoint(touch)
      if (touchedKeys[i]) {
        const { note } = touchedKeys[i].dataset
        releaseNote(note)(e)
      }
      touchedKeys[i] = null
    })
  }))
  keyboard.addEventListener('touchcancel', releaseAll())
}

// init keyboard input
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
})
window.addEventListener('keydown', e => {
  if (e.shiftKey || e.ctrlKey || e.metaKey) {
    return
  }
  const note = keyMap(transposition)[e.code]
  if (note) {
    pressNote(note)(e)
  }
})
window.addEventListener('keyup', e => {
  const note = keyMap(transposition)[e.code]
  if (note) {
    releaseNote(note)(e)
  }
})


// init MIDI input
const midiEl = document.getElementById('midi')
if (navigator.requestMIDIAccess) {
  console.log('This browser supports WebMIDI!')
  midiEl.innerText = 'supported'
  navigator.requestMIDIAccess()
    .then(onMIDISuccess, () => {
      console.log('Could not access your MIDI devices.')
      midiEl.innerText = 'access failed'
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

