<template>
  <div class="sms-view">
    <el-card class="compact-card">
      <template #header>
        <div class="card-header">
          <span>
            SMS сообщения
            <el-badge v-if="unreadCount > 0" :value="unreadCount" class="unread-badge" />
          </span>
          <div class="header-actions">
            <el-select v-model="filters.direction" placeholder="Все" clearable @change="loadSMS" size="small" style="width: 120px">
              <el-option label="Все" value="" />
              <el-option label="Входящие" value="incoming" />
              <el-option label="Исходящие" value="outgoing" />
            </el-select>
            <el-input v-model="filters.phone" placeholder="Поиск по номеру" clearable @clear="loadSMS" @keyup.enter="loadSMS" size="small" style="width: 140px" />
            <el-button type="primary" @click="loadSMS" size="small" :loading="loading" :icon="Refresh" />
            <el-button type="success" @click="showSendDialog = true" size="small" :icon="Message">
              Отправить
            </el-button>
          </div>
        </div>
      </template>

      <div class="quick-filters">
        <el-checkbox v-model="filters.unreadOnly" @change="loadSMS" size="small">Только непрочитанные</el-checkbox>
        <el-button v-if="unreadSelectedCount > 0" type="success" size="small" @click="markSelectedRead">
          Прочитать ({{ unreadSelectedCount }})
        </el-button>
      </div>

      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="5" animated />
      </div>

      <div v-else-if="messages.length === 0" class="empty-container">
        <el-empty :description="filters.unreadOnly ? 'Нет непрочитанных SMS сообщений' : 'Нет SMS сообщений'" :image-size="60" />
      </div>

      <div v-else class="sms-list">
        <div
          v-for="sms in messages"
          :key="sms.id"
          class="sms-row"
          :class="{ unread: !sms.is_read && sms.direction === 'incoming' }"
        >
          <div class="sms-select">
            <el-checkbox v-model="sms.selected" @change="updateSelection" />
          </div>

          <div class="sms-direction">
            <el-icon :class="sms.direction === 'incoming' ? 'incoming' : 'outgoing'">
              <Message />
            </el-icon>
          </div>

          <div class="sms-main">
            <div class="sms-header">
              <span class="sms-phone">{{ sms.phone_number }}</span>
              <el-tag :type="sms.direction === 'incoming' ? 'success' : 'primary'" size="small">
                {{ sms.direction === 'incoming' ? 'Входящее' : 'Исходящее' }}
              </el-tag>
              <el-tag :type="getStatusType(sms.status)" size="small">
                {{ getStatusLabel(sms.status) }}
              </el-tag>
            </div>
            <div class="sms-text" :class="{ 'unread-text': !sms.is_read && sms.direction === 'incoming' }">
              {{ sms.message }}
            </div>
            <div class="sms-meta">
              <span class="meta-item" v-if="sms.dongle_name">
                <span class="meta-label">Донгл:</span>
                <span class="meta-value">{{ sms.dongle_name }}</span>
              </span>
              <span class="meta-item">
                <span class="meta-value time">{{ formatDate(sms.created_at) }}</span>
              </span>
            </div>
          </div>

          <div class="sms-actions">
            <el-button
              v-if="sms.direction === 'incoming'"
              size="small"
              @click="replyTo(sms)"
            >
              Ответить
            </el-button>
          </div>
        </div>
      </div>

      <el-pagination
        v-if="messages.length > 0"
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.limit"
        :total="pagination.total"
        :page-sizes="[20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        @size-change="loadSMS"
        @current-change="loadSMS"
        class="pagination"
        small
      />
    </el-card>

    <el-dialog v-model="showSendDialog" title="Отправить SMS" width="500px">
      <el-form :model="sendForm" label-width="100px" size="default">
        <el-form-item label="Донгл" required>
          <el-select v-model="sendForm.dongle_id" placeholder="Выберите донгл" style="width: 100%">
            <el-option
              v-for="dongle in dongles"
              :key="dongle.id"
              :label="`${dongle.name} (${dongle.phone_number || 'нет номера'})`"
              :value="dongle.id"
              :disabled="!dongle.is_active || !dongle.is_online"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="Номер" required>
          <el-input v-model="sendForm.phone_number" placeholder="+79001234567" />
        </el-form-item>
        <el-form-item label="Сообщение" required>
          <el-input
            v-model="sendForm.message"
            type="textarea"
            :rows="4"
            placeholder="Текст сообщения"
            :maxlength="1000"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showSendDialog = false">Отмена</el-button>
        <el-button type="primary" @click="sendSMS" :loading="sending">Отправить</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onActivated, onUnmounted, onDeactivated } from 'vue'
