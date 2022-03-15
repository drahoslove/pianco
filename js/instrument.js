import {
	toCmd,
	toVal,
	CMD_NOTE_ON,
	CMD_NOTE_OFF,
	A0,
	C8,
	nameOfChord,
} from './midi.js'
import {
	instrumentApp
} from './vue/instrument.js'

Tone.setContext(new Tone.Context({
	latencyHint: 'interactive', // improve sheduling latency
	lookAhead: 0.025,
}))

const pressedNotes = {}
const sustainedNotes = {}
const sustainState = {}
let rectSustainMode = true // whether to render rects on sustain

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
  polySynth: new Tone.PolySynth(Tone.Synth, {
    envelope: {
      attack: 0.01,
      release: .5,
    }
  }).toDestination(),
  AMSynth: new Tone.AMSynth().toDestination(),
  FMSynth: new Tone.FMSynth().toDestination(),
  sampledPiano: new Tone.Sampler({
		urls: {
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
		},
		baseUrl: "/audio/salamander/",
    release: 1,
    onload: () => {
			console.log('piano samples loaded')
			if (instrumentApp.instrument === 'none') {
				instrumentApp.instrument = 'sampledPiano'
			}
    },
  }).toDestination(),
  none: {
    triggerAttack: () => {},
    triggerRelease: () => {},
	},
	midiout: {
		triggerAttack: (note, _, velocity) => {
			send([toCmd(CMD_NOTE_ON), Tone.Midi(note).toMidi(), toVal(velocity*0.75)])
		},
		triggerRelease: (note) => {
			send([toCmd(CMD_NOTE_OFF), Tone.Midi(note).toMidi(), 0])
		},
	}
}

const isBlacklistedDevice = ({ name }) => name.startsWith('AG0')

// init midi output device
let output = null
const send = (data) => {
	output && output.send(new Uint8Array(data))
}
navigator.requestMIDIAccess && navigator.requestMIDIAccess({ sysex: false })
	.then((midiAccess) => {
		const reconnectOutputs = () => {
			for (let out of midiAccess.outputs.values()) {
				if (isBlacklistedDevice(out)) {
					continue
				}
				output = out
				console.log('MIDI out available:', out.name)
				instrumentApp.instrument = 'midiout'
				instrumentApp.midiEnabled = true
			}
		}
		midiAccess.onstatechange = reconnectOutputs
		setTimeout(reconnectOutputs, 100)
	})
	.catch((err) => {
		console.log('midi out request failed', err)
	})


const getInstrument = (source) => {
	const isMidiLoop = (source === 'midiin' && instrumentApp.instrument === 'midiout')	
	// if source is midi, we don't want to send play the note twice
	return (
		!isMidiLoop && source !== "mutedIO"
	)
		? instruments[instrumentApp.instrument]
		: instruments.none
}

/* ==== note controll === */

// change color of key and actually play/stop the audio of the note
const updateNote = (note, velocity, action) => (source) => {
	if (!(note in pressedNotes)){
		return
	}
	const wasPressed = pressedNotes[note].size > 0
	const wasSustained = sustainedNotes[note].size > 0
	action()
	const isPressed = pressedNotes[note].size > 0
	const isSustained = sustainedNotes[note].size > 0

	if (!wasPressed && isPressed) {
		// style as pressed
		document.querySelectorAll(`[data-note="${note}"]`).forEach(({ classList, style }) => {
			source !== 'mutedIO' && classList.add('pressed')
			style.setProperty('--velocity', velocity)
		})  
		if (rectSustainMode && isSustained) { // repressing sustained note
			releaseRect(note, source)
			getInstrument(source).triggerRelease([note])
		}
		addRect(note, source)
		getInstrument(source).triggerAttack(note, "+0", velocity)
	}
	if (wasPressed && !isPressed) {
		// remove pressed styles
		document.querySelectorAll(`[data-note="${note}"]`).forEach(({ classList, style }) => {
			classList.remove('pressed')
			style.setProperty('--velocity', 0)
		})
		if (!isSustained) {
			getInstrument(source).triggerRelease(note, "+0.001")
		}
		if (!rectSustainMode || !isSustained) {
			releaseRect(note, source)
		}
	}
	if (wasSustained && !isSustained && !wasPressed && !isPressed) {
		releaseRect(note, source)
		getInstrument(source).triggerRelease(note, "+0.001")
	}
}

const pressNote = (note, velocity=0.5, uid) => updateNote(note, velocity, () => {
	pressedNotes[note].add(uid)
	// indicate which user played the note
	const userIcon = document.querySelector(`[data-uid="${uid}"]`)
	if (userIcon) {
		userIcon.classList.remove('active')
		setTimeout(() => {
			userIcon.classList.add('active')
		})
	}
	if (uid === 0) {
		updateHue(note)
	}
	updateChord()
})

