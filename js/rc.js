import * as R from "./roland.js"

const { instruments } = R

import {
  toCmd, fromCmd, toVal, fromVal, chanFromCmd,
  CMD_NOTE_ON, CMD_NOTE_OFF,
  CMD_PROGRAM, CMD_CONTROL_CHANGE,
  CC_BANK_0, CC_BANK_1, MID_C,
} from './midi.js'


/* init insrument selector */
const instrumentSelector = document.getElementById('instrument-selector')
instrumentSelector.size = 1
Object.entries(instruments).forEach(([groupName, instruments]) => {
  const optGroup = document.createElement('optgroup')
  optGroup.label = groupName
  instruments.forEach(([name, code, ...val]) => {
    const option = document.createElement('option')
    option.value = val
    option.dataset.code = code
    option.innerText = name
    optGroup.append(option)
    instrumentSelector.size++
  })
  instrumentSelector.size++
  instrumentSelector.append(optGroup)
})
instrumentSelector.onchange = (e) => {
  const [bankMSB, bankLSB, program] = e.target.value.split(',').map(Number)
  send([toCmd(CMD_CONTROL_CHANGE), CC_BANK_0, bankMSB])
  send([toCmd(CMD_CONTROL_CHANGE), CC_BANK_1, bankLSB])
  send([toCmd(CMD_PROGRAM), program])
  playnote(MID_C)
}

/* init volume */
let volume = 0

const volumeBar = document.getElementById('volume-bar')
const setVolume = (value) => {
  volume = Math.max(0, Math.min(value, 100))
  volumeBar['aria-valuenow'] = volume
  volumeBar.style.width = `${volume}%`
  volumeBar.innerText = `${volume}%`
}
const volumeDown = () => setVolume(volume-5)
const volumeUp = () => setVolume(volume+5)

volumeBar.parentElement.parentElement.onwheel = (e) => {
  const { deltaY } = e
  if (deltaY < 0) {
    volumeUp()
  } else {
    volumeDown()
  }
  send(R.setMasterVolume(volume))
}

/* init metronome */
let metronomeOn = false
const metronomeButton = document.getElementById('metronome-toggle')
const setMetronome = (on) => {
  metronomeOn = on
  if (on) {
    metronomeButton.classList.add('active')
  } else {
    metronomeButton.classList.remove('active')
  }
}
metronomeButton.onclick = () => {
  send(R.toggleMetronome())
}

let metronomeTempo = 0
const metronomeTempoInput = document.getElementById('metronome-tempo')
const setMetronomeTempo = (tempo) => {
  tempo = Math.max(10, Math.min(tempo, 400))
  metronomeTempo = tempo
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

/* init pressure */
let pressure = 0
const pressureButtons = [...document.querySelectorAll('input[name="pressure"]')]
const setPressure = (value) => {
  pressure = value
  pressureButtons.forEach(button => {
    button.checked = false
    button.parentElement.classList.remove('active')
  })
  const button = pressureButtons.find(button => +button.value === value)
  if (button) {
    button.checked = true
    button.parentElement.classList.add('active')
  }
}
pressureButtons.forEach(button => {
  button.onchange = () => {
    send(R.setKeyPressure(+button.value))
    send(R.checkKeyPressure())
  }
})


/* init midi */

const midiEl = document.getElementById('midi')

const devices = {
  input: {name: 'none'},
  output: {name: 'none'},
}

const send = (data, timestamp) => {
  console.log('send', data)
  devices.output.send(new Uint8Array(data), timestamp)
}

const playnote = (note, ch) => {
  send([toCmd(CMD_NOTE_ON, ch), note, toVal(.5)], performance.now())
  send([toCmd(CMD_NOTE_OFF, ch), note, 0], performance.now() + 250)
}

const init = async () => {
  for (let msg of R.connect()) {
    send(msg)
    await sleep(25)
  }
  playnote(MID_C)
}

navigator.requestMIDIAccess({ sysex: true })
  .then((midiAccess) => {
    const input = [...midiAccess.inputs.values()].find(({ name }) => name.includes('Roland Digital Piano'))
    const output = [...midiAccess.outputs.values()].find(({ name }) => name.includes('Roland Digital Piano'))
    if (!input || !output) {
      midiEl.innerHTML = 'No Roland digital piano detected'
      midiEl.className = 'alert alert-warning'
      return
    }
    devices.input = input
    devices.output = output

    midiEl.innerHTML = `in: ${input.name}<br/> out: ${output.name}`
    midiEl.className = 'alert alert-success'
    
    input.onstatechange = output.onstatechange = (e) => {
      console.log(e)
      const { state } = e.target
      if (state === 'disconnected') {
        devices[e.port.type] = { name: 'Disconnected' }
        midiEl.innerHTML = `in: ${devices.input.name}<br/> out: ${devices.output.name}`
        midiEl.className = 'alert alert-warning'
      }
      if (state === 'connected') {
        devices[e.port.type] = e.target
        midiEl.innerHTML = `in: ${devices.input.name}<br/> out: ${devices.output.name}`
        midiEl.className = 'alert alert-success'
      }
    }
    input.onmidimessage = (e) => {
      const logArea = document.getElementById('midi-log')
      let { type, timeStamp, data: [ cmd, ...rest ]} = e
      const time = (new Date(timeStamp)).toISOString().substr(11,12)
      if (cmd === 240) { // sysex
        const {addr, mode, value, hexval, err} = R.parseMsg(e.data)
        logArea.value += `${time} sysex\t ${mode} ${addr} - ${value} ${err}\n`
        if (addr === 'toneForSingle') {
          instrumentSelector.value = document.querySelector(`[data-code='${hexval}']`).value
        }
        if (addr === 'masterVolume') {
          setVolume(value)
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
      } else {
        logArea.value += `${time} ${type}\t #${chanFromCmd(cmd)}:${fromCmd(cmd)} ${rest.join(' ')}\n`
      }
      logArea.scrollTop = logArea.scrollHeight
      console.log(e)
    }

    // init roland driver
    init()
    
  }, () => {
    midiEl.className = 'alert alert-warning'
  })

document.getElementById('midi-log-clear').onclick = () => {
  document.getElementById('midi-log').value = ''
}


const sleep = async (t) => {
  return new Promise(resolve => {
    setTimeout(resolve, t)
  })
}

