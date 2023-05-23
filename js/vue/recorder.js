import { recorder } from '../io.js'

export const recorderApp = new Vue({
  el: '#recorder-app',
  data: {
    isRecording: false,
    isPlaying: false,
    visible: true,
  },
  methods: {
    reset () {
      this.isRecording = false
      this.isPlaying = false
    },
    toggleRecord () {
      if (this.isRecording || this.isPlaying) {
        recorder.stop()
      } else {
        recorder.record()
      }
    },
    togglePlay () {
      if (this.isPlaying) {
        recorder.pause()
      } else {
        recorder.replay()
      }
    },
  }
})

