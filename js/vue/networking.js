export const networkingApp = new Vue({
  el: '#networking-app',
  data: {
    isOnline: false,
    gid: 0,
    uid: 0,
    users: [],
  },
  computed: {
    copianists: function () {
      return this.users.filter(uid => this.uid !== uid)
    },
  },
  methods: {
    userColor: (uid) => `hsla(${(uid/256) * 360}, 50%, 50%)`,
    changeRoom: function (room) {
      window.location.hash = room || ''
      this.gid = room
    },
  },
})