const releaseNote = (note, uid) => updateNote(note, undefined, () => {
	pressedNotes[note].delete(uid)
	if (sustainState[uid]) {
		sustainedNotes[note].add(uid)
	} else {
		sustainedNotes[note].delete(uid) // probably redundant
	}
	const userIcon = document.querySelector(`[data-uid="${uid}"]`)
	if (userIcon) {
		userIcon.classList.add('active')
		setTimeout(() => {
			userIcon.classList.remove('active')
		})
	}
	updateChord()
})

const releaseAll = (uid) => (source) => {
  return allNotes.filter(note => {
    if (pressedNotes[note].has(uid)) {
      releaseNote(note, uid)(source)
      return true
    }
  })
}

const pressSustain = (uid, source) => {
	sustainState[uid] = true
	// console.log('sustain ON')
}
const releaseSustain = (uid, source) => {
	sustainState[uid] = false
	// console.log('sustain OFF')
	Object.entries(sustainedNotes).forEach(([note, noteset]) => { // release all sustained notes
		updateNote(note, undefined, () => {
			noteset.delete(uid)
		})(source)
	})
	if (uid === 0) {
		toggleRectSustainMode(source)
	}
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

function toggleRectSustainMode() {
	const isKeyShortcut = (
		(pressedNotes["A0"] && pressedNotes["A0"].has(0)) &&
		(pressedNotes["B0"] && pressedNotes["B0"].has(0))
	)
	if (isKeyShortcut) {
		rectSustainMode = !rectSustainMode
	}
}

function updateChord () {
	// get midi values of all pressed notes
	const notes = []
	Object.entries(pressedNotes).forEach(([note, noteset]) => {
		if (noteset.size > 0) {
			notes.push(Tone.Midi(note).toMidi())
		}
	})

	const chord = [...notes]
	const chordName = nameOfChord(chord)

	const el = document.getElementById('chord-name')
	if(!el) {
		return
	}
	if (chordName) {
		el.innerHTML = chordName
		el.classList.remove('fade')
	} else {
		el.classList.add('fade')
	}
}

function updateHue(note) {
	const isKeyShortcut = (
		(pressedNotes["A0"] && pressedNotes["A0"].has(0)) &&
		(pressedNotes["B0"] && pressedNotes["B0"].has(0))
	)
	if (isKeyShortcut) {
		const colorMode = {
			[A0 + 9]: [-120, .2],// MODE_WHITE_COLD,
			[A0 + 11]: [, 0],// MODE_WHITE,
			[A0 + 13]: [+60, .2],// MODE_WHITE_WARM,
			[A0 + 8]:  [, 1, 1/1], // MODE_RAINBOW_1,
			[A0 + 10]: [, 1, 1/2], // MODE_RAINBOW_2,
			[A0 + 12]: [, 1, 1/3], // MODE_RAINBOW_3,
			[A0 + 14]: [, 1, 1/4], // MODE_RAINBOW_4,
			...(Array(12).fill().reduce((obj, _, i) => ({
				...obj,
				[A0+15+i]: [(360/12)*i, 1, ],
			}), {})),
		}[Tone.Midi(note).toMidi()]
		if (colorMode) {
			const [ globalHue=0, globalSat=1, rate=0 ] = colorMode
			const keyboard = document.querySelector('.keyboard')
			keyboard.style.setProperty('--global-hue', globalHue)
			keyboard.style.setProperty('--global-sat', globalSat)
			keyboard.style.setProperty('--rainbow-rate', rate)
		}
	}
}


function addRect(note, source) {
	if (source === 'mutedIO') { return }
	const column = document.querySelector(`.pianoroll [data-note="${note}"]`)
  if (!column) { // document not fully loaded?
		return
	}
	const backRect = document.createElement('div')
	backRect.classList.add("pressed")
	backRect.classList.add("back")

	const frontRect = document.createElement('div')
	frontRect.classList.add("pressed")
	frontRect.classList.add("front")

	column.appendChild(backRect)
	column.appendChild(frontRect)
}
function releaseRect(note, source) {
	// if (source === 'mutedIO') return
	const column = document.querySelector(`.pianoroll [data-note="${note}"]`)
	if (!column) {
		return
	}
	Array.from(column.querySelectorAll('.pressed')).forEach(rect => {
		rect.classList.remove("pressed")
		rect.classList.add("released")
		setTimeout(rect.remove.bind(rect), 10*1000)
	})
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
