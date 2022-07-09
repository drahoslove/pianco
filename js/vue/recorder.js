import { recorder } from '../io.js'

export const recorderApp = new Vue({
  el: '#recorder-app',
  data: {
    isRecording: false,
    isPlaying: false,
  },
  methods: {
    reset: function () {
      this.isRecording = false
      this.isPlaying = false
    },
    toggleRecord: function () {
      if (this.isRecording || this.isPlaying) {
        recorder.stop()
      } else {
        recorder.record()
      }
    },
    togglePlay: function () {
      if (this.isPlaying) {
        recorder.pause()
      } else {
        recorder.replay()
      }
    },
  }
})

