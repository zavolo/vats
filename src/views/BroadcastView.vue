<template>
  <div class="broadcast-view">
    <el-card class="compact-card">
      <template #header>
        <div class="card-header">
          <span>Массовый обзвон</span>
          <div class="header-actions">
            <el-select v-model="filters.status" placeholder="Статус" clearable @change="loadCampaigns" size="small" style="width: 140px">
              <el-option label="Все" :value="null" />
              <el-option label="Ожидает" value="pending" />
              <el-option label="Выполняется" value="running" />
              <el-option label="Приостановлена" value="paused" />
              <el-option label="Завершена" value="completed" />
              <el-option label="Отменена" value="cancelled" />
            </el-select>
            <el-button type="primary" @click="loadCampaigns" size="small" :loading="loading" :icon="Refresh" />
            <el-button
              type="success"
              @click="showCreateDialog = true"
              size="small"
              :icon="Plus"
              v-if="permissionsStore.hasPermission('broadcast', 'create')"
            >
              Создать
            </el-button>
          </div>
        </div>
      </template>

      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="5" animated />
      </div>

      <div v-else-if="campaigns.length === 0" class="empty-container">
        <el-empty description="Кампании не найдены" :image-size="80">
          <el-button type="primary" size="small" @click="showCreateDialog = true" v-if="permissionsStore.hasPermission('broadcast', 'create')">
            Создать первую кампанию
          </el-button>
        </el-empty>
      </div>

      <div v-else class="campaigns-list">
        <div v-for="campaign in campaigns" :key="campaign.id" class="campaign-row">
          <div class="campaign-status">
            <div
              class="status-indicator"
              :class="{
                pending: campaign.status === 'pending',
                running: campaign.status === 'running',
                paused: campaign.status === 'paused',
                completed: campaign.status === 'completed',
                cancelled: campaign.status === 'cancelled'
              }"
            >
              <el-icon v-if="campaign.status === 'running'"><Loading /></el-icon>
              <el-icon v-else-if="campaign.status === 'completed'"><Check /></el-icon>
              <el-icon v-else-if="campaign.status === 'paused'"><VideoPause /></el-icon>
              <el-icon v-else-if="campaign.status === 'cancelled'"><Close /></el-icon>
              <el-icon v-else><Clock /></el-icon>
            </div>
          </div>

          <div class="campaign-main">
            <div class="campaign-header">
              <span class="campaign-name">{{ campaign.name }}</span>
              <el-tag :type="getStatusType(campaign.status)" size="small">{{ getStatusText(campaign.status) }}</el-tag>
              <el-tag type="info" size="small" v-if="campaign.melody">{{ campaign.melody }}</el-tag>
            </div>
            <div class="campaign-details">
              <span class="detail-item">
                <span class="detail-value-highlighted">{{ campaign.total_numbers }} {{ pluralize(campaign.total_numbers, ['номер', 'номера', 'номеров']) }}</span>
              </span>
              <span class="detail-separator">•</span>
              <span class="detail-item">
                <span class="detail-label">Завершено:</span>
                <span class="detail-value">{{ campaign.completed_calls }}</span>
              </span>
              <span class="detail-separator" v-if="campaign.failed_calls > 0">•</span>
              <span class="detail-item" v-if="campaign.failed_calls > 0">
                <span class="detail-label">Ошибок:</span>
                <span class="detail-value text-danger">{{ campaign.failed_calls }}</span>
              </span>
              <span class="detail-separator">•</span>
              <span class="detail-item">
                <span class="detail-label">Создана:</span>
                <span class="detail-value">{{ formatDate(campaign.created_at) }}</span>
              </span>
            </div>

            <!-- Progress bar -->
            <div class="campaign-progress" v-if="campaign.total_numbers > 0">
              <el-progress
                :percentage="getProgress(campaign)"
                :status="getProgressStatus(campaign.status)"
                :stroke-width="6"
              />
            </div>
          </div>

          <div class="campaign-actions">
            <el-button
              v-if="(campaign.status === 'pending' || campaign.status === 'paused') && permissionsStore.hasPermission('broadcast', 'start')"
              type="success"
              size="small"
              :icon="VideoPlay"
              @click="startCampaign(campaign)"
              :loading="actionLoading[campaign.id]"
            >
              Запустить
            </el-button>
            <el-button
              v-if="campaign.status === 'running' && permissionsStore.hasPermission('broadcast', 'stop')"
              type="warning"
              size="small"
              :icon="VideoPause"
              @click="stopCampaign(campaign)"
              :loading="actionLoading[campaign.id]"
            >
              Остановить
            </el-button>
            <el-button
              size="small"
              :icon="View"
              @click="viewResults(campaign)"
            >
              Результаты
            </el-button>
            <el-button
              type="danger"
              size="small"
              :icon="Delete"
              @click="deleteCampaign(campaign)"
              :loading="actionLoading[campaign.id]"
              v-if="permissionsStore.hasPermission('broadcast', 'delete')"
            >
              Удалить
            </el-button>
          </div>
        </div>
      </div>

      <el-pagination
        v-if="campaigns.length > 0"
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.limit"
        :total="pagination.total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        @size-change="loadCampaigns"
        @current-change="loadCampaigns"
        style="margin-top: 20px;"
      />
    </el-card>

    <!-- Диалог создания кампании -->
    <el-dialog v-model="showCreateDialog" title="Создать кампанию обзвона" width="600px" :close-on-click-modal="false">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="180px" label-position="left">
        <el-form-item label="Название" prop="name">
          <el-input v-model="form.name" placeholder="Новогодние поздравления" />
        </el-form-item>

        <el-form-item label="Донгл" prop="dongle_id">
          <el-select v-model="form.dongle_id" placeholder="Выберите донгл" style="width: 100%">
            <el-option
              v-for="dongle in dongles"
              :key="dongle.id"
              :label="`${dongle.name} ${dongle.phone_number ? '(' + dongle.phone_number + ')' : ''}`"
              :value="dongle.id"
              :disabled="!dongle.is_online"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="Мелодия" prop="melody">
          <el-select v-model="form.melody" placeholder="Выберите мелодию" style="width: 100%">
            <el-option
              v-for="melody in melodies"
              :key="melody.filename"
              :label="melody.name"
              :value="melody.filename"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="Номера телефонов" prop="numbers">
          <el-input
            v-model="form.numbersText"
            type="textarea"
            :rows="6"
            placeholder="Введите номера телефонов, по одному на строку или через запятую&#10;79991234567&#10;79997654321"
          />
          <div class="form-hint">{{ getNumbersCount() }} {{ pluralize(getNumbersCount(), ['номер', 'номера', 'номеров']) }}</div>
        </el-form-item>

        <el-form-item label="Задержка (сек)" prop="delay_between_calls">
          <el-input-number v-model="form.delay_between_calls" :min="1" :max="300" />
          <div class="form-hint">Пауза между звонками</div>
        </el-form-item>

        <el-form-item label="Попыток на номер" prop="max_retries">
          <el-input-number v-model="form.max_retries" :min="1" :max="5" />
        </el-form-item>

        <el-form-item label="Таймаут звонка (мс)" prop="call_timeout">
          <el-input-number v-model="form.call_timeout" :min="10000" :max="120000" :step="5000" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showCreateDialog = false">Отмена</el-button>
        <el-button type="primary" @click="createCampaign" :loading="creating">Создать</el-button>
      </template>
    </el-dialog>

    <!-- Диалог результатов -->
    <el-dialog v-model="showResultsDialog" :title="`Результаты: ${selectedCampaign?.name}`" width="800px">
      <div v-if="loadingResults" class="loading-container">
        <el-skeleton :rows="5" animated />
      </div>

      <div v-else>
        <div class="results-filters">
          <el-select v-model="resultsFilter" placeholder="Фильтр" @change="loadResults" style="width: 180px" size="small">
            <el-option label="Все" :value="null" />
            <el-option label="Ожидают" value="pending" />
            <el-option label="Звонит" value="calling" />
            <el-option label="Завершено" value="completed" />
            <el-option label="Ошибка" value="failed" />
            <el-option label="Не ответил" value="no_answer" />
          </el-select>
        </div>

        <div class="results-list" v-if="callResults.length > 0">
          <div v-for="result in callResults" :key="result.id" class="result-row">
            <div class="result-number">{{ result.number }}</div>
            <div class="result-status">
              <el-tag :type="getResultStatusType(result.status)" size="small">
                {{ getResultStatusText(result.status) }}
              </el-tag>
            </div>
            <div class="result-attempts" v-if="result.attempts > 1">
              <el-tag type="info" size="small">{{ result.attempts }} {{ pluralize(result.attempts, ['попытка', 'попытки', 'попыток']) }}</el-tag>
            </div>
            <div class="result-error" v-if="result.error_message">
              <el-tooltip :content="result.error_message">
                <el-icon color="#f56c6c"><WarningFilled /></el-icon>
              </el-tooltip>
            </div>
            <div class="result-time" v-if="result.called_at">
              <span class="time-text">{{ formatDate(result.called_at) }}</span>
            </div>
          </div>
        </div>
        
        <el-empty v-else description="Нет результатов" :image-size="60" />
      </div>
    </el-dialog>
  </div>
