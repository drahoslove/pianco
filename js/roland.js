const addresses = {
  // 010000xx
  serverSetupFileName:            "01000000",
  // 010001xx
  songToneLanguage:               "01000100",
  keyTransposeRO:                 "01000101",
  songTransposeRO:                "01000102",
  sequencerStatus:                "01000103",
  sequencerMeasure:               "01000105",
  sequencerTempoNotation:         "01000107",
  sequencerTempoRO:               "01000108",
  sequencerBeatNumerator:         "0100010A",
  sequencerBeatDenominator:       "0100010B",
  sequencerPartSwAccomp:          "0100010C",
  sequencerPartSwLeft:            "0100010D",
  sequencerPartSwRight:           "0100010E",
  metronomeStatus:                "0100010F",
  headphonesConnection:           "01000110",
  // 010002xx
  keyBoardMode:                   "01000200",
  splitPoint:                     "01000201",
  splitOctaveShift:               "01000202",
  splitBalance:                   "01000203",
  dualOctaveShift:                "01000204",
  dualBalance:                    "01000205",
  twinPianoMode:                  "01000206",
  toneForSingle:                  "01000207",
  toneForSplit:                   "0100020A",
  toneForDual:                    "0100020D",
  songNumber:                     "01000210",
  masterVolume:                   "01000213",
  masterVolumeLimit:              "01000214",
  allSongPlayMode:                "01000215",
  splitRightOctaveShift:          "01000216",
  dualTone1OctaveShift:           "01000217",
  masterTuning:                   "01000218",
  ambience:                       "0100021A",
  headphones3DAmbience:           "0100021B",
  brilliance:                     "0100021C",
  keyTouch:                       "0100021D",
  transposeMode:                  "0100021E",
  metronomeBeat:                  "0100021F",
  metronomePattern:               "01000220",
  metronomeVolume:                "01000221",
  metronomeTone:                  "01000222",
  metronomeDownBeat:              "01000223",
  // 010003xx
  applicationMode:                "01000300",
  scorePageTurn:                  "01000302",
  arrangerPedalFunction:          "01000303",
  arrangerBalance:                "01000305",
  connection:                     "01000306",
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
  [addresses.serverSetupFileName]: 32,
  // 010001xx
  [addresses.sequencerMeasure]: 2,
  [addresses.sequencerTempoRO]: 2,
  // 010002xx
  [addresses.toneForSingle]: 3,
  [addresses.toneForSplit]: 3,
  [addresses.toneForDual]: 3,
  [addresses.songNumber]: 3,
  [addresses.masterTuning]: 2,
  // 010003xx
  [addresses.arrangerPedalFunction]: 2,
  [addresses.sequencerTempoWO]: 2,
  // 010007xx
  [addresses.uptime]: 8,
}


let send = null

const _H = (intData, length=2) =>
  (Array(length).join("0") + intData.toString(16)).slice(-length).toUpperCase()

const checkSum = (address, data) => {
  let total = strToByteArray(address + data).reduce((sum, byte) => (sum + byte), 0)
  return _H((128 - total % 128) & 0x7F)
}


const _write = (mode, address, data) => {
  if (!send) return
  // 12 = set data; 11 = request data
  const message = `F0411000000028${mode}${address}${data}${checkSum(address, data)}F7`
  send(strToByteArray(message))
}

const req = (address, size=_H(reqSizes[address]||1)) => {
  _write("11", address, size)
}
const set = (address, data) => {
  _write("12", address, data)
}

export const connect = (sender) => {
  if (send) return
  send = sender
  req(addresses.uptime)
  set(addresses.connection, _H(1)) // required for other set commands to work
  set(addresses.applicationMode, _H(0) + _H(1)) // required for responses to be returned
}

export const checkMetronome = () => {
  req(addresses.metronomeStatus)
}

export const checkHeadphones = () => {
  req(addresses.headphonesConnection)
}

export const toggleMetronome = () => {
  set(addresses.metronomeSwToggle, _H(0))
}
window.checkHeadphones = checkHeadphones

export const setMasterVolume = (val) => {
  const hexVal = _H(Math.floor(val*127))
  console.log('volumeval', hexVal)
  set(addresses.masterVolume, hexVal)
}

// conversion function

// "0001" => [0, 1]
const strToByteArray = (str) => {
  return new Uint8Array(str.split('').reduce((acc, char, i, arr) => {
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
  return [...array].map(_H).join('')
}


// CF15C_0001_GL  - server setup filename
// "1903000010010000" - modelId 