
// settings
const defaultSettings = {
  labels: true,
  qwerty: false,
  score: false,
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


// qerty hints
const hintButton = document.getElementById('toggle-hint')
const hintBox = document.querySelector('.hint')
if (!('ontouchstart' in document.documentElement)) {
  hintButton.hidden = false
  if (loadSetting('qwerty')) {
    hintBox.hidden = false
    hintButton.classList.add('on')
  } else {
    hintBox.hidden = true
    hintButton.classList.remove('on')
  }
}
hintButton.onclick = function () {
  this.blur()
  const on = !!hintBox.hidden
  hintBox.hidden = !on
  saveSetting('qwerty', on)
  this.classList[on ? 'add' : 'remove']('on')
}

// note labels
const keyboard = document.querySelector('.keyboard')
const labelsButtons = document.getElementById('toggle-labels')
if (loadSetting('labels')) {
  keyboard.classList.add('letters')
  labelsButtons.classList.add('on')
} else {
  keyboard.classList.remove('letters')
  labelsButtons.classList.remove('on')
}
labelsButtons.onclick = function () {
  this.blur()
	if (keyboard.classList.contains('letters')) {
    keyboard.classList.remove('letters')
    saveSetting('labels', false)
    this.classList.remove('on')
	} else {
    keyboard.classList.add('letters')
    saveSetting('labels', true)
    this.classList.add('on')
	}
}

