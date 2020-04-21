
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

// staff
const staffBox = document.querySelector('.staff')
const staffButton = document.getElementById('toggle-score')
if (loadSetting('score')) {
  staffBox.hidden = false
  staffButton.classList.add('on')
} else {
  staffButton.classList.remove('on')
  staffBox.hidden = true
}
staffButton.onclick = function () {
  this.blur()
  const on = !!staffBox.hidden
  staffBox.hidden = !on
  saveSetting('score', on)
  this.classList[on ? 'add' : 'remove']('on')
}
const wholeNote = [...staffBox.children].pop()
;[
  'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4',
  'C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5',
  'C6',
].forEach((ch, i) => {
  const hspace = 0.2
  const hoffset = 3 // .6
  const vspace = 0.084
  const voffset = .06
  const note = wholeNote.cloneNode(true)
  note.dataset.note = ch
  note.style.bottom = (i-3) * vspace - voffset  + 'em'
  note.style.right = i * -hspace + hoffset + 'em'
  note.style.transform = 'scaleY(.8)'
  staffBox.appendChild(note)

  const sharpNote = wholeNote.cloneNode(true)
  sharpNote.innerHTML = `<small>♯${'' && ['', '&ensp;', '&ensp;', '', ''][i%4]}</small>`
     + sharpNote.innerText
  sharpNote.dataset.note = ch.split('').join('#')
  sharpNote.style.bottom = (i-3) * vspace - voffset + 'em'
  sharpNote.style.right = i * -hspace + hoffset + 'em'
  sharpNote.style.transform = 'scaleY(.8)'
  staffBox.appendChild(sharpNote)
});
wholeNote.remove()
console.log(wholeNote)