import * as R from "./roland.js"
import '../lib/Tone.js'

const { instruments } = R

import {
  toCmd, fromCmd, toVal, fromVal, chanFromCmd,
  CMD_NOTE_ON, CMD_NOTE_OFF,
  CMD_PROGRAM, CMD_CONTROL_CHANGE,
  CC_BANK_0, CC_BANK_1, MID_C,
} from './midi.js'

$('[title]').tooltip()

/* init keyboard mode selector */
const tabs = [
  document.getElementById('single-tab'),
  document.getElementById('split-tab'),
  document.getElementById('dual-tab'),
  document.getElementById('twin-tab'),
]

tabs.forEach((tab, i) => {
  const mode = i
  tab.onclick = () => {
    send(R.setKeyboardMode(0)) // to prevent some glitches
    send(R.setKeyboardMode(mode))
    if (mode === 1) {
      send(R.checkSplitPoint())
      send(R.checkSplitBalance())
    }
    if (mode === 2) {
      send(R.checkDualBalance())
    }
    sliders.forEach(slider => {
      setTimeout(() => {
        // slider.refresh({ useCurrentValue: true })
      })
    })
  }
})

const selectKeyboardMode = (mode) => {
  $(tabs[mode]).tab('show')
}

/* init insrument selectors */
const [ setSingleInstrument, setDualInstrument, setSplitInstrument ] = ['single', 'dual', 'split'].map((variant, mode) => {
  const selectors = document.querySelectorAll(`#${variant}-instrument-selector`)
  for (const instrumentSelector of selectors) {
    instrumentSelector.size = 0
    Object.entries(instruments).forEach(([groupName, instruments]) => {
      const optGroup = document.createElement('optgroup')
      optGroup.label = groupName
      instruments.forEach(([name, code, ...val]) => {
        const option = document.createElement('option')
        option.value = code
        option.dataset.midival = val
        option.innerText = `${name}`
        optGroup.append(option)
        instrumentSelector.size++
      })
      instrumentSelector.size++
      instrumentSelector.append(optGroup)
    })
    instrumentSelector.onchange = async (e) => {
      const { value: hexcode } = e.target
      
      const option = instrumentSelector.querySelector(`[value='${hexcode}']`)
      const msg = R.setToneFor(variant)(hexcode)
      send(msg)
      if (option) {
        // this is only for preview will not change the note of 'single', because it is on channel 0 not 3
        const ch = 0
        const [bankMSB, bankLSB, program] = option.dataset.midival.split(',').map(Number)
        send([toCmd(CMD_CONTROL_CHANGE, ch), CC_BANK_0, bankMSB])
        send([toCmd(CMD_CONTROL_CHANGE, ch), CC_BANK_1, bankLSB])
        send([toCmd(CMD_PROGRAM, ch), program])
        playnote(MID_C, ch)
      }
    }
  }
  return (hexcode) => {
    selectors.forEach(instrumentSelector => {
      instrumentSelector.value = instrumentSelector.querySelector(`[value='${hexcode}']`).value
    })
  }
})

/* headphone jack indicatro */
const headphonesButton = document.querySelector('#headphones')
const setHeadphones = (on) => {
  const icon = headphonesButton.querySelector('.mdi')
  if (on) {
    icon.classList.remove('mdi-none')
    icon.classList.add('mdi-headphones')
  } else {
    icon.classList.remove('mdi-headphones')
    icon.classList.add('mdi-none')
  }
}

