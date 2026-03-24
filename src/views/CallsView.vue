<template>
  <div class="calls-view">
    <el-card class="compact-card">
      <template #header>
        <div class="card-header">
          <span>История звонков</span>
          <div class="header-actions">
            <el-select v-model="filters.callType" placeholder="Все типы" clearable @change="loadCalls" size="small" style="width: 130px">
              <el-option label="Все типы" value="" />
              <el-option label="Входящие" value="incoming" />
              <el-option label="Исходящие" value="outgoing" />
            </el-select>
            <el-button type="primary" @click="loadCalls" size="small" :icon="Refresh">
              Обновить
            </el-button>
          </div>
        </div>
      </template>

      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="6" animated />
      </div>

      <div v-else-if="calls.length === 0" class="empty-container">
        <el-empty description="Нет звонков" :image-size="80" />
      </div>

      <div v-else class="calls-list">
        <div v-for="call in calls" :key="call.id" class="call-row">
          <div class="call-direction">
            <el-icon :class="call.call_type === 'incoming' ? 'incoming' : 'outgoing'">
              <Phone />
            </el-icon>
          </div>

          <div class="call-info">
            <div class="call-numbers">
              <span class="call-from">{{ call.caller_number || '-' }}</span>
              <el-icon class="arrow-icon"><Right /></el-icon>
              <span class="call-to">{{ call.called_number || '-' }}</span>
            </div>
            <div class="call-details">
              <span class="call-provider" v-if="call.provider">{{ call.provider }}</span>
              <el-tag :type="getStatusType(call.status)" size="small" class="status-tag">
                {{ getStatusLabel(call.status) }}
              </el-tag>
            </div>
          </div>

          <div class="call-meta">
            <span class="call-duration">{{ formatDuration(call.duration) }}</span>
            <span class="call-cost">{{ call.cost?.toFixed(2) || '0.00' }} ₽</span>
          </div>

          <div class="call-time">{{ formatDate(call.started_at) }}</div>

          <div class="call-recording" v-if="call.has_recording">
            <audio
              :ref="el => { if (el) audioRefs[call.id] = el }"
              preload="none"
              @ended="onAudioEnded(call.id)"
              @play="onAudioPlay(call.id)"
              @error="onAudioError(call.id)"
            ></audio>
            <el-button
              :type="currentPlaying === call.id ? 'warning' : 'success'"
              size="small"
              circle
              :loading="loadingAudio[call.id]"
              @click="togglePlay(call.id)"
              title="Воспроизвести запись"
            >
              <el-icon v-if="!loadingAudio[call.id]">
                <VideoPause v-if="currentPlaying === call.id" />
                <VideoPlay v-else />
              </el-icon>
            </el-button>
            <el-button
              type="danger"
              size="small"
              circle
              @click="deleteRecording(call)"
              title="Удалить запись"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </div>
      </div>

      <el-pagination
        v-if="calls.length > 0"
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.limit"
        :total="pagination.total"
        :page-sizes="[20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        @size-change="loadCalls"
        @current-change="loadCalls"
        class="pagination"
        small
      />
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, onActivated, onUnmounted } from 'vue'
import { Refresh, Phone, Right, VideoPlay, VideoPause, Delete } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import { useNotifications } from '@/composables/useNotifications'
import apiClient from '@/api/client'

const notifications = useNotifications()

const calls = ref([])
const loading = ref(false)
const filters = ref({ callType: '' })
const pagination = ref({ page: 1, limit: 20, total: 0 })

// Для воспроизведения записей
const currentPlaying = ref(null)
const audioRefs = ref({})
const audioBlobUrls = ref({})
const loadingAudio = ref({})

const loadCalls = async () => {
  try {
    loading.value = true
    const params = {
      skip: (pagination.value.page - 1) * pagination.value.limit,
      limit: pagination.value.limit,
      _t: Date.now()
    }
    if (filters.value.callType) {
      params.call_type = filters.value.callType
    }
    const response = await apiClient.get('/calls', {
      params,
      headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
    })
    calls.value = response.data
    pagination.value.total = response.data.length
  } catch (error) {
    console.error('Ошибка загрузки звонков:', error)
    notifications.error('Ошибка загрузки', 'Не удалось загрузить историю звонков')
  } finally {
    loading.value = false
  }
}

