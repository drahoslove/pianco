import { getStorage } from "./storage.js"

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
  },
}

function saveSetting(key, val) {
  let settings = {}
  try {
    settings = JSON.parse(
      getStorage().pianco || '{}'
    )
  } catch (e) {}
  settings[key] = val
  getStorage().pianco = JSON.stringify(settings)
}

function loadSetting(key) {
  let settings = {}
  try {
    settings = JSON.parse(
      getStorage().pianco || '{}'
    )
  } catch (e) {
    getStorage().pianco = JSON.stringify({})
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
  if (!button) {
    return
  }
  let val = loadSetting(key)
  setOnClass(button, +val)
  actions[key](val)
  button.onclick = function () {
    val = loadSetting(key)
    if (['score', 'labels'].includes(key)) {
      val = (+val+1)%3
    } else {
      val = !val
    }
    setOnClass(button, +val)
    actions[key](val)
    saveSetting(key, val)
  }
})


const isMobile = ('ontouchstart' in document.documentElement)
const isFramed = window.parent !== window


// do not show toggle qwerty hint button on mobile
const hintButton = document.getElementById('toggle-qwerty')
if (!isMobile) {
  hintButton.hidden = false
} else {
  document.body.classList.add('mobile')
  saveSetting('qwerty', false) // to be sure
}



// cinema off
const cinemaOffButton = document.getElementById('cinema-off')
const offCinema = async function() {
  document.getElementById('toggle-cinema').classList.remove('on')
  actions.cinema(false)
  saveSetting('cinema', false)
  if (document.fullscreenElement !== null && document.exitFullscreen) {
    await document.exitFullscreen()
    document.querySelector('[data-icon="mdi-fullscreen-exit"]').setAttribute('hidden', true)
    document.querySelector('[data-icon="mdi-fullscreen"]').setAttribute('hidden', false)
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
  if (isFramed) {
    return
  }
  if (document.fullscreenElement && document.exitFullscreen) {
    await document.exitFullscreen()
  } else {
    if (!loadSetting('cinema')) {
      actions.cinema(true)
    }
    if ( document.body.parentElement.requestFullscreen) {
      await document.body.parentElement.requestFullscreen()
    }
  }
  const exitable = document.fullscreenElement !== null
  document.querySelector('[data-icon="mdi-fullscreen-exit"]').setAttribute('hidden', !exitable)
  document.querySelector('[data-icon="mdi-fullscreen"]').setAttribute('hidden', exitable)
}
fullscreenButton.onclick = toggleFullscreen
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyM') {
    toggleFullscreen()
  }
})



// orientation

const reorient = () => {
  const isPortrait = !!window.screen.orientation
    ? window.screen.orientation.type.includes('portrait')
    : window.screen.availHeight > window.screen.availWidth * 1.5
  if (isPortrait && !isFramed) {
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

// instrument

window.addEventListener('load', () => {
  document.querySelectorAll('button, label, span[tabIndex]').forEach(el => {
    el.addEventListener('mousedown', (e) => {
      // e.preventDefault() // will cause input range inside label to not be changeable by mouse
    })
    el.addEventListener('click', () => {
      el.blur()
    })
  })
  // lazy load cinema bkg images
  document.querySelectorAll('._smoke').forEach(el => {
    el.classList.remove('_smoke')
    el.classList.add('smoke')
  })
})