/* init volume */
const [ setMasterVolume, setMetronomeVolume ] = ['master', 'metronome'].map((variant) => {
  let volume = 0 // 0-100 or 0-10
  let max = variant === 'master' ? 100 : 6
  let step = variant === 'master' ? 5 : 1
  const toPercent = x => variant === 'metronome' ? x * 10 : x

  const volumeBar = document.getElementById(`${variant}-volume-bar`)
  const setVolume = (value) => {
    volume = Math.max(0, Math.min(value, max))
    volumeBar['aria-valuenow'] = volume
    volumeBar.style.width = `${toPercent(volume)}%`
    volumeBar.innerText = `${toPercent(volume)}%`
  }
  const volumeDown = () => setVolume(volume-step)
  const volumeUp = () => setVolume(volume+step)

  volumeBar.parentElement.parentElement.onwheel = (e) => {
    e.preventDefault()
    const { deltaY } = e
    if (deltaY < 0) {
      volumeUp()
    } else {
      volumeDown()
    }
    send({
      master: R.setMasterVolume(volume),
      metronome: R.setMetronomeVolume(volume),
    }[variant])
  }
  volumeBar.parentElement.onclick =
  volumeBar.parentElement.onmousemove =
   (e) => {
    const { offsetX, buttons, type } = e
    if (type === 'mousemove' && buttons !== 1)
      return
    let val = Math.round(100/5 * offsetX/volumeBar.parentElement.offsetWidth)*5
    if (variant === 'metronome') {
      val /= 10
    }
    setVolume(val)
    send({
      master: R.setMasterVolume(volume),
      metronome: R.setMetronomeVolume(volume),
    }[variant])
  }

  document.getElementById(`${variant}-volume-up`).onclick = volumeUp
  document.getElementById(`${variant}-volume-down`).onclick = volumeDown
  return setVolume
})

/* init metronome */
const metronomeButton = document.getElementById('metronome-toggle')
const metronomeVolumeBar = document.getElementById('metronome-volume-bar')
const setMetronome = (on) => {
  if (on) {
    $(metronomeButton).bootstrapToggle('on', true)
    metronomeVolumeBar.classList.add('bg-info')
  } else {
    $(metronomeButton).bootstrapToggle('off', true)
    metronomeVolumeBar.classList.remove('bg-info')
  }
}
$(metronomeButton).change(() => {
  send(R.toggleMetronome())
})

const metronomeTempoInput = document.getElementById('metronome-tempo')
const setMetronomeTempo = (tempo) => {
  tempo = Math.max(10, Math.min(tempo, 400))
  metronomeTempoInput.value = tempo
}
metronomeTempoInput.onchange = (e) => {
  const { value } = e.target
  send(R.setMetronomeTempo(+value))
}
[...document.querySelectorAll('[data-tempo]')].forEach(button => {
  button.onclick = () => {
    send(R.setMetronomeTempo(+button.dataset.tempo))
  }
})

/* init master tune */
const toPitch = (h) => (h-256)/10 + 440
const fromPitch = (p) => (+p - 440)*10 + 256
let masterTunePitch = 256
const mastterTunePitchInput = document.getElementById('master-tune')
const setMasterTunePitch = (value) => {
  if (toPitch(value) === 440 || toPitch(value) === 442) {

  } else if (value > masterTunePitch) {
    value = masterTunePitch + 1
  } else if (value < masterTunePitch) {
    value = masterTunePitch - 1
  }
  masterTunePitch = Math.max(10, Math.min(value, 512-1))
  const pitch = Math.max(toPitch(10), Math.min(toPitch(value), toPitch(512-1)))
  mastterTunePitchInput.value = pitch
}
mastterTunePitchInput.onchange = (e) => {
  const { value } = e.target
  setMasterTunePitch(fromPitch(value))
  send(R.setMasterTune(masterTunePitch))
  send(R.checkMasterTune())
}
[...document.querySelectorAll('[data-pitch]')].forEach(button => {
  button.onclick = () => {
    setMasterTunePitch(fromPitch(button.dataset.pitch))
    send(R.setMasterTune(masterTunePitch))
    send(R.checkMasterTune())
  }
})

