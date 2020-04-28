
// settings
const defaultSettings = {
  labels: true,
  qwerty: false,
  score: 0,
  cinema: false,
}

const actions = {
  labels: (val) => {
    const keyboard = document.querySelector('.keyboard')
    keyboard.classList[val ? 'add' : 'remove']('letters')
  },
  qwerty: (val) => {
    const hintBox = document.querySelector('.hint')
    hintBox.hidden = !val
  },
  score: (val) => {
    const staffBox = document.querySelector('.staff')
    staffBox.hidden = !val
  },
  cinema: (val) => {
    document.body.parentElement.classList[val ? 'add' : 'remove']('cinema')
  },
}

function saveSetting(key, val) {
  let settings = {}
  try {
    settings = JSON.parse(
      localStorage.pianinous || '{}'
    )
  } catch (e) {}
  settings[key] = val
  localStorage.pianinous = JSON.stringify(settings)
}

function loadSetting(key) {
  let settings = {}
  try {
    settings = JSON.parse(
      localStorage.pianinous || '{}'
    )
  } catch (e) {
    localStorage.pianinous = JSON.stringify({})
  }
  return {
    ...defaultSettings,
    ...settings,
  }[key] 
}

Object.keys(defaultSettings).forEach(key => {
  const button = document.getElementById(`toggle-${key}`)
  let val = loadSetting(key)
  button.classList[val ? 'add': 'remove']('on')
  actions[key](val)
  button.onclick = function () {
    val = !loadSetting(key)
    button.classList[val ? 'add': 'remove']('on')
    actions[key](val)
    saveSetting(key, val)
    this.blur()
  }
})


// do not show toggle qwerty hint button on mobile
const hintButton = document.getElementById('toggle-qwerty')
// const hintBox = document.querySelector('.hint')
if (!('ontouchstart' in document.documentElement)) {
  hintButton.hidden = false
}



// cinema off
const cinemaOffButton = document.getElementById('cinema-off')
const offCinema = () => {
  document.getElementById('toggle-cinema').classList.remove('on')
  actions.cinema(false)
  saveSetting('cinema', false)
}
cinemaOffButton.onclick = offCinema
window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape') {
    offCinema()
  }
})



// init staff
const staffBox = document.querySelector('.staff')
const wholeNote = [...staffBox.children].pop()
;[
  'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4',
  'C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5',
  'C6',
].forEach((ch, i) => {
  const hspace = 0.25
  const hoffset = 3.6
  const vspace = 0.125
  const voffset = -0.125
  const note = wholeNote.cloneNode(true)
  note.dataset.note = ch
  note.style.bottom = (i-3) * vspace - voffset  + 'em'
  note.style.right = i * -hspace + hoffset + 'em'
  staffBox.appendChild(note)

  if (ch === 'C6') return

  const sharpNote = wholeNote.cloneNode(true)
  sharpNote.innerHTML = `♯&thinsp;` + sharpNote.innerText
  sharpNote.dataset.note = ch.split('').join('#')
  sharpNote.style.bottom = (i-3) * vspace - voffset + 'em'
  sharpNote.style.right = i * -hspace + hoffset + 'em'
  staffBox.appendChild(sharpNote)
});
wholeNote.remove()



// orientation

const reorient = () => {
  if (window.screen.orientation.type.includes('portrait')) {
    document.body.classList.add('rotated')
  } else {
    document.body.classList.remove('rotated')
  }
}

window.onorientationchange = reorient
reorient()
