// AudioWorkletProcessor для захвата микрофона.
// AudioContext перевозит в 16 kHz, мы получаем Float32Array на 128 сэмплов,
// аккумулируем до 320 сэмплов (20 мс) и отдаём в main thread как Int16.
class MicPcmCapture extends AudioWorkletProcessor {
  constructor() {
    super()
    this.frameSize = 320 // 20 ms @ 16 kHz
    this.buffer = new Float32Array(this.frameSize)
    this.writeOffset = 0
    this.enabled = false
    this.littleEndian = true   // настраивается из main thread
    this.port.onmessage = (e) => {
      if (e.data && typeof e.data.enabled === 'boolean') {
        this.enabled = e.data.enabled
      }
      if (e.data && typeof e.data.littleEndian === 'boolean') {
        this.littleEndian = e.data.littleEndian
      }
    }
  }

  process(inputs) {
    const input = inputs[0] && inputs[0][0]
    if (!input || !this.enabled) return true
    let i = 0
    while (i < input.length) {
      const room = this.frameSize - this.writeOffset
      const take = Math.min(room, input.length - i)
      for (let j = 0; j < take; j++) {
        this.buffer[this.writeOffset + j] = input[i + j]
      }
      this.writeOffset += take
      i += take
      if (this.writeOffset >= this.frameSize) {
        // Float32 → Int16, порядок байт по настройке (slin16 в Asterisk).
        const ab = new ArrayBuffer(this.frameSize * 2)
        const view = new DataView(ab)
        for (let k = 0; k < this.frameSize; k++) {
          const s = Math.max(-1, Math.min(1, this.buffer[k]))
          const i16 = s < 0 ? s * 0x8000 : s * 0x7FFF
          view.setInt16(k * 2, i16 | 0, this.littleEndian)
        }
        this.port.postMessage(ab, [ab])
        this.writeOffset = 0
      }
    }
    return true
  }
}

registerProcessor('mic-pcm-capture', MicPcmCapture)
