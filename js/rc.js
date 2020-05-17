import {
  toCmd, fromCmd, toVal, fromVal,
  CMD_NOTE_ON, CMD_NOTE_OFF,
  CMD_PROGRAM, CMD_CONTROL_CHANGE,
  CC_BANK_0, CC_BANK_1, MID_C,
} from './midi.js'

const instrments = {
  "Pianos": [
    ["Grand Piano 1", 0, 68, 0],
    ["Grand Piano 2", 16, 67, 0],
    ["Grand Piano 3", 4, 64, 0],
    ["Grand Piano 4", 8, 66, 1],
    ["Ragtime Piano", 0, 64, 3], // +
    ["Harpsichord 1", 0, 66, 6],
    ["Harpsichord 2", 8, 66, 6],
  ],
  "E. Pianos": [
    ["E. Piano 1", 16, 67, 4],
    ["E. Piano 2", 0, 70, 5],
    ["E. Piano 3", 24, 65, 4], // +
    ["Clavinet", 0, 67, 7],   // +
    ["Vibraphone", 0, 0, 11],
    ["Celesta", 0, 0, 8], // +
  ],
  "Organs": [
    ["Organ Jazz 1", 0, 70, 18],
    ["Organ Jazz 2", 0, 69, 18], // +
    ["Organ Church 1", 0, 66, 19],
    ["Organ Church 2", 8, 69, 19], // +
    ["Accordion", 0, 68, 21],      // +
  ],
  "Strings": [
    ["Strings 1", 0, 71, 49],
    ["Strings 2", 0, 64, 48],
    ["Decay Strings", 1, 65, 49], // +
    ["Harp", 0, 68, 46],          // +

    ["Guitar Nylon str.", 0, 0, 24],      // +
    ["Guitar Steel str.", 0, 0, 25],      // +
    ["Acoustic Bass", 0, 0, 32],          // +
    ["Acoustic Bass + Cymbl", 0, 66, 32], // +
    ["Fingered Bass", 0, 0, 33],          // +
  ],
  "Voices": [
    ["Choir 1", 8, 64, 52],     // +
    ["Choir 2", 8, 66, 52],     // +
    ["Choir 3", 8, 68, 52],     // +
    ["Decay choir", 1, 64, 52], // +
    ["Jazz Scat", 0, 65, 54],
    ["Thum Voice", 0, 66, 53], // +
  ],
  "Synths": [
    ["Synth Pad", 0, 64, 89],
    ["Decay Choir Pad", 1, 66, 89], // +
    ["Synth Bell", 0, 68, 98],      // +
  ],
}
// init select
const instrmentSelector = document.getElementById('instrument-selector')
instrmentSelector.size = 1
Object.entries(instrments).forEach(([groupName, instrments]) => {
  const optGroup = document.createElement('optgroup')
  optGroup.label = groupName
  instrments.forEach(([name, ...val]) => {
    const option = document.createElement('option')
    option.value = val
    option.innerText = name
    optGroup.append(option)
    instrmentSelector.size++
  })
  instrmentSelector.size++
  instrmentSelector.append(optGroup)
})
instrmentSelector.onchange = (e) => {
  const [bankMSB, bankLSB, program] = e.target.value.split(',')
  write([toCmd(CMD_CONTROL_CHANGE), CC_BANK_0, bankMSB])
  write([toCmd(CMD_CONTROL_CHANGE), CC_BANK_1, bankLSB])
  write([toCmd(CMD_PROGRAM), program])
  playnote(MID_C)
}

const midiEl = document.getElementById('midi')

const devices = {
  input: {name: 'none'},
  output: {name: 'none'},
}
window.devices = devices

const write = (data, timestamp) => {
  devices.output.send(new Uint8Array(data), timestamp)
}

const playnote = (note) => {
  write([
    toCmd(CMD_NOTE_ON), note, toVal(.5),
  ], performance.now())
  write([
    toCmd(CMD_NOTE_OFF), note, 0,
  ], performance.now() + 250)
}

const setVolume = (volume) => { // 0 - 1
  write([toCmd(CMD_CONTROL_CHANGE), 7, toVal(volume)])
}

window.setVolume = setVolume


navigator.requestMIDIAccess({ sysex: false })
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
    input.onmidimessage = (e) => { console.log(e) }

    playnote(MID_C)
  }, () => {
    midiEl.className = 'alert alert-warning'
  })
