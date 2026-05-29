<template>
  <div class="live-monitor-view">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>Разговор по чужому звонку</span>
          <div class="status-block">
            <el-tag :type="statusType" effect="dark">{{ statusLabel }}</el-tag>
            <el-button :icon="Refresh" circle size="small" @click="loadChannels" :loading="loadingChannels" title="Обновить список"/>
          </div>
        </div>
      </template>

      <el-table
        v-if="!connected"
        :data="channels"
        v-loading="loadingChannels"
        empty-text="Активных звонков нет"
        size="default"
        highlight-current-row
        @row-click="selectChannel"
      >
        <el-table-column label="Откуда" min-width="140">
          <template #default="{ row }">{{ formatParty(row.caller_num, row.caller_name) }}</template>
        </el-table-column>
        <el-table-column label="Куда" min-width="140">
          <template #default="{ row }">{{ formatParty(row.connected_num, null) || extractEndpoint(row.channel) }}</template>
        </el-table-column>
        <el-table-column label="Состояние" min-width="120">
          <template #default="{ row }">
            <el-tag :type="stateTagType(row.state)" size="small">{{ translateState(row.state) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Длительность" min-width="100">
          <template #default="{ row }">{{ formatDuration(row.duration) }}</template>
        </el-table-column>
        <el-table-column label="Канал" min-width="240">
          <template #default="{ row }">
            <code class="channel-name">{{ row.channel }}</code>
          </template>
        </el-table-column>
        <el-table-column label="" width="120" align="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click.stop="connectTo(row.channel)">
              Слушать
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div v-else class="live-panel">
        <el-alert
          :title="`Вы на линии: ${channelId}`"
          type="success"
          show-icon
          :closable="false"
          style="margin-bottom: 12px"
        />

        <!-- Шаг: разрешить звук в браузере -->
        <el-card v-if="audioCtxState !== 'running'" shadow="never" class="step-card warning">
          <div class="step-head">
            <span class="step-num">!</span>
            <b>Сначала разрешите звук</b>
          </div>
          <div class="step-desc">
            Браузер не воспроизводит звук без клика. Нажмите кнопку — и вы услышите собеседника.
          </div>
          <el-button type="warning" :icon="Headset" @click="resumeAudio">
            Включить звук
          </el-button>
        </el-card>

        <!-- Я слышу собеседника -->
        <el-card shadow="never" class="step-card">
          <div class="step-head">
            <span class="step-num">1</span>
            <b>Я слышу собеседника</b>
            <el-tag :type="audioCtxState === 'running' ? 'success' : 'info'" size="small">
              {{ audioCtxState === 'running' ? 'звук идёт' : 'звук выключен' }}
            </el-tag>
          </div>
          <div class="step-desc">
            Голос собеседника поступает в ваши наушники или колонки.
            Не уверены, что звук работает? Нажмите «Проверить колонки» —
            должен прозвучать короткий сигнал.
          </div>
          <el-button @click="playTestTone" :icon="VideoPlay">Проверить колонки</el-button>
          <div class="step-hint">
            <span class="hint-text">Если слышен только шум вместо голоса —</span>
            <el-radio-group v-model="endian" size="small">
              <el-radio-button value="le">Формат A</el-radio-button>
              <el-radio-button value="be">Формат B</el-radio-button>
            </el-radio-group>
            <span class="hint-text">попробуйте переключить.</span>
          </div>
        </el-card>

        <!-- Я говорю собеседнику -->
        <el-card shadow="never" class="step-card">
          <div class="step-head">
            <span class="step-num">2</span>
            <b>Я говорю собеседнику</b>
            <el-tag v-if="micEnabled" type="success" size="small">микрофон включён</el-tag>
            <el-tag v-else type="info" size="small">микрофон выключен</el-tag>
          </div>
          <div class="step-desc">
            Включите микрофон — собеседник услышит вас в реальном времени.
            Браузер один раз спросит разрешение на доступ к микрофону.
          </div>
          <el-button
            :type="micEnabled ? 'success' : 'primary'"
            @click="toggleMic"
            :icon="Microphone"
          >
            {{ micEnabled ? 'Выключить микрофон' : 'Включить микрофон' }}
          </el-button>
        </el-card>

        <!-- Включить мелодию для собеседника -->
        <el-card shadow="never" class="step-card">
          <div class="step-head">
            <span class="step-num">3</span>
            <b>Включить мелодию для собеседника</b>
            <el-tag v-if="currentPlayback" type="success" size="small">играет</el-tag>
          </div>
          <div class="step-desc">
            Включите любую запись из библиотеки — собеседник услышит её на линии.
            Вы услышите её одновременно вместе с ним.
          </div>
          <el-select
            v-model="selectedMelody"
            placeholder="Выберите мелодию"
            style="width: 100%; margin-bottom: 8px"
            clearable
            filterable
            :loading="loadingMelodies"
          >
            <el-option
              v-for="m in melodies"
              :key="m.filename"
              :label="m.name"
              :value="`sound:custom/${stripExt(m.filename)}`"
            />
          </el-select>
          <el-button
            type="success"
            :icon="VideoPlay"
            :disabled="!selectedMelody || !!currentPlayback"
            @click="playSelected"
          >
            Включить мелодию
          </el-button>
          <el-button
            type="warning"
            :icon="VideoPause"
            :disabled="!currentPlayback"
            @click="stopPlayback"
          >
            Выключить мелодию
          </el-button>
        </el-card>

        <div class="bottom-actions">
          <span class="conn-stat">Получено звука: {{ formatBytes(bytesReceived) }}</span>
          <el-button type="danger" plain @click="disconnect">Положить трубку</el-button>
        </div>
      </div>

      <el-alert
        v-if="lastError"
        :title="lastError"
        type="error"
        show-icon
        closable
        @close="lastError = ''"
        style="margin-top: 12px"
      />
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { Refresh, VideoPlay, VideoPause, Headset, Microphone } from '@element-plus/icons-vue'
import apiClient from '@/api/client'
import { useNotifications } from '@/composables/useNotifications'

const notifications = useNotifications()

const channels = ref([])
const loadingChannels = ref(false)
const channelId = ref('')
const connected = ref(false)
const connecting = ref(false)
const lastError = ref('')
const currentPlayback = ref(null)
const selectedMelody = ref('')
const melodies = ref([])
const loadingMelodies = ref(false)
const micEnabled = ref(false)
const audioCtxState = ref('—')      // suspended/running — видно пользователю
const bytesReceived = ref(0)        // счётчик принятых RTP-байт
// Asterisk slin16 шлёт PCM 16-bit, но порядок байт зависит от версии/сборки
// (исторически host = LE на Intel, но патч 2015 года правил это в RTP).
// Сохраняем выбор пользователя.
const endian = ref(localStorage.getItem('live-monitor-endian') || 'le')

let ws = null
let audioCtx = null
let workletNode = null
let micNode = null
let micStream = null
let micSource = null
let streamWs = null
let streamReconnectTimer = null

const statusLabel = computed(() => {
  if (connecting.value) return 'Подключение…'
  if (connected.value) return 'В эфире'
  return 'Отключено'
})
const statusType = computed(() => {
  if (connecting.value) return 'warning'
  if (connected.value) return 'success'
  return 'info'
})

const stripExt = (name) => name.replace(/\.[^.]+$/, '')

// AMI ChannelStateDesc → русское название
// https://docs.asterisk.org/Asterisk_19_Documentation/API_Documentation/AMI_Events/CoreShowChannel/
const STATE_RU = {
  Down: 'Завершён',
  Reserved: 'Зарезервирован',
  OffHook: 'Снята трубка',
  Dialing: 'Набор',
  Ring: 'Звонит',
  Ringing: 'Звонит',
  Up: 'В разговоре',
  Busy: 'Занят',
  'Dialing Offhook': 'Дозвон',
  'Pre-ring': 'Подготовка',
  Unknown: 'Неизвестно',
}
const translateState = (s) => STATE_RU[s] || (s ? s : '—')
const stateTagType = (s) => {
  if (s === 'Up') return 'success'
  if (s === 'Ring' || s === 'Ringing' || s === 'Dialing' || s === 'Dialing Offhook') return 'warning'
  if (s === 'Down' || s === 'Busy') return 'info'
  return ''
}

const isUnknown = (v) => !v || v === '<unknown>' || v === 'unknown'

const formatParty = (num, name) => {
  const n = isUnknown(num) ? '' : num
  const nm = isUnknown(name) ? '' : name
  if (n && nm) return `${nm} (${n})`
  return n || nm || ''
}

// Из имени канала достать endpoint (Dongle/megafon-0100000000 → megafon)
const extractEndpoint = (channel) => {
  if (!channel) return ''
  const m = channel.match(/^[^/]+\/([^-]+)/)
  return m ? m[1] : channel
}

const formatDuration = (d) => {
  if (!d || d === '00:00:00') return '—'
  return d
}

const formatBytes = (n) => {
  if (!n) return '0 Б'
  if (n < 1024) return `${n} Б`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} КБ`
  return `${(n / 1024 / 1024).toFixed(1)} МБ`
}

const loadChannels = async () => {
  loadingChannels.value = true
  try {
    const r = await apiClient.get('/live-monitor/channels')
    channels.value = r.data
  } catch (e) {
    lastError.value = e.response?.data?.detail || 'Не удалось получить список каналов'
  } finally {
    loadingChannels.value = false
  }
}

const openChannelsStream = () => {
  closeChannelsStream()
  const token = localStorage.getItem('token') || ''
  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  const url = `${proto}://${location.host}/api/live-monitor/channels-stream?token=${encodeURIComponent(token)}`
  try {
    streamWs = new WebSocket(url)
  } catch (e) {
    console.warn('channels-stream init failed:', e)
    return
  }
  streamWs.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data)
      if (msg.type === 'channels' && Array.isArray(msg.data)) {
        channels.value = msg.data
        loadingChannels.value = false
        // Если активный канал, на котором мы сидим, пропал из списка —
        // звонящий повесил трубку. Автоматически отключаемся, чтобы
        // оператор не остался "на мёртвой линии".
        if (connected.value && channelId.value &&
            !msg.data.some(c => c.channel === channelId.value)) {
          notifications.info('Звонок завершён', 'Собеседник положил трубку.')
          disconnect()
        }
      } else if (msg.type === 'error') {
        lastError.value = msg.detail || 'Ошибка стрима каналов'
      }
    } catch {}
  }
  streamWs.onclose = () => {
    streamWs = null
    if (streamReconnectTimer) return
    streamReconnectTimer = setTimeout(() => {
      streamReconnectTimer = null
      if (!connected.value) openChannelsStream()
    }, 3000)
  }
  streamWs.onerror = () => {}
}

