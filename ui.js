
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
  } else {
    hintBox.hidden = true
  }
}
hintButton.onclick = hintBox.onclick = () => {
  hintBox.hidden = !hintBox.hidden
  saveSetting('qwerty', !hintBox.hidden)
}

// note labels
const keyboard = document.querySelector('.keyboard')
if (loadSetting('labels')) {
  keyboard.classList.add('letters')
} else {
  keyboard.classList.remove('letters')
}
const labelsButtons = document.getElementById('toggle-labels')
labelsButtons.onclick = () => {
	if (keyboard.classList.contains('letters')) {
    keyboard.classList.remove('letters')
    saveSetting('labels', false)
	} else {
    keyboard.classList.add('letters')
    saveSetting('labels', true)
	}
}

