const { Midi } = require('@tonejs/midi')
const fetch = require('node-fetch')
const WebSocket = require('ws')

const PORT = 11088
const { SSL_KEY, SSL_CA, SSL_CERT } = process.env

const ROOT_USR = 0
const ROOT_GRP = 0

let server
if (!SSL_KEY || !SSL_CA || !SSL_CERT) { // http
	server = require('http').createServer().listen(PORT, '0.0.0.0')
} else { // https
  console.log("using certificate", SSL_KEY)
	let fs = require('fs')
	server = require('https').createServer({
		key: fs.readFileSync(SSL_KEY),
		cert: fs.readFileSync(SSL_CERT),
		ca: fs.readFileSync(SSL_CA),
	}).listen(PORT)
}

const wss = new WebSocket.Server({ server })

const broadcast = (data) => {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(new Uint8Array(data))
    }
  })
}

wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(message) {
    if (typeof message === "string") {
      if (message === 'ping') {
        ws.send('pong')
      }
      if (message.startsWith('autoplay')) {
        const [_, midiUrl] = message.split(' ', 2)
        console.log('midi autoplay requested', midiUrl)
        replayMidi(midiUrl, ws)
      }
    } else {
      wss.clients.forEach(client => {
        if (ws !== client && client.readyState === WebSocket.OPEN) { // echo to others
          client.send(message)
        }
      })
    }
  })
  console.log('client connected')
  ws.send('connected')
})

console.log('listening on port', PORT)


// ** autoplay functionality ** //
const midis = {}
const timers = []
async function replayMidi(url, client) {
  if (!(url in midis)) {
    const res = await fetch(url).catch(e => {
      console.error(`failed to fetch ${url}\n${e.message}`)
    })
    if (!res) return
    const midiFile = await res.buffer().catch(e => {
      console.error(`failed to get data from fetched file ${url}\n${e}`)
    })
    let midi
    try {
      midi = new Midi(midiFile)
    } catch (e) {
      console.error(`failed to parse midi file ${url}\n${e}`)
      return
    }
    midis[url] = midi
  }
  askForTracks(midis[url], client)
}

const playTracks = (tracks) => {
  while (timers.length > 0) {
    clearTimeout(timers.shift())
  }
  for (let track of tracks) {
    console.log(' - scheduling notes')
    track.notes.forEach(note => {
      timers.push(setTimeout(sendNoteOn, note.time*1000, note))
      timers.push(setTimeout(sendNoteOff, note.time*1000 + note.duration*1000, note))
    })
    track.controlChanges.sustain.forEach(cc => {
      timers.push(setTimeout(sendSustain, cc.time*1000, cc.value))
    })
    console.log(` - will play ${track.notes.length} ${track.instrument.family} notes`)
  }
}


const sendSustain = (value) => {
  broadcast([ROOT_GRP, ROOT_USR, toCmd(3), 64, Math.floor(value*127)])
}

const sendNoteOn = (note) => {
  broadcast([ROOT_GRP, ROOT_USR, toCmd(1), note.midi, Math.floor(note.velocity*127)])
}

const sendNoteOff = (note) => {
  broadcast([ROOT_GRP, ROOT_USR, toCmd(0), note.midi])
}

const askForTracks = (midi, client) => {
  const tracksInfo = getTracks(midi)
    .map(({ instrument, notes }) => [instrument.number, notes.length].join(':'))
    .join(';')
  client.send(`auto?instrument ${tracksInfo}`)
  client.once('message', (message) => {
    if (typeof message === "string") {
      const [cmd, data] = message.split(' ')
      if (cmd === 'auto!') {
        const [url, selection] = data.split(';')
        const selectedIndexes = selection.split(',').map(Number)
        const midi = midis[url]
        const selectedTracks = getTracks(midi).filter((_, i) => selectedIndexes.includes(i))
        playTracks(selectedTracks)
      }
    }
  })
}

// select n most piano-like track with most notes
const pickBestTracks = (midi, n=1) => {
  return getTracks(midi).slice(0, n)
}

const getTracks = ({ tracks }) => (
  tracks
    .filter(({ notes }) => notes.length > 0)
    .sort(({ instrument: iA, notes: nA }, { instrument: iB, notes: nB }) => {
      return (iA.number !== iB.number)
        ? iA.number - iB.number // less is better
        : nB.length - nA.length // more is better 
    })
)


// TODO move to common file
const CC_BANK_0 = 0
const CC_BANK_1 = 32
const CC_SUTAIN = 64

const toCmd = (x) => (1<<3 | x)<<4
const fromCmd = (cmd) => (cmd>>4) & 7

const toVal = (x) => Math.round(x*127)
const fromVal = (val) => val/127