const closeChannelsStream = () => {
  if (streamReconnectTimer) {
    clearTimeout(streamReconnectTimer)
    streamReconnectTimer = null
  }
  if (streamWs) {
    try { streamWs.close() } catch {}
    streamWs = null
  }
}

const loadMelodies = async () => {
  loadingMelodies.value = true
  try {
    const r = await apiClient.get('/calls/melodies')
    melodies.value = r.data
  } catch (e) {
    console.warn('Не удалось загрузить мелодии:', e)
  } finally {
    loadingMelodies.value = false
  }
}

const selectChannel = (row) => connectTo(row.channel)

// audio.kind: 'worklet' (HTTPS) | 'script' (HTTP fallback) | 'none'
const audioMode = ref('none')
const isSecureContext = () =>
  window.isSecureContext ||
  location.protocol === 'https:' ||
  location.hostname === 'localhost' ||
  location.hostname === '127.0.0.1'

const ensurePlaybackPipeline = async () => {
  if (audioCtx) return
  const Ctx = window.AudioContext || window.webkitAudioContext
  if (!Ctx) {
    throw new Error('Web Audio API не поддерживается в этом браузере')
  }
  // 8 kHz — родной для GSM/Asterisk slin, без транскодинга.
  audioCtx = new Ctx({ sampleRate: 8000 })
  console.log('[live-monitor] AudioContext created:', audioCtx.state, 'sampleRate=', audioCtx.sampleRate)

  if (audioCtx.audioWorklet && typeof audioCtx.audioWorklet.addModule === 'function') {
    // Полный путь — AudioWorklet (нужен HTTPS).
    await audioCtx.audioWorklet.addModule('/audio-worklet/live-pcm-processor.js')
    try {
      await audioCtx.audioWorklet.addModule('/audio-worklet/mic-pcm-capture.js')
    } catch (e) { console.warn('mic-pcm-capture load failed:', e) }
    workletNode = new AudioWorkletNode(audioCtx, 'live-pcm-processor', {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [1],
    })
    workletNode.connect(audioCtx.destination)
    audioMode.value = 'worklet'
    console.log('[live-monitor] AudioWorklet mode active')
  } else {
    // Fallback для HTTP: ScriptProcessor (deprecated, но работает).
    // Очередь Float32 кусков, sink из ScriptProcessor берёт их по 4096.
    workletNode = audioCtx.createScriptProcessor(4096, 0, 1)
    workletNode._queue = []
    workletNode._readOffset = 0
    workletNode.onaudioprocess = (e) => {
      const out = e.outputBuffer.getChannelData(0)
      let filled = 0
      while (filled < out.length && workletNode._queue.length > 0) {
        const head = workletNode._queue[0]
        const take = Math.min(head.length - workletNode._readOffset, out.length - filled)
        for (let i = 0; i < take; i++) {
          out[filled + i] = head[workletNode._readOffset + i]
        }
        filled += take
        workletNode._readOffset += take
        if (workletNode._readOffset >= head.length) {
          workletNode._queue.shift()
          workletNode._readOffset = 0
        }
      }
      for (let i = filled; i < out.length; i++) out[i] = 0
    }
    workletNode.connect(audioCtx.destination)
    audioMode.value = 'script'
    if (!isSecureContext()) {
      lastError.value =
        'Микрофон в этом окне работать не будет — нужно открыть страницу через защищённое соединение. ' +
        'Слушать собеседника можно как обычно.'
    }
  }
}

