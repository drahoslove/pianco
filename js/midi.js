
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
// https://www.lotusmusic.com/lessonpix/chordprogessions/chordsymbol.jpg
export function nameOfChord(chord) {
  const roots = chord.sort().map(n => n % 12)

  for (let root of roots) {
    const rootNote = [
      ["C"],
      ["C♯", "D♭"],
      ["D"],
      ["D♯", "E♭"],
      ["E"],
      ["F"],
      ["F♯", "G♭"],
      ["G"],
      ["G♯", "A♭"],
      ["A"],
      ["A♯", "B♭"],
      ["B"],
    ][root]
    const baseChord = [...new Set(chord.map(n => ((n+12)-root)%12))].sort((a,b) => a-b)
  
    // console.log('chord', chord, baseChord)
    const nameFunc = {
      [[0, 4, 7]]: r => r,  // major (C, Cmaj) (česky dur)
      [[0, 3, 7]]: r => r + "m",  // minor (Cm, Cmi, C-) (česky moll)
      [[0, 3, 6]]: r => r + "dim",  // diminished (Cdim, C°) (česky zmenšená kvinta(?))

      [[0, 4, 7, 9]]: r => r + "6",  // major sixth (C6)
    
      [[0, 4, 7, 11]]: r => r + "maj7",  // major seventh (Cmaj7, C∆7)
      [[0, 4, 7, 10]]: r => r + "7",  // dominant seventh (C7, Cdom7)
      [[0, 3, 7, 10]]: r => r + "m7",  // minor seventh (Cm7, C-7)
      [[0, 3, 6, 9]]: r => r + "dim7",  // diminished seventh (Cdim7, C°7)
      [[0, 3, 6, 10]]:  r => r + "ø7",  // half diminished seventh (Cø, Cm7b)
    }[baseChord] || null

    if (nameFunc) {
      return rootNote.map(nameFunc).join(' / ')
    }
  }
	return ""
}
