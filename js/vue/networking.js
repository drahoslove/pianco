import {
  releaseAll, releaseSustain,
} from '../instrument.js'
import {
  rename as ioRename,
  react,
} from '../io.js'


const emojiReg = /\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\p{Emoji_Presentation}|\p{Emoji}\uFE0F/gu;
const isEmoji = (s) => /\p{Extended_Pictographic}/u.test(s)
const normalizeEmoji = (s) => s.match(emojiReg) && s.match(emojiReg)[0]


Vue.component('prompt', {
  template: '#prompt-template',
  props: {
    name: String,
    singleChar: Boolean,
  },
  emits: ['submit'],
  model: {
    prop: 'name',
  },
  data () { return {
    value: this.name,
  }},
  mounted () {
    this.focusInput()
  },
  methods: {
    focusInput() {
      setTimeout(() => {
        this.$refs.input.select()
      })
    }
  },
})


export const networkingApp = new Vue({
  el: '#networking-app',
  data: {
    showCustomEmoji: false, // modal
    showRename: false, // modal
    showReacter: false,
    isOnline: false,
    gid: 0,
    uid: 0,
    groups: [],
    names: [],
    reactions: [],
    muted: [{}],
    lastEmojis: localStorage.lastEmojis ? localStorage.lastEmojis.split(",") : [],
    defaultEmojis: {
      '❤️': 'lovely',
      '👏🏻': 'bravo!',
      '👍🏻': 'good',
      '👌🏻': 'okay',
      '👎🏻': 'bad',
      '🍅': 'boo!',
    },
  },
  computed: {
    users () {
      return this.groups[this.gid]
    },
    lastEmojisMap () {
      return this.lastEmojis.slice(this.lastEmojis.length === 4 ? 1 : 0).reduce((map, symbol, i) => ({
        ...map,
        [symbol]: `custom ${i+1}`,
      }), {})
    }
  },
  methods: {
    toggleReacter () {
      this.showReacter = !this.showReacter
    },
    react (symbol) {
      if (symbol === null) {
        this.showCustomEmoji = false
        return
      }
      if (this.reactions[this.uid]) { // disallow multiple reaction
        return
      }
      if (!symbol) {
        this.showCustomEmoji = this.lastEmojis.length
          ? this.lastEmojis[0]
          : '💯'
        return
      }
      this.showCustomEmoji = false
      symbol = normalizeEmoji(symbol)
      if (!isEmoji(symbol)) {
        return
      }

      // add last emoji
      if (this.lastEmojis.includes(symbol)) {
        this.lastEmojis = [...this.lastEmojis.filter(s => s !== symbol)] // remove exisiting
      }
      if (!(symbol in this.defaultEmojis)) {
        this.lastEmojis = [...this.lastEmojis, symbol] // add
        if (this.lastEmojis.length > 4) {
          this.lastEmojis = [ ...this.lastEmojis.slice(1) ] // remove overflow
        }
        localStorage.lastEmojis = this.lastEmojis.join(",") // persist
      }
      react(symbol)
      this.showReacter = false
    },
    showReaction (gid, uid, symbol) {
      if (gid !== this.gid) {
        return
      }
      this.$set(this.reactions, uid, symbol)
      setTimeout(() => {
        this.$set(this.reactions, uid, null)
      }, 5000)
    },
    isMuted (uid) {
      return (this.muted[this.gid] || {})[uid]
    },
    toggleMute (uid) {
      const gid = this.gid
      if (!this.muted[gid]) {
        this.$set(this.muted, gid, {})
      }
      if (this.muted[gid][uid]) {
        this.$set(this.muted[gid], uid, false)
      } else {
        this.$set(this.muted[gid], uid, true)
        releaseAll(uid)("UI")
        releaseSustain(uid, "UI")
      }
    },
    userClick (uid) {
      if (uid == this.uid) {
        const { name } = localStorage
        this.showRename = name
        // const newName = window.prompt('Your name', name)
        // ioRename(newName)
      } else {
        this.toggleMute(uid)
      }
    },
    userRename (newName) {
      this.showRename = false
      if (newName) {
        ioRename(newName)
      }
    },
    userName (uid) {
      const name = (this.names[this.gid]||[])[uid] || 'anon'
      return name 
        + (uid === this.uid ? ' <small>- you</small>' : '')
        + (this.isMuted(uid) ? ' <small>- muted</small>' : '')
    },
    userColor (uid) {
      return uid === this.uid
        ? '#eee'
        :`hsla(${(uid/256) * 360}, 50%, 50%)`
    },
    changeRoom (room) {
      window.location.hash = room === -1 ? '-' : (room || '')
    },
    dotsOfRoom (gid) {
      return (this.groups[gid || 0]||[]).map(() => '.').join('')
    }
  },
})

window.addEventListener('load', () => {
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#networking-app')) {
      networkingApp.showReacter = false
    }
  })
})