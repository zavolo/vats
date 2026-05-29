// AudioWorkletProcessor для проигрывания slin 8kHz PCM-стрима.
// AudioContext работает на native sampleRate (обычно 48000), поэтому
// сразу делаем upsample 8k→native через линейную интерполяцию.
class LivePcmProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.inBuffer = []          // массив Float32Array кусков на 8kHz
    this.inReadOffset = 0
    this.outRate = sampleRate   // native sample rate (глобальный в worklet)
    this.inRate = 8000
    // позиция чтения дробная — линейная интерполяция между сэмплами
    this.fracPos = 0
    this.lastSample = 0
    this.port.onmessage = (e) => {
      if (e.data && e.data.type === 'samples') {
        this.inBuffer.push(e.data.data)
      } else if (e.data && e.data.type === 'flush') {
        this.inBuffer = []
        this.inReadOffset = 0
        this.fracPos = 0
        this.lastSample = 0
      } else if (e.data && e.data.type === 'rate') {
        this.inRate = e.data.rate
      }
    }
  }

  _readSample() {
    // вычитываем 1 сэмпл из 8kHz входного буфера; если нет данных — возвращаем 0
    while (this.inBuffer.length > 0 && this.inReadOffset >= this.inBuffer[0].length) {
      this.inBuffer.shift()
      this.inReadOffset = 0
    }
    if (this.inBuffer.length === 0) return null
    const s = this.inBuffer[0][this.inReadOffset]
    this.inReadOffset++
    return s
  }

  process(_inputs, outputs) {
    const out = outputs[0][0]
    if (!out) return true
    const step = this.inRate / this.outRate  // 8000/48000 = 1/6
    for (let i = 0; i < out.length; i++) {
      this.fracPos += step
      while (this.fracPos >= 1.0) {
        const s = this._readSample()
        if (s === null) {
          // нет данных — выходим, заполняем оставшееся тишиной (=lastSample затухает)
          this.fracPos = 0
          this.lastSample *= 0.95
          out[i] = this.lastSample
          for (let k = i + 1; k < out.length; k++) {
            this.lastSample *= 0.95
            out[k] = this.lastSample
          }
          return true
        }
        this.lastSample = s
        this.fracPos -= 1.0
      }
      // линейная интерполяция между последним и следующим (упрощённо — hold)
      out[i] = this.lastSample
    }
    return true
  }
}

registerProcessor('live-pcm-processor', LivePcmProcessor)
