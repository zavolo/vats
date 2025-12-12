<template>
  <div class="payments-view">
    <el-row :gutter="16">
      <el-col :xs="24" :md="8">
        <el-card class="balance-card">
          <template #header>
            <div class="card-header">
              <span>Баланс</span>
            </div>
          </template>
          <div class="balance-info">
            <div class="balance-amount">{{ user?.balance?.toFixed(2) || '0.00' }} ₽</div>
            <el-button type="primary" @click="showTopUpDialog = true" style="width: 100%; margin-top: 16px">
              <el-icon><Wallet /></el-icon>
              Пополнить баланс
            </el-button>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :md="16">
        <el-card class="stats-card">
          <template #header>
            <div class="card-header">
              <span>Статистика расходов</span>
            </div>
          </template>
          <el-row :gutter="16">
            <el-col :xs="12">
              <div class="stat-item">
                <div class="stat-label">Сегодня</div>
                <div class="stat-value">{{ stats.totalSpentToday.toFixed(2) }} ₽</div>
              </div>
            </el-col>
            <el-col :xs="12">
              <div class="stat-item">
                <div class="stat-label">За месяц</div>
                <div class="stat-value">{{ stats.totalSpentMonth.toFixed(2) }} ₽</div>
              </div>
            </el-col>
          </el-row>
        </el-card>
      </el-col>
    </el-row>

    <el-card style="margin-top: 16px">
      <template #header>
        <div class="card-header">
          <span>История платежей</span>
          <el-button type="primary" @click="loadPayments" size="small">
            <el-icon><Refresh /></el-icon>
            Обновить
          </el-button>
        </div>
      </template>

      <el-table :data="payments" v-loading="loading" style="width: 100%" stripe size="small">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column label="Сумма" width="120">
          <template #default="{ row }">
            <span style="font-weight: 600; color: var(--el-color-success);">
              +{{ row.amount?.toFixed(2) }} ₽
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="method" label="Метод" width="120">
          <template #default="{ row }">
            {{ row.method === 'yoomoney' ? 'ЮMoney' : row.method }}
          </template>
        </el-table-column>
        <el-table-column label="Статус" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="label" label="Метка" min-width="200" show-overflow-tooltip />
        <el-table-column label="Дата" width="140">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.limit"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        @size-change="loadPayments"
        @current-change="loadPayments"
        style="margin-top: 16px; justify-content: center"
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
import { ref, computed, onMounted } from 'vue'
import { Refresh, Wallet } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import apiClient from '@/api/client'
import { statsAPI } from '@/api/stats'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
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
    ElMessage.error('Не удалось загрузить платежи')
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
    ElMessage.warning('Минимальная сумма пополнения 10 ₽')
    return
  }
  try {
    creating.value = true
    const response = await apiClient.post('/payments/create', topUpForm.value)
    window.open(response.data.payment_url, '_blank')
    ElMessage.success('Платёж создан. Откройте новую вкладку для оплаты')
    showTopUpDialog.value = false
    topUpForm.value = { amount: 100, method: 'yoomoney' }
    setTimeout(() => loadPayments(), 2000)
  } catch (error) {
    console.error('Ошибка создания платежа:', error)
    ElMessage.error(error.response?.data?.detail || 'Не удалось создать платёж')
  } finally {
    creating.value = false
  }
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const getStatusType = (status) => {
  const types = { 'completed': 'success', 'pending': 'warning', 'failed': 'danger' }
  return types[status] || 'info'
}

const getStatusLabel = (status) => {
  const labels = { 'completed': 'Завершён', 'pending': 'Ожидание', 'failed': 'Не удался' }
  return labels[status] || status
}

onMounted(() => {
  loadPayments()
  loadStats()
})
</script>

<style scoped>
.payments-view {
  padding: 16px;
  max-width: 1400px;
  margin: 0 auto;
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
  padding: 16px 0;
}

.balance-amount {
  font-size: 36px;
  font-weight: 700;
  color: var(--el-color-primary);
}

.stat-item {
  text-align: center;
  padding: 16px;
  background: var(--el-fill-color-light);
  border-radius: 8px;
}

.stat-label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin-bottom: 8px;
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

@media (max-width: 768px) {
  .payments-view {
    padding: 12px;
  }
  
  .balance-amount {
    font-size: 28px;
  }
}
</style>