const pushPcmToPlayer = (float32) => {
  if (!workletNode) return
  if (audioMode.value === 'worklet') {
    workletNode.port.postMessage({ type: 'samples', data: float32 }, [float32.buffer])
  } else if (audioMode.value === 'script') {
    workletNode._queue.push(float32)
    // Чтоб не разбух при дропе пакетов — ограничим ~2с буфера.
    while (workletNode._queue.length > 64) workletNode._queue.shift()
  }
}

const flushPlayer = () => {
  if (!workletNode) return
  if (audioMode.value === 'worklet') {
    workletNode.port.postMessage({ type: 'flush' })
  } else if (audioMode.value === 'script') {
    workletNode._queue.length = 0
    workletNode._readOffset = 0
  }
}

// Старое имя для совместимости с остальным кодом.
const ensureAudio = ensurePlaybackPipeline

const toggleMic = async () => {
  if (micEnabled.value) {
    stopMic()
    return
  }
  // Browser requirement: getUserMedia + AudioWorklet работают только в
  // secure context. Покажем понятную ошибку, не пытаясь упасть на исключении.
  if (!isSecureContext()) {
    lastError.value =
      'Чтобы включить микрофон, откройте сайт по защищённому соединению ' +
      '(адрес должен начинаться с https://).'
    notifications.warning('Нужно защищённое соединение', 'Без него браузер не разрешит доступ к микрофону.')
    return
  }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    lastError.value = 'Браузер не поддерживает микрофон.'
    return
  }
  try {
    await ensureAudio()
    await resumeAudio()
    if (audioMode.value !== 'worklet') {
      lastError.value = 'Микрофон сейчас недоступен — откройте сайт через защищённое соединение.'
      return
    }
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 8000,
        channelCount: 1,
      },
      video: false,
    })
    micSource = audioCtx.createMediaStreamSource(micStream)
    micNode = new AudioWorkletNode(audioCtx, 'mic-pcm-capture')
    micNode.port.onmessage = (e) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(e.data)  // ArrayBuffer Int16LE — backend завернёт в RTP
      }
    }
    micSource.connect(micNode)
    micNode.port.postMessage({ enabled: true, littleEndian: endian.value === 'le' })
    micEnabled.value = true
  } catch (e) {
    // NotAllowedError, NotFoundError и т.п. от getUserMedia
    const name = e?.name || ''
    const text = name === 'NotAllowedError'
      ? 'Доступ к микрофону отклонён — разрешите в настройках сайта.'
      : (name === 'NotFoundError'
          ? 'Микрофон не найден.'
          : (e?.message || 'Не удалось включить микрофон'))
    lastError.value = text
    stopMic()
  }
}

