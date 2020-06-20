import '../lib/Tone.js'
import {
	toCmd,
	toVal,
	CMD_NOTE_ON,
	CMD_NOTE_OFF,
} from './midi.js'

Tone.context.latencyHint = 'fastest' // improve sheduling latency
Tone.context.lookAhead = 0.025

const pressedNotes = {}
const sustainedNotes = {}
const sustainState = {}

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

allNotes.forEach(note => {
	pressedNotes[note] = new Set()
	sustainedNotes[note] = new Set()
})


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
			if (instrumentSelector.value === 'none') {
				instrumentSelector.value = 'piano'
				instrumentSelector.dispatchEvent(new Event('change', { bubbles: true }))
			}
    },
    baseUrl : "/audio/salamander/",
  }).toMaster(),
  none: {
    triggerAttack: Tone.noOp,
    triggerRelease: Tone.noOp,
	},
	midiout: {
		triggerAttack: ([note], _, velocity) => {
			send([toCmd(CMD_NOTE_ON), Tone.Midi(note).toMidi(), toVal(velocity*0.75)])
		},
		triggerRelease: ([note]) => {
			send([toCmd(CMD_NOTE_OFF), Tone.Midi(note).toMidi(), 0])
		},
	}
}

// init midi output device
let output = null
const send = (data) => {
	output && output.send(new Uint8Array(data))
}
navigator.requestMIDIAccess && navigator.requestMIDIAccess().then((midiAccess) => {
  const reconnectOutputs = () => {
		for (let out of midiAccess.outputs.values()) {
			output = out
			console.log('MIDI out available:', out.name)
			instrumentSelector.value = 'midiout'
			instrumentSelector.dispatchEvent(new Event('change', { bubbles: true }))
			const option = [...instrumentSelector.options].find(({ value }) => value === 'midiout')
			if (option) {
				option.hidden = false
			}
		}
  }
  midiAccess.onstatechange = reconnectOutputs
  setTimeout(reconnectOutputs, 100)
})

// instrument selector
const instrumentSelector = document.getElementById('instrument')
instrumentSelector.onchange = function () { this.blur() }
const getInstrument = (source) => (source !== 'midiin' || instrumentSelector.value !== 'midiout') // if source is midi, we don't want to send play the note twice
	? instruments[instrumentSelector.value]
	: instruments.none

// volume controller
const volumeIcon = document.getElementById('volume-icon')
const volumeSelector = document.getElementById('volume')

const valToIcon = (value) =>
	(Tone.Master.mute && 'mdi mdi-volume-mute') ||
	(value > -15 && 'mdi mdi-volume-high') ||
	(value > -30 && 'mdi mdi-volume-medium') ||
	'mdi mdi-volume-low'

function updateVolume() {
  const value = +this.value
  Tone.Master.volume.value = value
  if (value === +this.min) {
		Tone.Master.mute = true
  } else {
		Tone.Master.mute = false
  }
	volumeIcon.className = valToIcon(value)
}
volumeIcon.onclick = () => {
  if (Tone.Master.mute) {
    Tone.Master.mute = false
    volumeSelector.disabled = false
  } else {
    Tone.Master.mute = true
    volumeSelector.disabled = true
  }
	volumeIcon.className = valToIcon(+volumeSelector.value)
}
volumeSelector.parentElement.onwheel = function (e) {
  const val =  Math.max(+this.min, Math.min(Math.sign(-e.deltaY) * +this.step + +this.value, +this.max))
  volumeSelector.value = val
  updateVolume.bind(this)(e)
}.bind(volumeSelector)
volumeSelector.oninput = updateVolume


/* ==== note controll === */

const updateNote = (note, velocity, action) => (source) => {
	const wasPressed = pressedNotes[note].size > 0
	const wasSustained = sustainedNotes[note].size > 0
	action()
	const isPressed = pressedNotes[note].size > 0
	const isSustained = sustainedNotes[note].size > 0

	if (!wasPressed && isPressed) {
		document.querySelectorAll(`[data-note="${note}"]`).forEach(({ classList }) => classList.add('pressed'))  
		if (isSustained) { // repressing sustained note
			releaseRect(note)
			getInstrument(source).triggerRelease([note])
		}
		addRect(note)
		getInstrument(source).triggerAttack([note], undefined, velocity)
	}
	if (wasPressed && !isPressed) {
		document.querySelectorAll(`[data-note="${note}"]`).forEach(({ classList }) => classList.remove('pressed'))
		if (!isSustained) {
			releaseRect(note)
			getInstrument(source).triggerRelease([note])
		}
	}
	if (!wasPressed && !isPressed && wasSustained && !isSustained) {
		releaseRect(note)
		getInstrument(source).triggerRelease([note])
	}
}

const pressNote = (note, velocity=0.6, uid) => updateNote(note, velocity, () => {
	pressedNotes[note].add(uid)
	if (sustainState[uid]) {
		sustainedNotes[note].add(uid)
	}
})

