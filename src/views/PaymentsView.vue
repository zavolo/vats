<template>
  <div class="payments-view">
    <el-row :gutter="12">
      <el-col :xs="24" :sm="8">
        <el-card class="compact-card balance-card">
          <template #header>
            <div class="card-header">
              <span>Баланс</span>
            </div>
          </template>
          <div class="balance-info">
            <div class="balance-amount">{{ user?.balance?.toFixed(2) || '0.00' }} ₽</div>
            <el-button type="primary" @click="showTopUpDialog = true" size="small" style="width: 100%; margin-top: 12px">
              <el-icon><Wallet /></el-icon>
              Пополнить
            </el-button>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="16">
        <el-card class="compact-card">
          <template #header>
            <div class="card-header">
              <span>Статистика расходов</span>
            </div>
          </template>
          <div class="stats-row">
            <div class="stat-item">
              <div class="stat-label">Сегодня</div>
              <div class="stat-value">{{ stats.totalSpentToday.toFixed(2) }} ₽</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">За месяц</div>
              <div class="stat-value">{{ stats.totalSpentMonth.toFixed(2) }} ₽</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="compact-card" style="margin-top: 12px">
      <template #header>
        <div class="card-header">
          <span>История платежей</span>
          <el-button type="primary" @click="loadPayments" size="small" :loading="loading" :icon="Refresh" />
        </div>
      </template>

      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="5" animated />
      </div>

      <div v-else-if="payments.length === 0" class="empty-container">
        <el-empty description="Нет платежей" :image-size="60" />
      </div>

      <div v-else class="payments-list">
        <div
          v-for="payment in payments"
          :key="payment.id"
          class="payment-row"
        >
          <div class="payment-index">#{{ payment.id }}</div>

          <div class="payment-status">
            <div class="status-indicator" :class="getStatusClass(payment.status)"></div>
          </div>

          <div class="payment-main">
            <div class="payment-header">
              <span class="payment-amount">+{{ payment.amount?.toFixed(2) }} ₽</span>
              <el-tag :type="getStatusType(payment.status)" size="small">
                {{ getStatusLabel(payment.status) }}
              </el-tag>
            </div>
            <div class="payment-details">
              <span class="detail-item">
                <span class="detail-label">Метод:</span>
                <span class="detail-value">{{ getMethodLabel(payment.method) }}</span>
              </span>
              <span class="detail-item" v-if="payment.label">
                <span class="detail-label">Метка:</span>
                <span class="detail-value">{{ payment.label }}</span>
              </span>
            </div>
          </div>

          <div class="payment-time">
            {{ formatDate(payment.created_at) }}
          </div>
        </div>
      </div>

      <el-pagination
        v-if="payments.length > 0"
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.limit"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        @size-change="loadPayments"
        @current-change="loadPayments"
        class="pagination"
        small
      />
    </el-card>

    <el-dialog v-model="showTopUpDialog" title="Пополнение баланса" width="500px">
      <el-form :model="topUpForm" label-width="120px" size="default">
        <el-form-item label="Сумма">
          <el-input-number
            v-model="topUpForm.amount"
            :min="10"
            :max="100000"
            :step="100"
            :precision="2"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="Метод оплаты">
          <el-select v-model="topUpForm.method" style="width: 100%">
            <el-option label="ЮMoney" value="yoomoney" />
          </el-select>
        </el-form-item>
        <el-alert
          title="После нажатия кнопки вы будете перенаправлены на страницу оплаты"
          type="info"
          :closable="false"
          show-icon
        />
      </el-form>
      <template #footer>
        <el-button @click="showTopUpDialog = false">Отмена</el-button>
        <el-button type="primary" @click="createPayment" :loading="creating">Продолжить</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onActivated } from 'vue'
import { Refresh, Wallet } from '@element-plus/icons-vue'
import { useNotifications } from '@/composables/useNotifications'
import apiClient from '@/api/client'
import { statsAPI } from '@/api/stats'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const notifications = useNotifications()
const user = computed(() => authStore.user)

const payments = ref([])
const loading = ref(false)
const creating = ref(false)
const showTopUpDialog = ref(false)
const pagination = ref({ page: 1, limit: 20, total: 0 })
const topUpForm = ref({ amount: 100, method: 'yoomoney' })
const stats = ref({ totalSpentToday: 0, totalSpentMonth: 0 })

