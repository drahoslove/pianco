// settings
const defaultSettings = {
  labels: 0,
  qwerty: false,
  velocity: false,
  score: 1,
  cinema: false,
}

function removeHash () { 
  history.pushState("", document.title, window.location.pathname + window.location.search)
}

window.addEventListener('hashchange', () => {
  if (location.hash === '') {
    removeHash()
  }
})

const actions = {
  labels: (val) => {
    const keyboard = document.querySelector('.keyboard')
    keyboard.classList[val > 0 ? 'add' : 'remove']('letters')
    keyboard.classList[val > 1 ? 'add' : 'remove']('numbers')
  },
  qwerty: (val) => {
    const hintBox = document.querySelector('.hint')
    hintBox.hidden = !val
  },
  score: (val) => {
    const staffPaper = document.querySelector('.staff-paper')
    const staff1 = document.querySelector('.staff.treble')
    const staff2 = document.querySelector('.staff.bass')
    staffPaper.hidden = val === 0
    staff1.hidden = val < 1
    staff2.hidden = val < 2
  },
  velocity: (val) => {
    const keyboard = document.querySelector('.keyboard')
    keyboard.classList[val ? 'add' : 'remove']('velocity')
  },
  cinema: (val) => {
    document.body.parentElement.classList[val ? 'add' : 'remove']('cinema')
    // if (val) {
    //   if(!location.hash.includes('m')) {
    //     location.hash += 'm'
    //   }
    // } else {
    //   location.hash = location.hash.replace('m', '')
    //   if (location.hash === '') {
    //     removeHash()
    //   }
    // }
  },
}

function saveSetting(key, val) {
  let settings = {}
  try {
    settings = JSON.parse(
      localStorage.pianco || '{}'
    )
  } catch (e) {}
  settings[key] = val
  localStorage.pianco = JSON.stringify(settings)
}

function loadSetting(key) {
  let settings = {}
  try {
    settings = JSON.parse(
      localStorage.pianco || '{}'
    )
  } catch (e) {
    localStorage.pianco = JSON.stringify({})
  }
  return {
    ...defaultSettings,
    ...settings,
  }[key] 
}

if (location.hash.includes('m')) {
  saveSetting('cinema', true)
}

const setOnClass = (el, val) => {
  el.classList.remove('on', 'onon', 'ononon')
  if (val) {
    el.classList.add(Array.from(new Array(val)).fill('on').join(''))
  }
}

Object.keys(defaultSettings).forEach(key => {
  const button = document.getElementById(`toggle-${key}`)
  let val = loadSetting(key)
  setOnClass(button, +val)
  actions[key](val)
  button.onclick = function () {
    this.blur()
    val = loadSetting(key)
    if (['score', 'labels'].includes(key)) {
      val = (+val+1)%3
    } else {
      val = !val
    }
    setOnClass(button, +val)
    actions[key](val)
    saveSetting(key, val)
    this.blur()
  }
})


// do not show toggle qwerty hint button on mobile
const hintButton = document.getElementById('toggle-qwerty')
if (!('ontouchstart' in document.documentElement)) {
  hintButton.hidden = false
} else {
  saveSetting('qwerty', false) // to be sure
}



// cinema off
const cinemaOffButton = document.getElementById('cinema-off')
const offCinema = function () {
  this && this.blur()
  document.getElementById('toggle-cinema').classList.remove('on')
  actions.cinema(false)
  saveSetting('cinema', false)
  if (document.fullscreenElement !== null) {
    document.exitFullscreen()
    fullscreenButton.className = 'mdi mdi-fullscreen'
  }
}
cinemaOffButton.onclick = offCinema
window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape') {
    offCinema()
  }
})

// fullscreen on
const fullscreenButton = document.getElementById('fullscreen')
const toggleFullscreen = async function () {
  this && this.blur()
  if (document.fullscreenElement) {
    await document.exitFullscreen()
  } else {
    if (!loadSetting('cinema')) {
      actions.cinema(true)
    }
    await document.body.parentElement.requestFullscreen()
  }
  if (document.fullscreenElement !== null){
    fullscreenButton.className = 'mdi mdi-fullscreen-exit'
  } else {
    fullscreenButton.className = 'mdi mdi-fullscreen'
  }
}
fullscreenButton.onclick = toggleFullscreen
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyM') {
    toggleFullscreen()
  }
})