const releaseNote = (note, uid) => updateNote(note, undefined, () => {
	pressedNotes[note].delete(uid)
	if (!sustainState[uid]) {
		sustainedNotes[note].delete(uid) // unsustain note (if was sustained)
	}
})

const releaseAll = (uid) => () => {
  return allNotes.filter(note => {
    if (pressedNotes[note].has(uid)) {
			console.log('uid', uid)
      releaseNote(note, uid)()
      return true
    }
  })
}

const pressSustain = (uid) => {
	sustainState[uid] = true
	console.log('sustain ON')
}
const releaseSustain = (uid, source) => {
	sustainState[uid] = false
	console.log('sustain OFF')
	Object.entries(sustainedNotes).forEach(([note, noteset]) => {
		updateNote(note, undefined, () => {
			noteset.delete(uid)
		})(source)
	})
}

const allOff = () => {
	Object.keys(sustainState).forEach(uid => {
		sustainState[uid] = false
	})
	allNotes.forEach(note => {
		updateNote(note, undefined, () => {
			pressedNotes[note] = new Set()
			sustainedNotes[note] = new Set()
		})()
	})
}


function addRect(note) {
  const rect = document.createElement('div')
	const column = document.querySelector(`.pianoroll [data-note="${note}"]`)
	rect.className = "pressed"
  column.appendChild(rect)
}
function releaseRect(note) {
	const column = document.querySelector(`.pianoroll [data-note="${note}"]`)
	const rect = column.lastChild
	if (rect) {
		rect.className = "released"
		setTimeout(rect.remove.bind(rect), 15*1000)
	}
}


const instrumentById = [
	"acoustic grand piano",
	"bright acoustic piano",
	"electric grand piano",
	"honky-tonk piano",
	"electric piano 1",
	"electric piano 2",
	"harpsichord",
	"clavi",
	"celesta",
	"glockenspiel",
	"music box",
	"vibraphone",
	"marimba",
	"xylophone",
	"tubular bells",
	"dulcimer",
	"drawbar organ",
	"percussive organ",
	"rock organ",
	"church organ",
	"reed organ",
	"accordion",
	"harmonica",
	"tango accordion",
	"acoustic guitar (nylon)",
	"acoustic guitar (steel)",
	"electric guitar (jazz)",
	"electric guitar (clean)",
	"electric guitar (muted)",
	"overdriven guitar",
	"distortion guitar",
	"guitar harmonics",
	"acoustic bass",
	"electric bass (finger)",
	"electric bass (pick)",
	"fretless bass",
	"slap bass 1",
	"slap bass 2",
	"synth bass 1",
	"synth bass 2",
	"violin",
	"viola",
	"cello",
	"contrabass",
	"tremolo strings",
	"pizzicato strings",
	"orchestral harp",
	"timpani",
	"string ensemble 1",
	"string ensemble 2",
	"synthstrings 1",
	"synthstrings 2",
	"choir aahs",
	"voice oohs",
	"synth voice",
	"orchestra hit",
	"trumpet",
	"trombone",
	"tuba",
	"muted trumpet",
	"french horn",
	"brass section",
	"synthbrass 1",
	"synthbrass 2",
	"soprano sax",
	"alto sax",
	"tenor sax",
	"baritone sax",
	"oboe",
	"english horn",
	"bassoon",
	"clarinet",
	"piccolo",
	"flute",
	"recorder",
	"pan flute",
	"blown bottle",
	"shakuhachi",
	"whistle",
	"ocarina",
	"lead 1 (square)",
	"lead 2 (sawtooth)",
	"lead 3 (calliope)",
	"lead 4 (chiff)",
	"lead 5 (charang)",
	"lead 6 (voice)",
	"lead 7 (fifths)",
	"lead 8 (bass + lead)",
	"pad 1 (new age)",
	"pad 2 (warm)",
	"pad 3 (polysynth)",
	"pad 4 (choir)",
	"pad 5 (bowed)",
	"pad 6 (metallic)",
	"pad 7 (halo)",
	"pad 8 (sweep)",
	"fx 1 (rain)",
	"fx 2 (soundtrack)",
	"fx 3 (crystal)",
	"fx 4 (atmosphere)",
	"fx 5 (brightness)",
	"fx 6 (goblins)",
	"fx 7 (echoes)",
	"fx 8 (sci-fi)",
	"sitar",
	"banjo",
	"shamisen",
	"koto",
	"kalimba",
	"bag pipe",
	"fiddle",
	"shanai",
	"tinkle bell",
	"agogo",
	"steel drums",
	"woodblock",
	"taiko drum",
	"melodic tom",
	"synth drum",
	"reverse cymbal",
	"guitar fret noise",
	"breath noise",
	"seashore",
	"bird tweet",
	"telephone ring",
	"helicopter",
	"applause",
	"gunshot",
];

export {
  allNotes,
  pressNote,
  releaseNote,
	releaseAll,
	pressSustain,
	releaseSustain,
	instrumentById,
	allOff,
}