const stopMic = () => {
  if (micNode) {
    try { micNode.port.postMessage({ enabled: false }) } catch {}
    try { micNode.disconnect() } catch {}
    micNode = null
  }
  if (micSource) {
    try { micSource.disconnect() } catch {}
    micSource = null
  }
  if (micStream) {
    micStream.getTracks().forEach(t => { try { t.stop() } catch {} })
    micStream = null
  }
  micEnabled.value = false
}

// Тест: пропустить 1 секунду синуса 440 Гц через нашу же worklet-цепочку.
// Если слышно — AudioContext / destination / worklet работают,
// проблема в данных Asterisk (формат / тишина). Если не слышно —
// проблема в Web Audio пайплайне (громкость, устройство и пр).
const playTestTone = async () => {
  await ensureAudio()
  await resumeAudio()
  const sr = audioCtx.sampleRate
  const len = sr * 1
  const buf = new Float32Array(len)
  for (let i = 0; i < len; i++) {
    buf[i] = 0.3 * Math.sin(2 * Math.PI * 440 * i / sr)
  }
  pushPcmToPlayer(buf)
  notifications.info('Проверка звука', 'Должен прозвучать короткий сигнал около секунды.')
}

const resumeAudio = async () => {
  if (audioCtx && audioCtx.state === 'suspended') {
    try {
      await audioCtx.resume()
      console.log('[live-monitor] AudioContext resumed, state=', audioCtx.state)
    } catch (e) { console.warn(e) }
  }
  if (audioCtx) audioCtxState.value = audioCtx.state
}

