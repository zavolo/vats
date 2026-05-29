<template>
  <div class="live-monitor-view">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>Прослушка звонка в реальном времени</span>
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
        <el-table-column prop="caller_num" label="Откуда" min-width="130"/>
        <el-table-column prop="connected_num" label="Куда" min-width="130"/>
        <el-table-column prop="state" label="Состояние" min-width="100"/>
        <el-table-column prop="duration" label="Длительность" min-width="100"/>
        <el-table-column prop="channel" label="Канал" min-width="220">
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
          :title="`Подключено: ${channelId}`"
          type="success"
          show-icon
          :closable="false"
          style="margin-bottom: 16px"
        />

        <div class="actions-row">
          <el-button @click="resumeAudio" :icon="Headset">Активировать звук</el-button>
          <el-button type="danger" @click="disconnect">Отключиться</el-button>
        </div>

        <el-divider>Подсунуть запись собеседнику</el-divider>

        <el-form label-width="120px">
          <el-form-item label="Мелодия">
            <el-select
              v-model="selectedMelody"
              placeholder="Выберите мелодию"
              style="width: 100%"
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
          </el-form-item>
          <el-form-item>
            <el-button
              type="success"
              :icon="VideoPlay"
              :disabled="!selectedMelody"
              @click="playSelected"
            >
              Воспроизвести
            </el-button>
            <el-button
              type="warning"
              :icon="VideoPause"
              :disabled="!currentPlayback"
              @click="stopPlayback"
            >
              Стоп
            </el-button>
          </el-form-item>
        </el-form>
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
import { Refresh, VideoPlay, VideoPause, Headset } from '@element-plus/icons-vue'
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

let ws = null
let audioCtx = null
let workletNode = null
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

const ensureAudio = async () => {
  if (audioCtx) return
  audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 })
  await audioCtx.audioWorklet.addModule('/audio-worklet/live-pcm-processor.js')
  workletNode = new AudioWorkletNode(audioCtx, 'live-pcm-processor')
  workletNode.connect(audioCtx.destination)
}

const resumeAudio = async () => {
  if (audioCtx && audioCtx.state === 'suspended') {
    try { await audioCtx.resume() } catch (e) { console.warn(e) }
  }
}

const connectTo = async (chan) => {
  if (connecting.value || connected.value) return
  channelId.value = chan
  lastError.value = ''
  connecting.value = true
  try {
    await ensureAudio()
    await resumeAudio()
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
        const i16 = new Int16Array(ev.data)
        const f32 = new Float32Array(i16.length)
        for (let i = 0; i < i16.length; i++) f32[i] = i16[i] / 32768
        workletNode?.port.postMessage({ type: 'samples', data: f32 }, [f32.buffer])
      }
    }
    ws.onerror = () => { lastError.value = 'Ошибка WebSocket' }
    ws.onclose = () => {
      connected.value = false
      connecting.value = false
      ws = null
      workletNode?.port.postMessage({ type: 'flush' })
    }
  } catch (e) {
    lastError.value = e.message || 'Ошибка подключения'
    connecting.value = false
  }
}

const disconnect = () => {
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
.actions-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}
</style>