</template>
<script setup>
import { ref, onMounted, reactive, computed } from 'vue'
import { ElMessageBox } from 'element-plus'
import {
  Plus,
  Refresh,
  Delete,
  VideoPlay,
  VideoPause,
  View,
  Clock,
  Loading,
  Check,
  Close,
  WarningFilled
} from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { usePermissionsStore } from '@/stores/permissions'
import { useNotifications } from '@/composables/useNotifications'
import api from '@/api/client'
const authStore = useAuthStore()
const permissionsStore = usePermissionsStore()
const notifications = useNotifications()
const loading = ref(false)
const creating = ref(false)
const loadingResults = ref(false)
const campaigns = ref([])
const dongles = ref([])
const melodies = ref([])
const callResults = ref([])
const selectedCampaign = ref(null)
const actionLoading = reactive({})
const showCreateDialog = ref(false)
const showResultsDialog = ref(false)
const resultsFilter = ref(null)

const filters = reactive({
  status: null
})

const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0
})

const form = reactive({
  name: '',
  dongle_id: null,
  melody: '',
  numbersText: '',
  delay_between_calls: 5,
  max_retries: 1,
  call_timeout: 60000
})

const formRef = ref(null)
const rules = {
  name: [{ required: true, message: 'Введите название', trigger: 'blur' }],
  dongle_id: [{ required: true, message: 'Выберите донгл', trigger: 'change' }],
  melody: [{ required: true, message: 'Выберите мелодию', trigger: 'change' }],
  numbersText: [{ required: true, message: 'Введите номера', trigger: 'blur' }]
}