/* init radio buttons */
const [
  setPressure,
  setKeyTranspose,
  setTwinPianoMode,
] = Object.entries({
  'pressure': (value) => {
    send(R.setKeyPressure(value))
    send(R.checkKeyPressure())
  },
  'key-transpose': (value) => {
    send(R.setKeyTranspose(value))
    send(R.checkKeyTranspose())
  },
  'twin-mode': (value) => {
    send(R.setTwinPianoMode(value))
    send(R.checkTwinPianoMode())
  }
}).map(([name, onchange]) => {
  const buttons = [...document.querySelectorAll(`input[name="${name}"]`)]
  buttons.forEach(button => {
    button.onchange = () => { onchange(+button.value) }
  })
  const setter = (value) => {
    buttons.forEach(button => {
      button.checked = false
      button.parentElement.classList.remove('active')
    })
    const button = buttons.find(button => +button.value === value)
    if (button) {
      button.checked = true
      button.parentElement.classList.add('active')
    }
  }
  return setter
})

/* init sliders */
const sliders = []
const [
  setAmbience,
  setBrilliance,
  setSplitPoint,
  setSplitBalance,
  setDualBalance,
] = [
  'ambience',
  'brilliance',
  'split-point',
  'split-balance',
  'dual-balance',
].map(variant => {
  let formatter = x => x
  if (variant === 'brilliance')
    formatter = x => x-64
  if (variant ===  'split-point')
    formatter = x => Tone.Midi(x+1).toNote()
  if (variant.includes('balance'))
    formatter = x => (x-=64, x < 0 ? `9:${9+x}` : `${9-x}:9`)

  const slider = new Slider(`#${variant}-slider`, { tooltip: true, formatter })
  const updateOpacity = (value) => {
    if (!variant.includes('balance'))
      return
    const x = value - 64
    const left = x < 0 ? 9 : 9-x
    const right = x > 0 ? 9 : 9+x
    let tabEl = slider.element
    while (tabEl && tabEl.getAttribute('role') !== 'tabpanel') {
      tabEl = tabEl.parentElement
    }
    if (tabEl) {
      tabEl.style.setProperty('--lefto', left/9)
      tabEl.style.setProperty('--righto', right/9)
    }
  }

  const setValue = (value) => {
    slider.setValue(value)
    updateOpacity(value)
  }
  slider.on('change', ({ newValue }) => {
    send({
      'ambience': R.setAmbience,
      'brilliance': R.setBrilliance,
      'split-point': R.setSplitPoint,
      'split-balance': R.setSplitBalance,
      'dual-balance': R.setDualBalance,
    }[variant](+newValue))
    updateOpacity(newValue)
    // playnote(MID_C)
  })
  sliders.push(slider)
  return setValue
})


/**** init midi ****/

const devices = {
  input: {name: 'none'},
  output: {name: 'none'},
}

const send = (data, timestamp) => {
  if (!devices.output.send) { return }
  devices.output.send(new Uint8Array(data), timestamp)
}

const playnote = (note, ch) => {
  send([toCmd(CMD_NOTE_ON, ch), note, toVal(.5)], performance.now())
  send([toCmd(CMD_NOTE_OFF, ch), note, toVal(.2)], performance.now() + 500)
}

document.getElementById('midi-log-clear').onclick = () => {
  document.getElementById('midi-log').value = ''
}

const midiEl = document.getElementById('midi')
const midiButton = document.getElementById('midi-button')
const setMidiStatus = (isOn, statusText) => {
  midiEl.innerHTML = statusText
  // midiButton.title = statusText
  if (isOn) {
    midiEl.className = 'alert alert-success'
    midiButton.classList.add('text-info')
    midiButton.classList.remove('text-white-50')
  } else {
    midiEl.className = 'alert alert-warning'
    midiButton.classList.remove('text-info')
    midiButton.classList.add('text-white-50')
  }
  $(midiButton).attr('data-original-title', statusText)
}