const formatDuration = (seconds) => {
  if (!seconds) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const getStatusType = (status) => {
  const types = { 'completed': 'success', 'ringing': 'warning', 'failed': 'danger' }
  return types[status] || 'info'
}

const getStatusLabel = (status) => {
  const labels = { 'completed': 'Завершён', 'ringing': 'Звонит', 'failed': 'Не удался' }
  return labels[status] || status
}

// Функции для работы с записями
const loadAudioBlob = async (callId) => {
  if (audioBlobUrls.value[callId]) {
    return audioBlobUrls.value[callId]
  }

  loadingAudio.value[callId] = true
  try {
    const response = await apiClient.get(`/calls/recording/${callId}`, {
      responseType: 'blob'
    })
    const blob = new Blob([response.data], { type: 'audio/wav' })
    const blobUrl = URL.createObjectURL(blob)
    audioBlobUrls.value[callId] = blobUrl
    return blobUrl
  } catch (error) {
    console.error('Ошибка загрузки записи:', error)
    const detail = error.response?.data?.detail || 'Не удалось загрузить запись'
    notifications.error('Ошибка загрузки записи', detail)
    return null
  } finally {
    loadingAudio.value[callId] = false
  }
}

const togglePlay = async (callId) => {
  const audio = audioRefs.value[callId]
  if (!audio) return

  if (currentPlaying.value === callId) {
    audio.pause()
    audio.currentTime = 0
    currentPlaying.value = null
  } else {
    // Останавливаем текущее воспроизведение
    if (currentPlaying.value && audioRefs.value[currentPlaying.value]) {
      audioRefs.value[currentPlaying.value].pause()
      audioRefs.value[currentPlaying.value].currentTime = 0
    }

    // Загружаем blob если ещё не загружен
    if (!audio.src || !audioBlobUrls.value[callId]) {
      const blobUrl = await loadAudioBlob(callId)
      if (!blobUrl) return
      audio.src = blobUrl
    }

    audio.play()
    currentPlaying.value = callId
  }
}

const onAudioEnded = (callId) => {
  if (currentPlaying.value === callId) {
    currentPlaying.value = null
  }
}

const onAudioPlay = (callId) => {
  currentPlaying.value = callId
}

const onAudioError = (callId) => {
  currentPlaying.value = null
  loadingAudio.value[callId] = false
  if (audioBlobUrls.value[callId]) {
    URL.revokeObjectURL(audioBlobUrls.value[callId])
    delete audioBlobUrls.value[callId]
  }
  notifications.error('Ошибка воспроизведения', 'Не удалось воспроизвести запись. Формат не поддерживается.')
}

const deleteRecording = async (call) => {
  try {
    await ElMessageBox.confirm(
      `Удалить запись звонка ${call.caller_number} → ${call.called_number}?`,
      'Подтверждение',
      {
        confirmButtonText: 'Удалить',
        cancelButtonText: 'Отмена',
        type: 'warning'
      }
    )

    // Останавливаем воспроизведение если играет эта запись
    if (currentPlaying.value === call.id) {
      const audio = audioRefs.value[call.id]
      if (audio) {
        audio.pause()
      }
      currentPlaying.value = null
    }

    // Освобождаем blob URL
    if (audioBlobUrls.value[call.id]) {
      URL.revokeObjectURL(audioBlobUrls.value[call.id])
      delete audioBlobUrls.value[call.id]
    }

    await apiClient.delete(`/calls/recording/${call.id}`)
    notifications.success('Запись удалена', 'Аудиозапись успешно удалена')
    await loadCalls()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Ошибка удаления записи:', error)
      notifications.error('Ошибка удаления', 'Не удалось удалить аудиозапись')
    }
  }
}

onMounted(() => {
  loadCalls()
})

onActivated(() => {
  loadCalls()
})

onUnmounted(() => {
  // Останавливаем все аудио при размонтировании
  Object.values(audioRefs.value).forEach(audio => {
    if (audio) {
      audio.pause()
    }
  })
  // Освобождаем blob URLs
  Object.values(audioBlobUrls.value).forEach(url => {
    URL.revokeObjectURL(url)
  })
})
</script>

<style scoped>
.calls-view {
  padding: 12px;
  max-width: 1200px;
  margin: 0 auto;
}

.compact-card {
  box-shadow: 0 1px 4px rgba(0,0,0,0.1);
}

.compact-card :deep(.el-card__header) {
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.compact-card :deep(.el-card__body) {
  padding: 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.loading-container, .empty-container {
  padding: 24px 0;
}

.calls-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.call-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  transition: background-color 0.15s;
}

.call-row:hover {
  background: var(--el-fill-color-light);
}

.call-direction {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: var(--el-fill-color-light);
}

.call-direction .el-icon {
  font-size: 16px;
}

.call-direction .incoming {
  color: var(--el-color-success);
}

.call-direction .outgoing {
  color: var(--el-color-primary);
}

.call-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.call-numbers {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.call-from {
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.arrow-icon {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.call-to {
  color: var(--el-text-color-regular);
}

.call-details {
  display: flex;
  align-items: center;
  gap: 8px;
}

.call-provider {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.status-tag {
  font-size: 10px;
}

.call-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  min-width: 70px;
}

.call-duration {
  font-size: 13px;
  color: var(--el-text-color-primary);
  font-weight: 500;
}

.call-cost {
  font-size: 12px;
  color: var(--el-color-success);
  font-weight: 600;
}

.call-time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
  min-width: 90px;
  text-align: right;
}

.call-recording {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.call-recording audio {
  display: none;
}

.pagination {
  margin-top: 16px;
  justify-content: center;
}

@media (max-width: 768px) {
  .calls-view {
    padding: 8px;
  }

  .card-header {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
  }

  .call-row {
    flex-wrap: wrap;
    gap: 8px;
  }

  .call-info {
    flex: 1 1 calc(100% - 50px);
  }

  .call-meta {
    flex-direction: row;
    gap: 12px;
  }

  .call-time {
    min-width: auto;
  }

  .call-recording {
    order: 10;
  }
}
</style>