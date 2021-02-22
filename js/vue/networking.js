import {
  releaseAll, releaseSustain,
} from '../instrument.js'
import {
  rename as ioRename,
} from '../io.js'

export const networkingApp = new Vue({
  el: '#networking-app',
  data: {
    isOnline: false,
    gid: 0,
    uid: 0,
    groups: [],
    names: [],
    muted: [{}],
  },
  computed: {
    users: function () {
      return this.groups[this.gid]
    },
  },
  methods: {
    isMuted: function (uid) {
      return (this.muted[this.gid] || {})[uid]
    },
    toggleMute: function (uid) {
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
    userClick: function (uid) {
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
    userName: function (uid) {
      const name = (this.names[this.gid]||[])[uid] || 'anon'
      return name 
        + (uid === this.uid ? ' <small>- you</small>' : '')
        + (this.isMuted(uid) ? ' <small>- muted</small>' : '')
    },
    userColor: function (uid) {
      return uid === this.uid
        ? '#eee'
        :`hsla(${(uid/256) * 360}, 50%, 50%)`
    },
    changeRoom: function (room) {
      window.location.hash = room === -1 ? '-' : (room || '')
    },
    dotsOfRoom: function (gid) {
      return (this.groups[gid || 0]||[]).map(() => '.').join('')
    }
  },
})
