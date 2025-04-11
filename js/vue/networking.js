import {
  releaseAll, releaseSustain,
} from '../instrument.js'
import {
  rename as ioRename,
  giveMic as ioGiveMic,
  dropMic as ioDropMic,
  react,
  toBase32,
  MAX_HASHABLE_GID,
  OFFLINE_GID,
} from '../io.js'
import { getStorage } from '../storage.js';


const emojiReg = /\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\p{Emoji_Presentation}|\p{Emoji}\uFE0F/gu;
const isEmoji = (s) => /\p{Extended_Pictographic}/u.test(s)
const normalizeEmoji = (s) => s.match(emojiReg) && s.match(emojiReg)[0]


Vue.component('prompt', {
  template: '#prompt-template',
  props: {
    val: String,
    singleChar: Boolean,
  },
  emits: ['submit'],
  model: {
    prop: 'val',
  },
  data () { return {
    value: this.val,
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
    OFFLINE_GID,
    showShareLink: false, //modal
    showCustomEmoji: false, // modal
    showRename: false, // modal
    showReacter: false,
    isOnline: false,
    copied: false,
    gid: 0,
    uid: 0,
    myRooms: JSON.parse(getStorage().myRooms || '[]'),
    groups: [],
    names: [],
    avatars: [],
    mods: [],
    mics: [],
    reactions: [],
    muted: {0:{}},
    lastEmojis: (getStorage().lastEmojis || '').split(","),
    defaultEmojis: {
      '❤️': 'lovely',
      '👏🏻': 'bravo!',
      '👍🏻': 'good',
      '👌🏻': 'okay',
      '👎🏻': 'bad',
      '🍅': 'boo!',
    },
  },
  watch: {
    gid (newGid) { // add current room to list if it's missing
      if (newGid > 0 && newGid <= MAX_HASHABLE_GID && !this.myRooms.includes(newGid)) {
        this.myRooms.push(newGid)
      }
    },
    myRooms (myRooms) {
      getStorage().myRooms = JSON.stringify(myRooms)
    },
  },
  computed: {
    users () {
      const users = (this.groups[this.gid]||[]).map((u) => ({
        id: u,
        isMod: this.isMod(u),
        name: this.userName(u),
        avatar: (this.avatars[this.gid]||[])[u],
        isMuted: this.isMuted(u),
        hasMic: this.hasMic(u),
        isMe: u === this.uid,
      }))
      // const me = users.find(({isMe}) => isMe)
      const byName = (u1, u2) => (
        u1.name.localeCompare(
          u2.name, undefined, {sensitivity: 'base'}
        )
      )
      return  [
        ...users.filter(({ isMod, id }) => isMod || id===0).sort(byName),
        ...users.filter(({ isMod, id }) => !isMod && id>0).sort(byName),
      ]
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
          ? this.lastEmojis[0] || '💯'
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
        getStorage().lastEmojis = this.lastEmojis.join(",") // persist
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
    isMod (uid) {
      return (this.mods[this.gid] || []).includes(uid)
    },
    hasMic (uid) {
      return (this.mics[this.gid] || []).includes(uid)
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
    userClick (uid, e) {
      if (e.shiftKey) {
        if (this.hasMic(this.uid)) {
          return ioDropMic()
        }
        if (this.isMod(this.uid)) {
          return ioGiveMic(uid)
        }
        return
      }
      if (
        uid == this.uid &&
        window.parent === window // only un-framed can rename self
      ) {
        const { name } = getStorage()
        this.showRename = name
        // const newName = window.prompt('Your name', name)
        // ioRename(newName)
      } else {
        this.toggleMute(uid)
      }
      e.currentTarget.blur()
    },
    userRename (newName) {
      this.showRename = false
      if (newName) {
        ioRename(newName)
      }
    },
    roomChangeHandler(room) {
      if (room !== null) {
        this.changeRoom(room)
      }
      this.roomChange = false
    },
    userName(uid) {
      const name = (this.names[this.gid] || [])[uid] || ''
      const isMod = this.isMod(uid)
      const hasMic = this.hasMic(uid)
      return (
        name +
        (uid === this.uid ? ' <small>- you</small>' : '') +
        (isMod ? ' <small>- mod</small>' : '') +
        (hasMic ? ' <small>- exclusive</small>' : '')
      )
    },
    userColor(uid) {
      return uid === this.uid ? '#eee' : `hsla(${(uid / 256) * 360}, 50%, 50%)`
    },
    changeRoom(gid) {
      window.location.hash = !gid
        ? ''
        : (gid === -1
          ? '-'
          : toBase32(gid)
        )
    },
    goToEmptyRoom() {
      let gid
      do {
        gid = Math.floor(Math.random() * MAX_HASHABLE_GID)
      } while (
        this.groups[gid] || 
        this.myRooms.includes(gid) ||
        this.myRooms
          .map(r => toBase32(r).slice(-1))
          .includes(toBase32(gid).slice(-1)) // ensure unique icon
      )
      this.myRooms.push(gid)
      window.location.hash = toBase32(gid)
    },
    removeRoom(gid) {
      this.myRooms = this.myRooms.filter(r => r !== gid)
    },
    iconOfRoom(gid) {
      const symbol = toBase32(gid).slice(-1)
      if (/[a-z]/.test(symbol)) {
        return `mdi-alpha-${symbol}-circle`
      }
      if (/[0-9]/.test(symbol)) {
        return `mdi-numeric-${symbol}-circle`
      }
    },
    labelOfRoom(gid) {
      return gid ? `room ${toBase32(gid)}` : 'main room'
    },
    dotsOfRoom(gid) {
      return (this.groups[gid || 0] || []).map(() => '.').join('')
    },
    copyUrl(url) {
      this.showShareLink = false
      if (!url) {
        return
      }
      this.copied = true
      navigator.clipboard.writeText(url)
      setTimeout(() => {
        this.copied = false
      }, 1500)
    },
  },
})

window.addEventListener('load', () => {
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#networking-app')) {
      networkingApp.showReacter = false
    }
  })
})