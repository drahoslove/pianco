import {
  instruments,
  connect,
  parseMsg,
  toggleMetronome, setMasterVolume,
} from "./roland.js"

import {
  toCmd, fromCmd, toVal, fromVal, chanFromCmd,
  CMD_NOTE_ON, CMD_NOTE_OFF,
  CMD_PROGRAM, CMD_CONTROL_CHANGE,
  CC_BANK_0, CC_BANK_1, MID_C,
} from './midi.js'


// init select
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

const midiEl = document.getElementById('midi')

const devices = {
  input: {name: 'none'},
  output: {name: 'none'},
}
window.devices = devices

const send = (data, timestamp) => {
  devices.output.send(new Uint8Array(data), timestamp)
}

const playnote = (note, ch) => {
  send([toCmd(CMD_NOTE_ON, ch), note, toVal(.5)], performance.now())
  send([toCmd(CMD_NOTE_OFF, ch), note, 0], performance.now() + 250)
}


const identityReq = () => {
  write([ 0xF0, 0x7E,, 0x10,, 0x06,, 0x01, 0xF7 ])
}
window.identityReq = identityReq

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
        const {addr, mode, value, err} = parseMsg(e.data)
        logArea.value += `${time} sysex\t ${mode} ${addr} - ${value} ${err}\n`
        if (addr === 'toneForSingle') {
          instrumentSelector.value = document.querySelector(`[data-code='${value}']`).value
        }
      } else {
        logArea.value += `${time} ${type}\t #${chanFromCmd(cmd)}:${fromCmd(cmd)} ${rest.join(' ')}\n`
      }
      logArea.scrollTop = logArea.scrollHeight
      console.log(e)
    }

    // init roland driver
    connect().forEach(send)
    playnote(MID_C)
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