// Загрузка данных
async function loadCampaigns() {
  loading.value = true
  try {
    const params = {
      skip: (pagination.page - 1) * pagination.limit,
      limit: pagination.limit
    }
    if (filters.status) {
      params.status = filters.status
    }
    const response = await api.get('/broadcast/campaigns', { params })
    campaigns.value = response.data
    // Обновляем прогресс для активных кампаний
    campaigns.value.forEach(campaign => {
      if (campaign.status === 'running') {
        pollCampaignStatus(campaign.id)
      }
    })
  } catch (error) {
    notifications.error('Ошибка загрузки', 'Не удалось загрузить кампании: ' + (error.response?.data?.detail || error.message))
  } finally {
    loading.value = false
  }
}

async function loadDongles() {
  try {
    const response = await api.get('/dongles')
    dongles.value = response.data.filter(d => d.is_online)
  } catch (error) {
    notifications.error('Ошибка загрузки', 'Не удалось загрузить донглы')
  }
}

async function loadMelodies() {
  try {
    const response = await api.get('/calls/melodies')
    melodies.value = response.data
  } catch (error) {
    notifications.error('Ошибка загрузки', 'Не удалось загрузить мелодии')
  }
}

async function loadResults() {
  if (!selectedCampaign.value) return
  loadingResults.value = true
  try {
    const params = resultsFilter.value ? { status_filter: resultsFilter.value } : {}
    const response = await api.get(`/broadcast/campaigns/${selectedCampaign.value.id}/results`, { params })
    callResults.value = response.data
  } catch (error) {
    notifications.error('Ошибка загрузки', 'Не удалось загрузить результаты')
  } finally {
    loadingResults.value = false
  }
}

