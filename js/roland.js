export const instruments = {
  "Pianos": [
    ["Grand Piano 1 (Concert)", "000000", 0, 68, 0],
    ["Grand Piano 2 (Ballad)", "000001", 16, 67, 0],
    ["Grand Piano 3 (Mellow)", "000002", 4, 64, 0],
    ["Grand Piano 4 (Bright)", "000003", 8, 66, 1],
    ["Ragtime Piano", "000004", 0, 64, 3],
    ["Harpsichord 1", "000005", 0, 66, 6],
    ["Harpsichord 2", "000006", 8, 66, 6],
  ],
  "E. Pianos": [
    ["E. Piano 1", "010000", 16, 67, 4],
    ["E. Piano 2", "010001", 0, 70, 5],
    ["E. Piano 3", "010002", 24, 65, 4],
    ["Clavinet", "010003", 0, 67, 7],  
    ["Vibraphone", "010004", 0, 0, 11],
    ["Celesta", "010005", 0, 0, 8],
  ],
  "Organs": [
    ["Organ Jazz 1", "020003", 0, 70, 18],
    ["Organ Jazz 2", "020004", 0, 69, 18],
    ["Organ Church 1", "020005", 0, 66, 19],
    ["Organ Church 2", "020006", 8, 69, 19],
    ["Accordion", "020007", 0, 68, 21],     
  ],
  "Strings": [
    ["Strings 1", "020000", 0, 71, 49],
    ["Strings 2", "020001", 0, 64, 48],
    ["Decay Strings", "02000F", 1, 65, 49],
    ["Harp", "020002", 0, 68, 46],         

    ["Guitar Nylon str.", "02000D", 0, 0, 24],     
    ["Guitar Steel str.", "02000E", 0, 0, 25],     
    ["Acoustic Bass", "020012", 0, 0, 32],         
    ["Acoustic Bass + Cymbl", "020013", 0, 66, 32],
    ["Fingered Bass", "020014", 0, 0, 33],         
  ],
  "Voices": [
    ["Choir 1", "020008", 8, 64, 52],    
    ["Choir 2", "02000A", 8, 66, 52],    
    ["Choir 3", "02000B", 8, 68, 52],    
    ["Decay Choir", "020010", 1, 64, 52],
    ["Jazz Scat", "020009", 0, 65, 54],
    ["Thum Voice", "020015", 0, 66, 53],
  ],
  "Synths": [
    ["Synth Pad", "02000C", 0, 64, 89],
    ["Decay Choir Pad", "020011", 1, 66, 89],
    ["Synth Bell", "010006", 0, 68, 98],     
  ],
}

const addrs = {
  // 010000xx
  serverSetupFileName:            "01000000",
  // 010001xx
  songToneLanguage:               "01000100",
  keyTransposeRO:                 "01000101",
  songTransposeRO:                "01000102",
  sequencerStatus:                "01000103",
  sequencerMeasure:               "01000105",
  sequencerTempoNotation:         "01000107",
  sequencerTempoRO:               "01000108", //
  sequencerBeatNumerator:         "0100010A",
  sequencerBeatDenominator:       "0100010B",
  sequencerPartSwAccomp:          "0100010C",
  sequencerPartSwLeft:            "0100010D",
  sequencerPartSwRight:           "0100010E",
  metronomeStatus:                "0100010F",
  headphonesConnection:           "01000110",
  // 010002xx
  keyBoardMode:                   "01000200", //
  splitPoint:                     "01000201", //
  splitOctaveShift:               "01000202",
  splitBalance:                   "01000203", //
  dualOctaveShift:                "01000204", 
  dualBalance:                    "01000205", //
  twinPianoMode:                  "01000206",
  toneForSingle:                  "01000207", //
  toneForSplit:                   "0100020A", //
  toneForDual:                    "0100020D", //
  songNumber:                     "01000210", 
  masterVolume:                   "01000213", //
  masterVolumeLimit:              "01000214",
  allSongPlayMode:                "01000215",
  splitRightOctaveShift:          "01000216",
  dualTone1OctaveShift:           "01000217",
  masterTuning:                   "01000218", //
  ambience:                       "0100021A", //
  headphones3DAmbience:           "0100021B",
  brilliance:                     "0100021C", //
  keyTouch:                       "0100021D", //
  transposeMode:                  "0100021E",
  metronomeBeat:                  "0100021F",
  metronomePattern:               "01000220",
  metronomeVolume:                "01000221", //
  metronomeTone:                  "01000222",
  metronomeDownBeat:              "01000223",
  // 010003xx
  applicationMode:                "01000300", //
  scorePageTurn:                  "01000302",
  arrangerPedalFunction:          "01000303",
  arrangerBalance:                "01000305",
  connection:                     "01000306", //
  keyTransposeWO:                 "01000307",
  songTransposeWO:                "01000308",
  sequencerTempoWO:               "01000309",
  tempoReset:                     "0100030B",
  // 010004xx
  soundEffect:                    "01000400",
  soundEffectStopAll:             "01000402",
  // 010005xx
  sequencerREW:                   "01000500",
  sequencerFF:                    "01000501",
  sequencerReset:                 "01000502",
  sequencerTempoDown:             "01000503",
  sequencerTempoUp:               "01000504",
  sequencerPlayStopToggle:        "01000505",
  sequencerAccompPartSwToggle:    "01000506",
  sequencerLeftPartSwToggle:      "01000507",
  sequencerRightPartSwToggle:     "01000508",
  metronomeSwToggle:              "01000509",
  sequencerPreviousSong:          "0100050A",
  sequencerNextSong:              "0100050B",
  // 010006xx
  pageTurnPreviousPage:           "01000600",
  pageTurnNextPage:               "01000601",
  // 010007xx
  uptime:                         "01000700",
  // 010008xx
  addressMapVersion:              "01000800",
}

