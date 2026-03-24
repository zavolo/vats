<template>
  <div class="melodies-view">
    <el-card class="compact-card">
      <template #header>
        <div class="card-header">
          <span>Мелодии</span>
          <div class="header-actions">
            <el-button type="primary" @click="loadMelodies" size="small" :loading="loading" :icon="Refresh" />
            <el-upload
              :action="uploadUrl"
              :headers="uploadHeaders"
              :show-file-list="false"
              :on-success="handleUploadSuccess"
              :on-error="handleUploadError"
              :before-upload="beforeUpload"
              accept=".mp3,.wav,.ogg,.m4a"
            >
              <el-button type="success" size="small" :icon="Upload" :loading="uploading">
                Загрузить
              </el-button>
            </el-upload>
          </div>
        </div>
      </template>

      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="5" animated />
      </div>

      <div v-else-if="melodies.length === 0" class="empty-container">
        <el-empty description="Нет загруженных мелодий" :image-size="60" />
      </div>

      <div v-else class="melodies-list">
        <div
          v-for="melody in melodies"
          :key="melody.filename"
          class="melody-row"
        >
          <div class="melody-icon">
            <el-icon><Headset /></el-icon>
          </div>

          <div class="melody-main">
            <div class="melody-header">
              <span class="melody-name">{{ melody.name }}</span>
              <el-tag v-if="melody.duration_formatted" type="success" size="small">{{ melody.duration_formatted }}</el-tag>
              <el-tag type="info" size="small">{{ formatFileSize(melody.size) }}</el-tag>
            </div>
            <div class="melody-details">
              <span class="detail-item">
                <span class="detail-label">Файл:</span>
                <span class="detail-value code">{{ melody.filename }}</span>
              </span>
              <span class="detail-item">
                <span class="detail-label">Загружен:</span>
                <span class="detail-value">{{ formatDate(melody.created_at) }}</span>
              </span>
            </div>
          </div>

          <div class="melody-player">
            <audio
              :ref="el => { if (el) audioRefs[melody.filename] = el }"
              preload="none"
              @ended="onAudioEnded(melody.filename)"
              @play="onAudioPlay(melody.filename)"
            ></audio>
            <el-button
              :type="currentPlaying === melody.filename ? 'warning' : 'primary'"
              size="small"
              circle
              :loading="loadingAudio[melody.filename]"
              @click="togglePlay(melody.filename)"
            >
              <el-icon v-if="!loadingAudio[melody.filename]">
                <VideoPause v-if="currentPlaying === melody.filename" />
                <VideoPlay v-else />
              </el-icon>
            </el-button>
          </div>

          <div class="melody-actions">
            <el-button
              type="danger"
              size="small"
              :icon="Delete"
              circle
              @click="deleteMelody(melody)"
              title="Удалить"
            />
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, onActivated, onUnmounted, computed } from 'vue'
import { Refresh, Upload, Headset, VideoPlay, VideoPause, Delete } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import { useNotifications } from '@/composables/useNotifications'
import apiClient from '@/api/client'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const notifications = useNotifications()

const melodies = ref([])
const loading = ref(false)
const uploading = ref(false)
const currentPlaying = ref(null)
const audioRefs = ref({})
const audioBlobUrls = ref({})
const loadingAudio = ref({})

const uploadUrl = computed(() => `${import.meta.env.VITE_API_URL || ''}/api/calls/upload-melody`)
const uploadHeaders = computed(() => ({
  'Authorization': `Bearer ${authStore.token}`
}))

const loadMelodies = async () => {
  try {
    loading.value = true
    const response = await apiClient.get('/calls/melodies')
    melodies.value = response.data
  } catch (error) {
    console.error('Ошибка загрузки мелодий:', error)
    notifications.error('Ошибка загрузки', 'Не удалось загрузить мелодии')
  } finally {
    loading.value = false
  }
}

const beforeUpload = (file) => {
  const allowedTypes = ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/x-m4a']
  const allowedExtensions = ['.mp3', '.wav', '.ogg', '.m4a']
  const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()

  if (!allowedExtensions.includes(ext)) {
    notifications.error('Ошибка формата', 'Разрешены только файлы: MP3, WAV, OGG, M4A')
    return false
  }

  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    notifications.error('Ошибка размера', 'Максимальный размер файла: 10 МБ')
    return false
  }

  uploading.value = true
  return true
}

