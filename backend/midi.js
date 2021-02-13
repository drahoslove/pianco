exports.CC_BANK_0 = 0
exports.CC_BANK_1 = 32
exports.CC_SUTAIN = 64
exports.NOTE_A0 = 21
exports.NOTE_C8 = 108

const CHANNEL = 1
// chan 3 is used for notes played by person, so we use 1 for notes played from replay to distuinguis them on frontend

exports.toCmd = (x, ch=CHANNEL) => (1<<3 | x)<<4 | (ch & 15)
exports.fromCmd = (cmd) => (cmd>>4) & 7

exports.toVal = (x) => Math.round(x*127)
exports.fromVal = (val) => val/127