const reqSizes = {
  [addrs.serverSetupFileName]: 32,
  // 010001xx
  [addrs.sequencerMeasure]: 2,
  [addrs.sequencerTempoRO]: 2,
  // 010002xx
  [addrs.toneForSingle]: 3,
  [addrs.toneForSplit]: 3,
  [addrs.toneForDual]: 3,
  [addrs.songNumber]: 3,
  [addrs.masterTuning]: 2,
  // 010003xx
  [addrs.arrangerPedalFunction]: 2,
  [addrs.sequencerTempoWO]: 2,
  // 010007xx
  [addrs.uptime]: 8,
}

const PREFIX = "411000000028"

export const parseMsg = (data) => {
  const match = byteArrayToStr(data).match(/^F0411000000028([0-9A-F]{2})([0-9A-F]{8})([0-9A-F]*)([0-9A-F]{2})F7$/)
  if (!match) {
    return {err: 'not a valid roland syses msg'} // not valid roland sysex msg
  }

  const [ _, mode, addr, hexval, checksum ] = match
  const value = _V(hexval)  

  const addrPair = Object.entries(addrs).find(([name, a]) => a === addr)
  const res =  {
    addr: addrPair ? addrPair[0] : addr,
    mode: {'11': 'req', '12': 'set'}[mode],
    hexval,
    value,
    checksum,
    err: '',
  }
  return res
}

const checkSum = (address, data) => {
  let total = strToByteArray(address + data).reduce((sum, byte) => (sum + byte), 0)
  return _H((128 - total % 128) & 0x7F)
}

const wrap = (mode, address, data) =>
  strToByteArray( `F0${PREFIX}${mode}${address}${data}${checkSum(address, data)}F7`)

const req = (address, size=reqSizes[address]||1) => 
  wrap("11", address, _H(size, 4))

const set = (address, data) => 
  wrap("12", address, data)

export const connect = () => [
  req(addrs.uptime),
  set(addrs.connection, _H(1)), // required for other set commands to work
  set(addrs.applicationMode, _H(0) + _H(1)), // required for responses to be returned

  req(addrs.addressMapVersion),
  req(addrs.masterVolume),
  req(addrs.metronomeVolume),
  req(addrs.metronomeStatus),
  req(addrs.sequencerTempoRO),

  req(addrs.keyTouch),
  req(addrs.ambience),
  req(addrs.brilliance),
  req(addrs.masterTuning),

  req(addrs.keyBoardMode),
  req(addrs.toneForSingle),
  req(addrs.toneForDual),
  req(addrs.toneForSplit),

  req(addrs.splitPoint),
]

export const setMasterVolume = (val) => set(addrs.masterVolume, _H(val))
export const setMetronomeVolume = (val) => set(addrs.metronomeVolume, _H(val))

export const checkHeadphones = () => req(addrs.headphonesConnection)


export const toggleMetronome = () => set(addrs.metronomeSwToggle, _H(0))


export const setMetronomeTempo = (val) => set(addrs.sequencerTempoWO, _H(val, 2))

export const setKeyPressure = (val) => set(addrs.keyTouch, _H(val))
export const checkKeyPressure = () => req(addrs.keyTouch)

export const setKeyboardMode = (mode) => set(addrs.keyBoardMode, _H(mode))
export const checkKeyboardMode = () => req(addrs.keyBoardMode)

export const setMasterTune = (value) => set(addrs.masterTuning, _H(value, 2))
export const checkMasterTune = () => req(addrs.masterTuning)

export const setAmbience = (value) => set(addrs.ambience, _H(value))
export const setBrilliance = (value) => set(addrs.brilliance, _H(value))

export const setSplitPoint = (value) => set(addrs.splitPoint, _H(value))
export const setSplitBalance = (value) => set(addrs.splitBalance, _H(value))
export const setDualBalance = (value) => set(addrs.dualBalance, _H(value))


export const setToneFor = (variant) => (tonecode) => set({
  single: addrs.toneForSingle,
  dual: addrs.toneForDual,
  split: addrs.toneForSplit,
}[variant], tonecode)


// conversion function

const _H = (number, bytes=1, bit8) => {
  const parts = [] // split by 7 (or 8) bits
  do {
    parts.unshift(number & (bit8 ? 255 : 127))
    number >>= (bit8 ? 8 : 7)
  } while (number > 0)
  const hex = parts.map(part => (part > 15 ? '' : '0') + part.toString(16)).join('')
  return (Array(bytes*2).join("0") + hex).slice(-bytes*2).toUpperCase()
}

const _V = (hex) => {
  const bytearray = strToByteArray(hex)
  return bytearray.reduce((val, part) => val * 128 + part, 0)
}

// "0001" => [0, 1]
const strToByteArray = (str) => {
  return new Uint8Array(str.split('').reduce((acc, _, i, arr) => {
    if (i % 2 === 0) {
      const h = parseInt(arr[i], 16)
      const l = parseInt(arr[i+1], 16)
      acc[i/2] =  h << 4 | l
    }
    return acc
  }, []))
}

// [0, 1] => "0001" 
const byteArrayToStr = (array) => {
  return [...array].map(i => _H(i, 1, true)).join('')
}


// CF15C_0001_GL  - server setup filename
// "1903000010010000" - modelId 