const handleUploadSuccess = (response) => {
  uploading.value = false
  notifications.success('Успешно', 'Мелодия загружена')
  loadMelodies()
}

const handleUploadError = (error) => {
  uploading.value = false
  console.error('Ошибка загрузки:', error)
  notifications.error('Ошибка загрузки', 'Не удалось загрузить мелодию')
}

const loadAudioBlob = async (filename) => {
  if (audioBlobUrls.value[filename]) {
    return audioBlobUrls.value[filename]
  }

  loadingAudio.value[filename] = true
  try {
    const response = await apiClient.get(`/calls/melodies/${encodeURIComponent(filename)}/play`, {
      responseType: 'blob'
    })
    const blobUrl = URL.createObjectURL(response.data)
    audioBlobUrls.value[filename] = blobUrl
    return blobUrl
  } catch (error) {
    console.error('Ошибка загрузки аудио:', error)
    notifications.error('Ошибка загрузки', 'Не удалось загрузить аудио')
    return null
  } finally {
    loadingAudio.value[filename] = false
  }
}

const togglePlay = async (filename) => {
  const audio = audioRefs.value[filename]
  if (!audio) return

  if (currentPlaying.value === filename) {
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
    if (!audio.src || !audioBlobUrls.value[filename]) {
      const blobUrl = await loadAudioBlob(filename)
      if (!blobUrl) return
      audio.src = blobUrl
    }

    audio.play()
    currentPlaying.value = filename
  }
}

const onAudioEnded = (filename) => {
  if (currentPlaying.value === filename) {
    currentPlaying.value = null
  }
}

const onAudioPlay = (filename) => {
  currentPlaying.value = filename
}

const deleteMelody = async (melody) => {
  try {
    await ElMessageBox.confirm(
      `Удалить мелодию "${melody.name}"?`,
      'Подтверждение',
      {
        confirmButtonText: 'Удалить',
        cancelButtonText: 'Отмена',
        type: 'warning'
      }
    )

    // Останавливаем воспроизведение если играет эта мелодия
    if (currentPlaying.value === melody.filename) {
      const audio = audioRefs.value[melody.filename]
      if (audio) {
        audio.pause()
      }
      currentPlaying.value = null
    }

    await apiClient.delete(`/calls/melodies/${encodeURIComponent(melody.filename)}`)
    notifications.success('Успешно', 'Мелодия удалена')
    await loadMelodies()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Ошибка удаления мелодии:', error)
      notifications.error('Ошибка удаления', 'Не удалось удалить мелодию')
    }
  }
}

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Б'
  const k = 1024
  const sizes = ['Б', 'КБ', 'МБ', 'ГБ']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(() => {
  loadMelodies()
})

onActivated(() => {
  loadMelodies()
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
.melodies-view {
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

.melodies-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.melody-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 6px;
  transition: background-color 0.15s;
}

.melody-row:hover {
  background: var(--el-fill-color-light);
}

.melody-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--el-color-primary-light-5), var(--el-color-primary));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.melody-icon .el-icon {
  font-size: 20px;
  color: #fff;
}

.melody-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.melody-header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.melody-name {
  font-weight: 600;
  font-size: 14px;
  color: var(--el-text-color-primary);
  word-break: break-all;
}

.melody-details {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 12px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.detail-label {
  color: var(--el-text-color-secondary);
}

.detail-value {
  color: var(--el-text-color-regular);
}

.detail-value.code {
  font-family: 'SF Mono', Monaco, 'Courier New', monospace;
  background: var(--el-fill-color-light);
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 11px;
}

.melody-player {
  flex-shrink: 0;
}

.melody-player audio {
  display: none;
}

.melody-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .melodies-view {
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

  .melody-row {
    flex-wrap: wrap;
    gap: 8px;
  }

  .melody-main {
    flex: 1 1 calc(100% - 60px);
  }

  .melody-player {
    order: 10;
  }

  .melody-actions {
    order: 11;
  }
}
</style>