const connectTo = async (chan) => {
  if (connecting.value || connected.value) return
  channelId.value = chan
  lastError.value = ''
  connecting.value = true
  bytesReceived.value = 0
  try {
    await ensureAudio()
    await resumeAudio()
    audioCtxState.value = audioCtx?.state || '—'
    const token = localStorage.getItem('token') || ''
    const proto = location.protocol === 'https:' ? 'wss' : 'ws'
    const url = `${proto}://${location.host}/api/live-monitor/ws/${encodeURIComponent(chan)}?token=${encodeURIComponent(token)}`
    ws = new WebSocket(url)
    ws.binaryType = 'arraybuffer'
    ws.onopen = () => { connected.value = true; connecting.value = false }
    ws.onmessage = (ev) => {
      if (typeof ev.data === 'string') {
        handleControl(JSON.parse(ev.data))
      } else {
        // Первый пакет — попробуем разбудить AudioContext
        // (политика автоплея — без user gesture он остаётся suspended).
        if (bytesReceived.value === 0) {
          console.log('[live-monitor] first audio frame:', ev.data.byteLength, 'bytes, ctx=', audioCtx?.state)
          if (audioCtx?.state === 'suspended') resumeAudio()
        }
        bytesReceived.value += ev.data.byteLength
        // slin16: signed 16-bit linear PCM.
        const view = new DataView(ev.data)
        const samples = ev.data.byteLength / 2
        const f32 = new Float32Array(samples)
        const littleEndian = endian.value === 'le'
        for (let i = 0; i < samples; i++) {
          f32[i] = view.getInt16(i * 2, littleEndian) / 32768
        }
        pushPcmToPlayer(f32)
      }
    }
    ws.onerror = () => { lastError.value = 'Ошибка WebSocket' }
    ws.onclose = () => {
      connected.value = false
      connecting.value = false
      ws = null
      flushPlayer()
    }
  } catch (e) {
    lastError.value = e.message || 'Ошибка подключения'
    connecting.value = false
  }
}

