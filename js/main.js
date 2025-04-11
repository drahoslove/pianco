import './vue/init.js'
import './vue/networking.js'
import { instrumentApp } from './vue/instrument.js'
import './vue/recorder.js'
import {
  instrumentById, isBlacklistedDevice,
} from './instrument.js'
import {
  sendNoteOn as pressNote,
  sendNoteOff as releaseNote,
  sendSustain as sustain,
  sendOffAll as releaseAll,
} from './io.js'
import {
  fromCmd, fromVal,
  CMD_NOTE_ON, CMD_NOTE_OFF, CMD_CONTROL_CHANGE, CMD_PROGRAM,
} from './midi.js'
import './ui.js'

let transposition = 0

const _ = cb => e => {
  e.preventDefault()
  if (['mousedown', 'touchstart'].includes(e.type)) {
    window.focus()
  }
  cb && cb(e)
  return false
}

// create keys
const keyboard = document.querySelector('.keyboard')

const keys = [...keyboard.querySelectorAll('.bottom-keys>button, .top-keys>button')]


// init sustain controll
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !e.repeat) sustain(1)
})
window.addEventListener('keyup', (e) => {
  if (e.code === 'Space') sustain(0)
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
  releaseAll()("shift")
  goMidBtn.className = transposition === 0 ? 'on': ''
  goUpBtn.className = Array.from(new Array(Math.max(+transposition, 0)))
    .fill('on').join('')
  goDownBtn.className = Array.from(new Array(Math.max(-transposition, 0)))
    .fill('on').join('')
}
const goBottom = () => setTransposition(-3)
const goDown = () => setTransposition(transposition-1)
const goMid = () => setTransposition(0)
const goUp = () => setTransposition(transposition+1)
const goTop = () => setTransposition(+3)

goUpBtn.onclick = goUp
goDownBtn.onclick = goDown
goMidBtn.onclick = goMid
window.addEventListener('keydown', (e) => {
  switch(e.code) {
    case 'ArrowRight':
    case 'KeyN':
      return goUp()
    case 'ArrowLeft':
    case 'KeyV':
      return goDown()
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
    key.addEventListener('mousedown', _((e) => {
      if (e.button === 0) pressNote(note)("mouse")
    }))
    key.addEventListener('mouseup', _((e) => {
      if (e.button === 0) releaseNote(note)("mouse")
    }))
    key.addEventListener('mouseenter', _((e) => {
      if (e.buttons & 1 === 1) pressNote(note)("mouse")
    }))
    key.addEventListener('mouseleave', _((e) => {
      if (e.buttons & 1 === 1) releaseNote(note)("mouse")
    }))
    key.onselect = _()
    key.onselectstart = _()
  })
  keyboard.addEventListener('mouseout', _(e => {
    if (e.target === keyboard) {
      releaseAll()("mouse")
    }
  }))
}

// init touch input 
if ('ontouchstart' in document.documentElement) { // only for touch devices
  const keysByTouches = {}
  const keyFromTouchPoint = ({ clientX: x, clientY: y}) => {
    let key = document.elementFromPoint(x, y)
    while (key && !key.dataset.note) {
      key = key.parentElement
    }
    return key
  }
  keyboard.addEventListener('touchstart', _((e) => {
    ;[...e.targetTouches].forEach((touch) => {
      let key = keyFromTouchPoint(touch)
      if (key) {
        const { note } = key.dataset
        pressNote(note)("touch")
        keysByTouches[touch.identifier] = key
      }
    })
  }), {passive: true})
  keyboard.addEventListener('touchmove', _((e) => {
    ;[...e.targetTouches].forEach((touch) => {
      const id = touch.identifier
      const key = keyFromTouchPoint(touch)
      if (key) {
        const { note } = key.dataset
        pressNote(note)("touch")
      }
      if (keysByTouches[id] && key !== keysByTouches[id]) {
        const { note } = keysByTouches[id].dataset
        setTimeout(() => {
          releaseNote(note)("touch")
        }, 50)
      }
      if (key) {
        keysByTouches[id] = key
      }
    })
  }), {passive: true})
  keyboard.addEventListener('touchend', _((e) => {
    ;[...e.changedTouches].forEach((touch, i) => {
      const id = touch.identifier
      const key = keyFromTouchPoint(touch)
      if (keysByTouches[id]) {
        const { note } = keysByTouches[id].dataset
        setTimeout(() => {
          // touchend is too usually too fast compared to keyup
          // so we will let the note to sound a bit longer
          releaseNote(note)("touch")
        }, 100)
      }
      keysByTouches[id] = null
    })
  }), {passive: true})
  keyboard.addEventListener('touchcancel', (e) => {
    releaseAll()("touch")
  }, {passive: true})
}

// special cases
document.addEventListener('visibilitychange', (e) => { // release all when
  if (document.visibilityState !== 'visible') {
    releaseAll()('visibilitychange')
  }
})
window.addEventListener('beforeunload', (e) => {
  releaseAll()('beforeunload')
})
window.addEventListener('blur', (e) => {
  releaseAll()('blur')
})

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
  if (e.shiftKey || e.ctrlKey || e.metaKey || e.repeat) {
    return
  }
  const note = keyMap(transposition)[e.code]
  if (note) {
    pressNote(note)("keyboard")
  }
})
window.addEventListener('keyup', e => {
  const note = keyMap(transposition)[e.code]
  if (note) {
    releaseNote(note)("keyboard")
  }
})


