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

wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(message) {
    if (typeof message === "string") {
      if (message === 'ping') {
        ws.send('pong')
      }
      if (message.startsWith('autoplay')) {
        const [_, midiUrl] = message.split(' ', 2)
        console.log('midi autoplay requested', midiUrl)
        replayMidi(midiUrl)
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
const timers = []
async function replayMidi(url) {
  while (timers.length > 0) {
    clearTimeout(timers.pop())
  }
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
  const tracks = pickBestTracks(midi, 3)
  for (let track of tracks) {
    console.log(' - scheduling notes')
    track.notes.forEach(note => {
      timers.push(setTimeout(sendNoteOn, note.time*1000, note))
      timers.push(setTimeout(sendNoteOff, note.time*1000 + note.duration*1000, note))
    })
    console.log(` - will play ${track.notes.length} ${track.instrument.family} notes`)
  }
}

const sendNoteOn = (note) => {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(new Uint8Array([ROOT_GRP, ROOT_USR, 1, note.midi, Math.floor(note.velocity*127)]))
    }
  })
}

const sendNoteOff = (note) => {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(new Uint8Array([ROOT_GRP, ROOT_USR, 0, note.midi]))
    }
  })
}

// select n most piano-like track with most notes
const pickBestTracks = ({ tracks }, n=1) => {
  return tracks
    .filter(({ notes }) => notes.length > 0)
    .sort(({ instrument: iA, notes: nA }, { instrument: iB, notes: nB }) => {
      return (iA.number !== iB.number)
        ? iA.number - iB.number // less is better
        : nB.length - nA.length // more is better 
    })
    .slice(0, n)
}