import { Refresh, Message } from '@element-plus/icons-vue'
import { useNotifications } from '@/composables/useNotifications'
import apiClient from '@/api/client'

const notifications = useNotifications()

const messages = ref([])
const dongles = ref([])
const loading = ref(false)
const sending = ref(false)
const showSendDialog = ref(false)
const unreadCount = ref(0)
const selectedIds = ref([])
const refreshInterval = ref(null)
const REFRESH_INTERVAL_MS = 5000 // 5 секунд

const filters = ref({ direction: '', phone: '', unreadOnly: false })
const pagination = ref({ page: 1, limit: 20, total: 0 })
const sendForm = ref({ dongle_id: null, phone_number: '', message: '' })

const loadSMS = async () => {
  try {
    loading.value = true
    const params = {
      skip: (pagination.value.page - 1) * pagination.value.limit,
      limit: pagination.value.limit,
      _t: Date.now()
    }
    if (filters.value.direction) params.direction = filters.value.direction
    if (filters.value.phone) params.phone_number = filters.value.phone
    if (filters.value.unreadOnly) params.is_read = false

    const response = await apiClient.get('/sms', {
      params,
      headers: { 'Cache-Control': 'no-cache' }
    })
    messages.value = response.data.map(m => ({ ...m, selected: false }))
    pagination.value.total = response.data.length
    selectedIds.value = []
  } catch (error) {
    console.error('Ошибка загрузки SMS:', error)
    notifications.error('Ошибка загрузки', 'Не удалось загрузить SMS')
  } finally {
    loading.value = false
  }
}

const loadUnreadCount = async () => {
  try {
    const response = await apiClient.get('/sms/unread-count')
    unreadCount.value = response.data.count
  } catch (error) {
    console.error('Ошибка:', error)
  }
}

const loadDongles = async () => {
  try {
    const response = await apiClient.get('/dongles')
    dongles.value = response.data
  } catch (error) {
    console.error('Ошибка загрузки донглов:', error)
  }
}

const sendSMS = async () => {
  if (!sendForm.value.dongle_id || !sendForm.value.phone_number || !sendForm.value.message) {
    notifications.warning('Предупреждение', 'Заполните все поля')
    return
  }
  try {
    sending.value = true
    await apiClient.post('/sms/send', sendForm.value)
    notifications.success('Успешно', 'SMS отправлено')
    showSendDialog.value = false
    sendForm.value = { dongle_id: null, phone_number: '', message: '' }
    loadSMS()
  } catch (error) {
    console.error('Ошибка отправки:', error)
    notifications.error('Ошибка отправки', error.response?.data?.detail || 'Не удалось отправить SMS')
  } finally {
    sending.value = false
  }
}

const updateSelection = () => {
  selectedIds.value = messages.value.filter(m => m.selected).map(m => m.id)
}

// Количество выбранных непрочитанных входящих сообщений
const unreadSelectedCount = computed(() => {
  return messages.value.filter(m => m.selected && !m.is_read && m.direction === 'incoming').length
})

const markSelectedRead = async () => {
  const unreadIds = messages.value
    .filter(m => m.selected && !m.is_read && m.direction === 'incoming')
    .map(m => m.id)
  if (unreadIds.length === 0) return

  try {
    await apiClient.post('/sms/mark-read', { ids: unreadIds })
    notifications.success('Успешно', 'Отмечено как прочитанное')
    loadSMS()
    loadUnreadCount()
  } catch (error) {
    notifications.error('Ошибка', 'Не удалось отметить сообщения')
  }
}

