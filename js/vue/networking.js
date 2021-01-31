export const networkingApp = new Vue({
  el: '#networking-app',
  data: {
    isOnline: false,
    gid: 0,
    uid: 0,
    groups: [],
    names: [],
  },
  computed: {
    users: function () {
      return this.groups[this.gid]
    },
  },
  methods: {
    userClick: function (uid) { },
    userName: function (uid) {
      const name = (this.names[this.gid]||[])[uid] || 'anon'
      return name + (uid === this.uid ? ' (you)' : '')
    },
    userColor: function (uid) {
      return uid === this.uid
        ? '#eee'
        :`hsla(${(uid/256) * 360}, 50%, 50%)`
    },
    changeRoom: function (room) {
      window.location.hash = room || ''
    },
    dotsOfRoom: function (gid) {
      return (this.groups[gid || 0]||[]).map(() => '.').join('')
    }
  },
})