// init staff
const staffBoxes = [...document.querySelectorAll('.staff')]
const notes = [
  [
    'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4',
    'C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5',
    'C6',
  ],
  [
    'C2', 'D2', 'E2', 'F2', 'G2', 'A2', 'B2',
    'C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3',
    'C4',
  ],
]
staffBoxes.forEach((staffBox, j) => {
  const wholeNote = [...staffBox.children].pop()
  notes[j].forEach((ch, i) => {
    const hspace = 0.25
    const hoffset = 3.6
    const vspace = 0.125
    const voffset = (j === 0 ? -0.125 : +0.125)
    const note = wholeNote.cloneNode(true)
    note.dataset.note = ch
    note.style.top = (-i+3) * vspace + voffset  + 'em'
    note.style.right = i * -hspace + hoffset + 'em'
    staffBox.appendChild(note)
  
    if (j === 0 ? ch === 'C6' : ch === "C4") return
  
    const sharpNote = wholeNote.cloneNode(true)
    sharpNote.innerHTML = `♯&thinsp;` + sharpNote.innerText
    sharpNote.dataset.note = ch.split('').join('#')
    sharpNote.style.top = (-i+3) * vspace + voffset + 'em'
    sharpNote.style.right = i * -hspace + hoffset + 'em'
    staffBox.appendChild(sharpNote)
  })
  wholeNote.remove()
})



// orientation

const reorient = () => {
  const isPortrait = !!window.screen.orientation
    ? window.screen.orientation.type.includes('portrait')
    : window.screen.availHeight > window.screen.availWidth * 1.5
  if (isPortrait) {
    document.body.classList.add('rotated')
  } else {
    document.body.classList.remove('rotated')
  }
}

if (window.screen.orientation && window.screen.orientation.lock) {
  window.screen.orientation.lock('landscape').then(() => {
    console.log('Orienation changed')
  }, (err) => {
    if (err) { // fallback to css rotation
      window.onorientationchange = reorient
      reorient()
    }
  })
} else {
  window.onorientationchange = reorient
  reorient()
}

// mouse idle

let idleTimeout = 0
document.body.onmousemove = () => {
  document.body.classList.remove('idle')
  clearTimeout(idleTimeout)
  idleTimeout = setTimeout(() => {
    document.body.classList.add('idle')
  }, 2500)
}

;[...document.querySelectorAll('[title]')].forEach(el => {
  VueTippy.tippy(el, {
    content: el.title,
    delay: [500, 100],
    trigger: 'mouseenter',
    hideOnClick: false
  })
  el.dataset.title = el.title
  el.title=''
})

export const updateTooltip = (el, title, show) => {
  const { _tippy } = el
  if(!_tippy) {
    return console.log('no tippy', el)
  }
  _tippy.setContent(title)
  if (show) {
    _tippy.show()
    _tippy
    setTimeout(() => {
      try {
        _tippy.hideWithInteractivity()
      } catch (e) {
        _tippy.hide()
      }
    }, 1200)
  }
}

// instrument
const instrumentLabel = document.querySelector('#instrument-label')
const instrumentSelector = document.querySelector('#instrument')
instrumentSelector.onchange = (e) => {
  const { value } = e.target
  document.querySelector('#out-icon').className = {
    'sampledPiano': 'mdi mdi-piano',
    'polySynth': 'mdi mdi-sine-wave',
    'midiout': 'mdi mdi-midi',
  }[value] || 'mdi'
  updateTooltip(instrumentLabel, `out: ${instrumentSelector.value}`, true)
}

instrumentLabel.onmouseup = (e) => {
  const currentValue = instrumentSelector.value
  instrumentSelector.dispatchEvent(new Event('change', { bubbles: false }))
  if([...instrumentSelector.options].some(({ value, hidden }) => value === 'midiout' && hidden)) { // midi not enabled
    instrumentSelector.value = {
      'sampledPiano': 'polySynth',
      'polySynth': 'sampledPiano',
    }[currentValue] || 'none'
  } else { // midi enabled
    instrumentSelector.value ={
      'sampledPiano': 'polySynth',
      'polySynth': 'midiout',
      'midiout': 'sampledPiano'
    }[currentValue] || 'none'
  }
  instrumentSelector.dispatchEvent(new Event('change', { bubbles: true }))
}