const connectMidi = async () => {
  if (devices.input && devices.input.state === 'connected') {
    return
  }
  const midiAccess = await navigator.requestMIDIAccess({ sysex: true })
    .catch(() => {
      setMidiStatus(false, '')
    })
  const input = [...midiAccess.inputs.values()].find(({ name }) => name.includes('Roland Digital Piano') || name.includes('FP-'))
  const output = [...midiAccess.outputs.values()].find(({ name }) => name.includes('Roland Digital Piano') || name.includes('FP-'))
  if (!input || !output) {
    setMidiStatus(false, 'No Roland digital piano detected')
    return
  }
  devices.input = input
  devices.output = output

  setMidiStatus(true, `in: ${input.name} | out: ${output.name}`)
  
  input.onstatechange = output.onstatechange = (e) => {
    console.log(e)
    const { state } = e.target
    if (state === 'disconnected') {
      devices[e.port.type] = { name: 'Disconnected' }
      setMidiStatus(false, `in: ${devices.input.name} <br> out: ${devices.output.name}`)
    }
    if (state === 'connected') {
      devices[e.port.type] = e.target
      setMidiStatus(true, `in: ${devices.input.name} <br> out: ${devices.output.name}`)
    }
  }
  input.onmidimessage = onMidiMessage

  // init roland driver
  $(async () => {
    for (let msg of R.connect()) {
      send(msg)
      await sleep(25)
    }
  })
}

midiButton.onclick = connectMidi

function onMidiMessage (e) {
  const logArea = document.getElementById('midi-log')
  let { type, timeStamp, data: [ cmd, ...rest ]} = e
  const time = (new Date(timeStamp)).toISOString().substr(11,12)
  if (cmd === 240) { // sysex
    const {addr, mode, value, hexval, err} = R.parseMsg(e.data)
    logArea.value += `${time} sysex\t ${mode} ${addr} - ${value} (${hexval}) ${err}\n`
    if (addr === 'toneForSingle') {
      setSingleInstrument(hexval.substr(0,6))
    }
    if (addr === 'toneForDual') {
      setDualInstrument(hexval.substr(0,6))
    }
    if (addr === 'toneForSplit') {
      setSplitInstrument(hexval.substr(0,6))
    }
    if (addr === 'headphonesConnection') {
      setHeadphones(Boolean(value))
    }
    if (addr === 'masterVolume') {
      setMasterVolume(value)
    }
    if (addr === 'metronomeVolume') {
      setMetronomeVolume(value)
    }
    if (addr === 'metronomeStatus') {
      setMetronome(Boolean(value))
    }
    if (addr === 'sequencerTempoRO') {
      setMetronomeTempo(value)
    }
    if (addr === 'keyTouch') {
      setPressure(value)
    }
    if (addr === 'masterTuning') {
      setMasterTunePitch(value)
    }
    if (addr === 'keyTransposeRO') {
      setKeyTranspose(value)
    }
    if (addr === 'ambience') {
      setAmbience(value)
    }
    if (addr === 'brilliance') {
      setBrilliance(value)
    }
    if (addr === 'splitPoint') {
      setSplitPoint(value)
    }
    if (addr === 'splitBalance') {
      setSplitBalance(value)
    }
    if (addr === 'dualBalance') {
      setDualBalance(value)
    }
    if (addr === 'twinPianoMode') {
      setTwinPianoMode(value)
    }
    if (addr === 'keyBoardMode') {
      const mode = parseInt(hexval.substr(0,2), 16)
      const singleInstrument = (hexval.substr(14,6))
      const splitInstrument = (hexval.substr(20,6))
      const dualInstrument = (hexval.substr(26,6))
      selectKeyboardMode(mode)
      singleInstrument && setSingleInstrument(singleInstrument)
      splitInstrument && setSplitInstrument(splitInstrument)
      dualInstrument && setDualInstrument(dualInstrument)
    }
  } else {
    logArea.value += `${time} ${type}\t #${chanFromCmd(cmd)}:${fromCmd(cmd)} ${rest.join(' ')}\n`
  }
  logArea.scrollTop = logArea.scrollHeight
  console.log(e)
}

// connect midi
$(connectMidi)

// help functions
const sleep = async (t) => {
  return new Promise(resolve => {
    setTimeout(resolve, t)
  })
}