const replyTo = (sms) => {
  sendForm.value.phone_number = sms.phone_number
  if (sms.dongle_id) sendForm.value.dongle_id = sms.dongle_id
  showSendDialog.value = true
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const getStatusType = (status) => {
  const types = { 'sent': 'success', 'delivered': 'success', 'received': 'success', 'pending': 'warning', 'failed': 'danger' }
  return types[status] || 'info'
}

const getStatusLabel = (status) => {
  const labels = { 'sent': 'Отправлено', 'delivered': 'Доставлено', 'received': 'Получено', 'pending': 'Ожидание', 'failed': 'Ошибка' }
  return labels[status] || status
}

// Тихое обновление без индикатора загрузки
const silentRefresh = async () => {
  try {
    const params = {
      skip: (pagination.value.page - 1) * pagination.value.limit,
      limit: pagination.value.limit,
      _t: Date.now()
    }
    if (filters.value.direction) params.direction = filters.value.direction
    if (filters.value.phone) params.phone_number = filters.value.phone
    if (filters.value.unreadOnly) params.is_read = false

    const [smsResponse, countResponse] = await Promise.all([
      apiClient.get('/sms', { params, headers: { 'Cache-Control': 'no-cache' } }),
      apiClient.get('/sms/unread-count')
    ])

    // Сохраняем выбранные элементы
    const selectedSet = new Set(selectedIds.value)
    messages.value = smsResponse.data.map(m => ({ ...m, selected: selectedSet.has(m.id) }))
    pagination.value.total = smsResponse.data.length
    unreadCount.value = countResponse.data.count
  } catch (error) {
    console.error('Ошибка обновления SMS:', error)
  }
}

const startAutoRefresh = () => {
  stopAutoRefresh()
  refreshInterval.value = setInterval(silentRefresh, REFRESH_INTERVAL_MS)
}

const stopAutoRefresh = () => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
    refreshInterval.value = null
  }
}

onMounted(() => {
  loadSMS()
  loadDongles()
  loadUnreadCount()
  startAutoRefresh()
})

onActivated(() => {
  loadSMS()
  loadUnreadCount()
  startAutoRefresh()
})

onDeactivated(() => {
  stopAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<style scoped>
.sms-view {
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

.unread-badge {
  margin-left: 8px;
}

.quick-filters {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.loading-container, .empty-container {
  padding: 24px 0;
}

.sms-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sms-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  transition: background-color 0.15s;
}

.sms-row:hover {
  background: var(--el-fill-color-light);
}

.sms-row.unread {
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.12), rgba(64, 158, 255, 0.06));
  border-left: 3px solid var(--el-color-primary);
  padding-left: 9px;
}

.sms-row.unread:hover {
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.18), rgba(64, 158, 255, 0.10));
}

.sms-row.unread .meta-value {
  color: var(--el-text-color-primary);
}

.sms-select {
  flex-shrink: 0;
  padding-top: 2px;
}

.sms-direction {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: var(--el-fill-color-light);
}

.sms-direction .el-icon {
  font-size: 16px;
}

.sms-direction .incoming {
  color: var(--el-color-success);
}

.sms-direction .outgoing {
  color: var(--el-color-primary);
}

.sms-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sms-header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.sms-phone {
  font-weight: 600;
  font-size: 13px;
  color: var(--el-text-color-primary);
}

.sms-text {
  font-size: 13px;
  color: var(--el-text-color-regular);
  line-height: 1.4;
  word-break: break-word;
}

.sms-text.unread-text {
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.sms-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 12px;
  margin-top: 2px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.meta-label {
  color: var(--el-text-color-secondary);
}

.meta-value {
  color: var(--el-text-color-regular);
}

.meta-value.time {
  color: var(--el-text-color-secondary);
}

.sms-actions {
  flex-shrink: 0;
}

.pagination {
  margin-top: 16px;
  justify-content: center;
}

@media (max-width: 768px) {
  .sms-view {
    padding: 8px;
  }

  .card-header {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .sms-row {
    flex-wrap: wrap;
    gap: 8px;
  }

  .sms-main {
    flex: 1 1 calc(100% - 80px);
  }

  .sms-actions {
    flex: 1 1 100%;
    display: flex;
    justify-content: flex-end;
  }
}
</style>