const disconnect = () => {
  stopMic()
  if (ws) {
    try { ws.close() } catch {}
  }
  ws = null
  connected.value = false
  connecting.value = false
  currentPlayback.value = null
  loadChannels()
}

const handleControl = (msg) => {
  if (msg.type === 'ready') {
    notifications.success('Подключено', `Канал ${channelId.value}`)
  } else if (msg.type === 'playing') {
    currentPlayback.value = msg.playback_id
  } else if (msg.type === 'stopped') {
    if (currentPlayback.value === msg.playback_id) currentPlayback.value = null
  } else if (msg.type === 'error' || msg.type === 'command_error') {
    lastError.value = msg.detail || 'Ошибка'
    // Если канал больше не существует — сразу освобождаем UI и
    // обновляем список, чтоб не пытаться слушать «привидение».
    if (msg.detail && /не существует|завершён|hangup/i.test(msg.detail)) {
      disconnect()
      loadChannels()
    }
  }
}

const playSelected = () => {
  if (!ws || !selectedMelody.value) return
  ws.send(JSON.stringify({ type: 'play', media: selectedMelody.value }))
}

const stopPlayback = () => {
  if (!ws || !currentPlayback.value) return
  ws.send(JSON.stringify({ type: 'stop', playback_id: currentPlayback.value }))
}

import { watch } from 'vue'
watch(endian, (v) => {
  localStorage.setItem('live-monitor-endian', v)
  // если микрофон активен — поменять порядок байт на лету
  if (micNode) {
    micNode.port.postMessage({ littleEndian: v === 'le' })
  }
})

onMounted(() => {
  loadChannels()
  loadMelodies()
  openChannelsStream()
})

onUnmounted(() => {
  closeChannelsStream()
  disconnect()
  if (audioCtx) {
    try { audioCtx.close() } catch {}
    audioCtx = null
    workletNode = null
  }
  stopMic()
})
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.status-block {
  display: flex;
  gap: 8px;
  align-items: center;
}
.channel-name {
  font-size: 11px;
  background: var(--el-fill-color-light);
  padding: 1px 4px;
  border-radius: 3px;
}
.live-panel {
  padding: 8px 0;
}
.diag-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}
.step-card {
  margin-bottom: 12px;
  border: 1px solid var(--el-border-color-lighter);
}
.step-card.warning {
  border-color: var(--el-color-warning);
  background: var(--el-color-warning-light-9);
}
.step-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.step-num {
  display: inline-flex;
  width: 22px;
  height: 22px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--el-color-primary);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
}
.step-card.warning .step-num {
  background: var(--el-color-warning);
}
.step-desc {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin-bottom: 10px;
}
.step-hint {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-top: 8px;
  flex-wrap: wrap;
}
.hint-text {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.bottom-actions {
  margin-top: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.conn-stat {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.actions-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}
</style>
