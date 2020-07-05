export const networkingApp = new Vue({
  el: '#networking-app',
  data: {
    isOnline: false,
    room: 0,
    users: {
      // '0': {},
    },
  },
  methods: {
    bumpUser(uid) {
      this.users[uid] = {
        ...this(this.users[uid] || {}),
        lastTime: Date.now(),
      }
    },
  }
})

// setInterval(() => { // delete old users
//   Object.entries(networkingApp.users).forEach(([uid, user]) => {
//     if ((user.lastTime || 0) + 1000*10 < Date.now()) {
//       networkingApp.$delete(networkingApp.users, uid)
//     }
//   })
// }, 1000*15)