// init MIDI INPUT (no output)
const midiEl = document.querySelector('#midi') || {}
const reloadMidi = (isFrist) => {
  if (navigator.requestMIDIAccess) {
    console.log('This browser supports Web MIDI!')
    instrumentApp.midiTooltip = 'MIDI in: supported'
    midiEl.className="unknown"
    navigator.requestMIDIAccess({ sysex: false })
      .then(onMIDISuccess(isFrist === true))
      .catch((err) => {
        console.error(`Could not access your MIDI devices. ${err}`)
        instrumentApp.midiTooltip = 'MIDI in: failed'
        midiEl.className="err"
      })
  } else {
    console.warn('WebMIDI is not supported in this browser.')
    instrumentApp.midiTooltip = 'MIDI in: not supported'
    midiEl.className="err"
  }
}
midiEl.onclick = reloadMidi
reloadMidi(true)


function onMIDISuccess(isFirst) {
  return (midiAccess) => {
    const reconnectInputs = (e) => {
      const inputs = [...midiAccess.inputs.values()]
        .filter(input => !isBlacklistedDevice(input))
        .filter(input => input.state === 'connected')
      if (!inputs.length) {
        midiEl.className =  "none"
        instrumentApp.midiEnabled = false
        instrumentApp.midiTooltip = 'MIDI in: none'
      } else {
        instrumentApp.midiTooltip = `MIDI in: ${inputs.map((i) => i.name).join("<br>")}`
        instrumentApp.midiEnabled = true
        midiEl.className = "on"
        inputs.forEach((input) => {
          input.onmidimessage = handleMIDIMessage
          console.log('midi input connected', input.name)
        })
      }
    }
    midiAccess.onstatechange = reconnectInputs
    setTimeout(reconnectInputs, 100)
  }
}

let bankSelect = [0, 0]

function handleMIDIMessage(midiMessage) {
  const { data } = midiMessage
  const [cmd, val1, val2 = 0] = data

  const note = Tone.Midi(val1).toNote()

  switch (fromCmd(cmd)) {
    case CMD_NOTE_ON: { 
      const velocity = fromVal(val2)
      if (velocity > 0) {
        pressNote(note, velocity)("midiin")
      } else {
        releaseNote(note)("midiin")
      }
      break;
    }
    case CMD_NOTE_OFF: // noteOff
      releaseNote(note)("midiin")
      break;
    case CMD_CONTROL_CHANGE: {// control change
      const [_, control, value] = data
      if (control === 0) { // msb of bank
        bankSelect[0] = value
      } else if (control === 32) { // lsb
        bankSelect[1] =  value
      } else if (control === 64) { // sustain
        sustain(fromVal(value), "midiin")
      }
      break;
    }
    case CMD_PROGRAM: {// program (sound) change
      const [_, programId] = data
      console.log('program', instrumentById[programId] || programId, 'from bank', bankSelect)
      break;
    }
    default:
      console.log('unknown midi data', data, fromCmd(cmd))
  }
}

