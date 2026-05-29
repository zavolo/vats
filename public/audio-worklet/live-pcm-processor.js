// AudioWorkletProcessor для проигрывания slin16 PCM-стрима из WebSocket.
// Принимает сообщения вида {type: 'samples', data: Float32Array}
// и накапливает их в ring-буфере. process() забирает кадры под запрос
// AudioContext.
class LivePcmProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.buffer = []        // массив Float32Array кусков
    this.readOffset = 0     // оффсет в первом куске
    this.totalSamples = 0
    this.port.onmessage = (e) => {
      if (e.data && e.data.type === 'samples') {
        this.buffer.push(e.data.data)
        this.totalSamples += e.data.data.length
      } else if (e.data && e.data.type === 'flush') {
        this.buffer = []
        this.readOffset = 0
        this.totalSamples = 0
      }
    }
  }

  process(_inputs, outputs) {
    const output = outputs[0][0]
    if (!output) return true
    const need = output.length
    let filled = 0
    while (filled < need && this.buffer.length > 0) {
      const head = this.buffer[0]
      const available = head.length - this.readOffset
      const take = Math.min(available, need - filled)
      for (let i = 0; i < take; i++) {
        output[filled + i] = head[this.readOffset + i]
      }
      filled += take
      this.readOffset += take
      this.totalSamples -= take
      if (this.readOffset >= head.length) {
        this.buffer.shift()
        this.readOffset = 0
      }
    }
    // оставшиеся сэмплы — тишина (под-fill зеркалит то что было)
    for (let i = filled; i < need; i++) output[i] = 0
    return true
  }
}

registerProcessor('live-pcm-processor', LivePcmProcessor)
