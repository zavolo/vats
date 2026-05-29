// AudioWorkletProcessor для захвата микрофона.
// AudioContext перевозит в 16 kHz, мы получаем Float32Array на 128 сэмплов,
// аккумулируем до 320 сэмплов (20 мс) и отдаём в main thread как Int16.
// Захват микрофона: AudioContext в native rate (обычно 48000),
// мы downsample-им в 8000 Hz и шлём 20мс кадрами (160 сэмплов).
class MicPcmCapture extends AudioWorkletProcessor {
  constructor() {
    super()
    this.targetRate = 8000
    this.frameSize = 160 // 20 ms @ 8 kHz
    this.buffer = new Float32Array(this.frameSize)
    this.writeOffset = 0
    this.enabled = false
    this.littleEndian = false  // slin16 в Asterisk = big-endian
    // дробная позиция чтения native→8k
    this.fracPos = 0
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
    const step = sampleRate / this.targetRate  // 48000/8000 = 6
    // на каждом шаге берём 1 сэмпл с интервалом step
    while (this.fracPos < input.length) {
      const idx = Math.floor(this.fracPos)
      this.buffer[this.writeOffset++] = input[idx]
      this.fracPos += step
      if (this.writeOffset >= this.frameSize) {
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
    this.fracPos -= input.length
    return true
  }
}

registerProcessor('mic-pcm-capture', MicPcmCapture)
