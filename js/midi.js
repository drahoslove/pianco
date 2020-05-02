
export const CC_BANK_0 = 0
export const CC_BANK_1 = 32
export const CC_SUTAIN = 64

export const toCmd = (x) => (1<<3 | x)<<4
export const fromCmd = (cmd) => (cmd>>4) & 7

export const toVal = (x) => Math.round(x*127)
export const fromVal = (val) => val/127