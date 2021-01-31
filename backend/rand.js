const crypto = require('crypto')

const normalRand = (n) => {
  const normal = () => {
    let u = 0, v = 0;
    while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
    while(v === 0) v = Math.random();
    let num = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
    num = num / 10.0 + 0.5; // Translate to 0 -> 1
    if (num > 1 || num < 0) return normal(); // resample between 0 and 1
    return num;
  }
  return Math.floor(normal() * n)
}


const rand = (n) => Math.floor(Math.random() * n)

function randomString(n=8, chars='abcdefghijklmnopqrstuvwxyz234567') {
	const result = new Array(n)
	const randomBites = crypto.randomBytes(n)
	for (let i = 0, cursor = 0; i < n; i++) {
		cursor += randomBites[i]
		result[i] = chars[cursor % chars.length]
	}
	return result.join('')
}

module.exports = {
  rand,
  normalRand,
  randomString,
}