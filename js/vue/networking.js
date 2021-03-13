import {
  releaseAll, releaseSustain,
} from '../instrument.js'
import {
  rename as ioRename,
  react,
} from '../io.js'


const isEmoji = (s) => /\p{Extended_Pictographic}/u.test(s)

export const networkingApp = new Vue({
  el: '#networking-app',
  data: {
    showReacter: false,
    isOnline: false,
    gid: 0,
    uid: 0,
    groups: [],
    names: [],
    reactions: [],
    muted: [{}],
    lastEmojis: localStorage.lastEmojis ? localStorage.lastEmojis.split(",") : [],
  },
  computed: {
    users () {
      return this.groups[this.gid]
    },
    lastEmojisMap () {
      return this.lastEmojis.reduce((map, symbol, i) => ({
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
      if (this.reactions[this.uid]) { // disallow multiple reaction
        return
      }
      if (!symbol) {
        symbol = String.fromCodePoint(
          window.prompt(
            'Insert one custom emoji character',
            this.lastEmojis.length ? this.lastEmojis[0] : '💯',
          ).codePointAt(0)
        )
        if (!isEmoji(symbol)) {
          return
        }
        // add last emoji
        if (!this.lastEmojis.includes(symbol)) {
          this.lastEmojis = [...this.lastEmojis, symbol]
          if (this.lastEmojis.length > 3) {
            this.lastEmojis  = [ ...this.lastEmojis.slice(1) ]
          }
          localStorage.lastEmojis = this.lastEmojis.join(",")
        }
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
        // const notMuted = [...this.groups[this.gid]].filter(this.isMuted.bind(this))
        // notMuted.forEach((u) => { this.toggleMute(u)}) // mute
        const newName = window.prompt('Your name', name)
        // notMuted.forEach((u) => { this.toggleMute(u)}) // unmute
        ioRename(newName)
      } else {
        this.toggleMute(uid)
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