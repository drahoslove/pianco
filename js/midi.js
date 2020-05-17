
export const CMD_NOTE_OFF = 0
export const CMD_NOTE_ON = 1
export const CMD_CONTROL_CHANGE = 3
export const CMD_PROGRAM = 4

export const CC_BANK_0 = 0
export const CC_BANK_1 = 32
export const CC_SUTAIN = 64

export const MID_C = 60

const CHANNEL = 3 // this is what roland actually uses

export const toCmd = (x) => (1<<3 | x)<<4 | CHANNEL
export const fromCmd = (cmd) => (cmd>>4) & 7

export const toVal = (x) => Math.round(x*127)
export const fromVal = (val) => val/127