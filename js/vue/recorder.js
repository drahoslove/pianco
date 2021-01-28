export const recorderApp = new Vue({
  el: '#recorder-app',
  data: {
    isRecording: false,
    isPlaying: false,
  },
  methods: {
    toggleRecord: function () {
      // TODO
    },
    reset: function () {
      this.isRecording = false
      this.isPlaying = false
    },
    togglePlay: function () {
      window.interrupt()
      if (this.isPlaying) {
        window.stopplay()
      } else {
        window.randomfile()
      }
      this.isPlaying = !this.isPlaying
    },
  }
})
