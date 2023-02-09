
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
// eg: [0,3,7] => "Cm"; [2,5,8] =>  "Edim"
export function nameOfChord(chord) {
  const asc = (a,b) => a-b
  const roots = chord.sort(asc).map(n => n % 12)

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
    const baseChord = [...new Set(chord.map(n => ((n+12)-root)%12))].sort(asc)
  
    // console.log('chord', chord, baseChord)

    // https://en.wikipedia.org/wiki/Chord_notation#Common_types_of_chords
    const nameFunc = {
      [[0, 4, 7]]: r => r,  // major triad (C, Cmaj) (durový kvintakord)
      [[0, 3, 7]]: r => r + "m",  // minor triad (Cm, Cmi, C-) (mollový kvintakord)
      [[0, 4, 8]]: r => r + "aug",  // augmented triad (Caug, C+) (zvětšený kvintakord)
      [[0, 3, 6]]: r => r + "dim",  // diminished triad (Cdim, C°) (zmenšený kvintakord)

      [[0, 4, 7, 9]]: r => r + "<sup>6</sup>",  // major sixth (C6, C add13)
      [[0, 3, 7, 9]]: r => r + "min<sup>6</sup>",  // minor sixth (C6, Cmin add13)
      // ⁷
      [[0, 4, 7, 10]]: r => r + "<sup>7</sup>",  // dominant seventh (C7, Cdom7) (dominantní septakord)
      [[0, 4, 7, 11]]: r => r + "maj<sup>7</sup>",  // major seventh (Cmaj7, C∆7) (velký septakord)
      [[0, 3, 7, 10]]: r => r + "min<sup>7</sup>",  // minor seventh (Cmin7, Cm7, C-7) (malý molový septakord)
      [[0, 4, 8, 10]]: r => r + "aug<sup>7</sup>", // augmented seventh (Caug7, C+7) (zvětšený septakord)
      [[0, 3, 6, 9]]: r => r + "<sup>o7</sup>",  // diminished seventh (Cdim7, C°7) (zmenšený septakord)
      [[0, 3, 6, 10]]:  r => r + "<sup>ø7</sup>",  // half diminished seventh (Cø7, Cmin7dim5) (malý zmenšený septakord)
    }[baseChord] || null

    if (nameFunc) {
      return rootNote.map(nameFunc).join(' / ')
    }
  }
  return ""
}
