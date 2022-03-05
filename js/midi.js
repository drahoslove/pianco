
export const CMD_NOTE_OFF = 0
export const CMD_NOTE_ON = 1
export const CMD_CONTROL_CHANGE = 3
export const CMD_PROGRAM = 4

export const CC_BANK_0 = 0
export const CC_BANK_1 = 32
export const CC_SUTAIN = 64

export const MID_C = 60
export const A0 = 21
export const C8 = 108


export const CHANNEL = 3 // this is what roland actually uses as output
// 1=piano,  2,3=main layer, 9=silent, rest=piano

export const toCmd = (x, ch=CHANNEL) => (1<<3 | x)<<4 | (ch & 15)
export const fromCmd = (cmd) => (cmd>>4) & 7
export const chanFromCmd = (cmd) => cmd & 0x0F

export const toVal = (x) => Math.round(x*127)
export const fromVal = (val) => val/127



// takes array of uniq note values (c=0)
// returns symbolic name of the chord
// eg: [0,3,7] => "Cm"; [2,5,8] =>  "Ddim"

export function nameOfChord(chord) {
  const roots = []
  roots.push(chord[0] % 12) // lowest note played
  roots.push([...chord].map(n => n % 12).sort()[0]) // lowest note in octave

  for (let root of roots) {
    const rootNote = ["C", "C#", "D", "D#", "E", "F", "F#" , "G", "G#", "A", "A#", "B"][root]
    const baseChord = [...new Set(chord.map(n => ((n+12)-root)%12))].sort((a,b) => a-b)
    const chordEq = (a, b) => String(a) === String(b)
  
    // console.log('chord', chord, baseChord)
  
    if (chordEq(baseChord, [0, 4, 7])) { // major (C, Cmaj) (česky dur)
      return rootNote
    }
    if (chordEq(baseChord, [0, 3, 7])) { // minor (Cm, Cmi, C-) (česky moll)
      return rootNote + "m"
    }
    if (chordEq(baseChord, [0, 3, 6])) { // diminished (Cdim, C°) (česky zmenšená kvinta(?))
      return rootNote + "dim"
    }
  
  
    if (chordEq(baseChord, [0, 4, 7, 9])) { // major sixth (C6)
      return rootNote + "6"
    }
  
  
    if (chordEq(baseChord, [0, 4, 7, 11])) { // major seventh (Cmaj7, C∆7)
      return rootNote + "maj7"
    }
    if (chordEq(baseChord, [0, 4, 7, 10])) { // dominant seventh (C7, Cdom7)
      return rootNote + "7"
    }
    if (chordEq(baseChord, [0, 3, 7, 10])) { // minor seventh (Cm7, C-7)
      return rootNote + "m7"
    }
    if (chordEq(baseChord, [0, 3, 5, 9])) { // diminished seventh (Cdim7, C°7)
      return rootNote + "dim7"
    }
    if (chordEq(baseChord, [0, 3, 5, 10])) { // half diminished seventh (Cø, Cm7b)
      return rootNote + "ø7"
    }
  }

	return ""
}