// Создание кампании
async function createCampaign() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    creating.value = true
    try {
      const numbers = parseNumbers(form.numbersText)
      if (numbers.length === 0) {
        notifications.error('Ошибка валидации', 'Не удалось распознать номера телефонов')
        return
      }
      await api.post('/broadcast/campaigns', {
        name: form.name,
        dongle_id: form.dongle_id,
        melody: form.melody,
        numbers: numbers,
        delay_between_calls: form.delay_between_calls,
        max_retries: form.max_retries,
        call_timeout: form.call_timeout
      })
      notifications.success('Кампания создана', 'Массовый обзвон успешно добавлен')
      showCreateDialog.value = false
      resetForm()
      loadCampaigns()
    } catch (error) {
      notifications.error('Ошибка создания', 'Не удалось создать кампанию: ' + (error.response?.data?.detail || error.message))
    } finally {
      creating.value = false
    }
  })
}

// Действия с кампанией
async function startCampaign(campaign) {
  actionLoading[campaign.id] = true
  try {
    await api.post(`/broadcast/campaigns/${campaign.id}/start`)
    notifications.success('Кампания запущена', 'Массовый обзвон успешно стартовал')
    loadCampaigns()
    pollCampaignStatus(campaign.id)
  } catch (error) {
    notifications.error('Ошибка запуска', 'Не удалось запустить кампанию: ' + (error.response?.data?.detail || error.message))
  } finally {
    actionLoading[campaign.id] = false
  }
}

async function stopCampaign(campaign) {
  actionLoading[campaign.id] = true
  try {
    await api.post(`/broadcast/campaigns/${campaign.id}/stop`)
    notifications.success('Кампания остановлена', 'Массовый обзвон успешно приостановлен')
    loadCampaigns()
  } catch (error) {
    notifications.error('Ошибка остановки', 'Не удалось остановить кампанию: ' + (error.response?.data?.detail || error.message))
  } finally {
    actionLoading[campaign.id] = false
  }
}

async function deleteCampaign(campaign) {
  try {
    await ElMessageBox.confirm(
      `Удалить кампанию ${campaign.name}?`,
      'Подтверждение',
      { confirmButtonText: 'Удалить', cancelButtonText: 'Отмена', type: 'warning' }
    )
    actionLoading[campaign.id] = true
    await api.delete(`/broadcast/campaigns/${campaign.id}`)
    notifications.success('Кампания удалена', 'Массовый обзвон успешно удалён')
    loadCampaigns()
  } catch (error) {
    if (error !== 'cancel') {
      notifications.error('Ошибка удаления', 'Не удалось удалить кампанию: ' + (error.response?.data?.detail || error.message))
    }
  } finally {
    actionLoading[campaign.id] = false
  }
}

function viewResults(campaign) {
  selectedCampaign.value = campaign
  showResultsDialog.value = true
  resultsFilter.value = null
  loadResults()
}

// Polling статуса
const pollTimers = reactive({})

function pollCampaignStatus(campaignId) {
  if (pollTimers[campaignId]) return
  pollTimers[campaignId] = setInterval(async () => {
    try {
      const response = await api.get(`/broadcast/campaigns/${campaignId}/status`)
      const campaignIndex = campaigns.value.findIndex(c => c.id === campaignId)
      if (campaignIndex !== -1) {
        const campaign = await api.get(`/broadcast/campaigns/${campaignId}`)
        campaigns.value[campaignIndex] = campaign.data
        if (!response.data.is_running) {
          clearInterval(pollTimers[campaignId])
          delete pollTimers[campaignId]
        }
      }
    } catch (error) {
      clearInterval(pollTimers[campaignId])
      delete pollTimers[campaignId]
    }
  }, 3000)
}

function parseNumbers(text) {
  if (!text) return []
  // Разделяем по переносам строк и запятым
  const numbers = text.split(/[\n,]/)
    .map(n => n.trim())
    .filter(n => n.length > 0)
    .map(n => n.replace(/[^\d+]/g, '')) // Оставляем только цифры и +
    .filter(n => n.length >= 10) // Минимум 10 цифр
  return [...new Set(numbers)] // Убираем дубликаты
}