const loadPayments = async () => {
  try {
    loading.value = true
    const params = {
      skip: (pagination.value.page - 1) * pagination.value.limit,
      limit: pagination.value.limit
    }
    const response = await apiClient.get('/payments', { params })
    payments.value = response.data
    pagination.value.total = response.data.length
  } catch (error) {
    console.error('Ошибка загрузки платежей:', error)
    notifications.error('Ошибка загрузки', 'Не удалось загрузить платежи')
  } finally {
    loading.value = false
  }
}

const loadStats = async () => {
  try {
    const response = await statsAPI.getDashboardStats()
    stats.value = {
      totalSpentToday: response.data.total_spent_today,
      totalSpentMonth: response.data.total_spent_month
    }
  } catch (error) {
    console.error('Ошибка загрузки статистики:', error)
  }
}

const createPayment = async () => {
  if (topUpForm.value.amount < 10) {
    notifications.warning('Предупреждение', 'Минимальная сумма пополнения 10 ₽')
    return
  }
  try {
    creating.value = true
    const response = await apiClient.post('/payments/create', topUpForm.value)
    window.open(response.data.payment_url, '_blank')
    notifications.success('Успешно', 'Платёж создан. Откройте новую вкладку для оплаты')
    showTopUpDialog.value = false
    topUpForm.value = { amount: 100, method: 'yoomoney' }
    setTimeout(() => loadPayments(), 2000)
  } catch (error) {
    console.error('Ошибка создания платежа:', error)
    notifications.error('Ошибка создания', error.response?.data?.detail || 'Не удалось создать платёж')
  } finally {
    creating.value = false
  }
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const getStatusType = (status) => {
  const types = { 'completed': 'success', 'pending': 'warning', 'failed': 'danger', 'cancelled': 'info' }
  return types[status] || 'info'
}

const getStatusClass = (status) => {
  return {
    completed: status === 'completed',
    pending: status === 'pending',
    failed: status === 'failed',
    cancelled: status === 'cancelled'
  }
}

const getStatusLabel = (status) => {
  const labels = { 'completed': 'Завершён', 'pending': 'Ожидание', 'failed': 'Ошибка', 'cancelled': 'Отменён' }
  return labels[status] || status
}

const getMethodLabel = (method) => {
  const labels = { 'yoomoney': 'ЮMoney', 'card': 'Карта', 'admin': 'Админ' }
  return labels[method] || method
}

onMounted(() => {
  loadPayments()
  loadStats()
})

onActivated(() => {
  loadPayments()
  loadStats()
})
</script>

<style scoped>
.payments-view {
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

.balance-card {
  height: 100%;
}

.balance-info {
  text-align: center;
  padding: 8px 0;
}

.balance-amount {
  font-size: 28px;
  font-weight: 700;
  color: var(--el-color-primary);
}

.stats-row {
  display: flex;
  gap: 12px;
}

.stat-item {
  flex: 1;
  text-align: center;
  padding: 12px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
}

.stat-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.loading-container, .empty-container {
  padding: 24px 0;
}

.payments-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.payment-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  transition: background-color 0.15s;
}

.payment-row:hover {
  background: var(--el-fill-color-light);
}

.payment-index {
  min-width: 40px;
  text-align: center;
  font-size: 11px;
  color: var(--el-text-color-placeholder);
  font-family: 'SF Mono', Monaco, 'Courier New', monospace;
  flex-shrink: 0;
}

.payment-status {
  flex-shrink: 0;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--el-color-info);
}

.status-indicator.completed {
  background: var(--el-color-success);
  box-shadow: 0 0 6px var(--el-color-success);
}

.status-indicator.pending {
  background: var(--el-color-warning);
  box-shadow: 0 0 6px var(--el-color-warning);
}

.status-indicator.failed {
  background: var(--el-color-danger);
}

.status-indicator.cancelled {
  background: var(--el-color-info);
}

.payment-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.payment-header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.payment-amount {
  font-weight: 700;
  font-size: 14px;
  color: var(--el-color-success);
}

.payment-details {
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

.payment-time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
  flex-shrink: 0;
}

.pagination {
  margin-top: 16px;
  justify-content: center;
}

@media (max-width: 768px) {
  .payments-view {
    padding: 8px;
  }

  .card-header {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }

  .balance-amount {
    font-size: 24px;
  }

  .stats-row {
    flex-direction: column;
  }

  .payment-row {
    flex-wrap: wrap;
    gap: 8px;
  }

  .payment-main {
    flex: 1 1 calc(100% - 80px);
  }

  .payment-time {
    flex: 0 0 auto;
  }
}
</style>