function getNumbersCount() {
  return parseNumbers(form.numbersText).length
}

function getProgress(campaign) {
  if (campaign.total_numbers === 0) return 0
  const completed = campaign.completed_calls + campaign.failed_calls
  return Math.round((completed / campaign.total_numbers) * 100)
}

function getProgressStatus(status) {
  if (status === 'completed') return 'success'
  if (status === 'running') return ''
  if (status === 'paused') return 'warning'
  return 'exception'
}

function getStatusType(status) {
  const types = {
    pending: 'info',
    running: 'primary',
    paused: 'warning',
    completed: 'success',
    cancelled: 'danger'
  }
  return types[status] || 'info'
}

function getStatusText(status) {
  const texts = {
    pending: 'Ожидает',
    running: 'Выполняется',
    paused: 'Приостановлена',
    completed: 'Завершена',
    cancelled: 'Отменена'
  }
  return texts[status] || status
}

function getResultStatusType(status) {
  const types = {
    pending: 'info',
    calling: 'primary',
    completed: 'success',
    failed: 'danger',
    no_answer: 'warning'
  }
  return types[status] || 'info'
}

function getResultStatusText(status) {
  const texts = {
    pending: 'Ожидает',
    calling: 'Звонит',
    completed: 'Завершено',
    failed: 'Ошибка',
    no_answer: 'Не ответил'
  }
  return texts[status] || status
}

function formatDate(dateString) {
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

function pluralize(number, forms) {
  const n = Math.abs(number) % 100
  const n1 = n % 10
  if (n > 10 && n < 20) return forms[2]
  if (n1 > 1 && n1 < 5) return forms[1]
  if (n1 === 1) return forms[0]
  return forms[2]
}

function resetForm() {
  form.name = ''
  form.dongle_id = null
  form.melody = ''
  form.numbersText = ''
  form.delay_between_calls = 5
  form.max_retries = 1
  form.call_timeout = 60000
  formRef.value?.resetFields()
}

onMounted(() => {
  loadCampaigns()
  loadDongles()
  loadMelodies()
})
</script>

<style scoped>
.broadcast-view {
  padding: 20px;
}

.compact-card {
  border-radius: 8px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  font-size: 16px;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.loading-container {
  padding: 20px;
}

.empty-container {
  padding: 40px 20px;
}

.campaigns-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.campaign-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  transition: all 0.3s;
}

.campaign-row:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.campaign-status {
  flex-shrink: 0;
}

.status-indicator {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: white;
}

.status-indicator.pending {
  background: #909399;
}

.status-indicator.running {
  background: #409eff;
  animation: pulse 2s infinite;
}

.status-indicator.paused {
  background: #e6a23c;
}

.status-indicator.completed {
  background: #67c23a;
}

.status-indicator.cancelled {
  background: #f56c6c;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.campaign-main {
  flex: 1;
  min-width: 0;
}

.campaign-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.campaign-name {
  font-weight: 600;
  font-size: 15px;
}

.campaign-details {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  font-size: 13px;
  margin-bottom: 12px;
}

.detail-item {
  display: flex;
  gap: 4px;
  align-items: center;
}

.detail-separator {
  color: var(--el-text-color-secondary);
  font-weight: 300;
  user-select: none;
  opacity: 0.5;
}

.detail-label {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.detail-value {
  color: var(--el-text-color-primary);
  font-weight: 500;
}

.detail-value-highlighted {
  color: var(--el-color-primary);
  font-weight: 600;
  font-size: 14px;
}

.text-danger {
  color: var(--el-color-danger);
  font-weight: 600;
}

.campaign-progress {
  max-width: 400px;
}

.campaign-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.results-filters {
  margin-bottom: 16px;
}

.results-list {
  max-height: 400px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.result-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
}

.result-number {
  font-weight: 600;
  min-width: 120px;
}

.result-status {
  min-width: 100px;
}

.result-time {
  margin-left: auto;
  font-size: 12px;
  color: #909399;
}

.form-hint {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}
</style>