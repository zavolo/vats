<template>
  <div class="dashboard-view">
    <el-row :gutter="16" v-loading="loading">
      <el-col :xs="12" :sm="6" v-for="stat in visibleStats" :key="stat.key">
        <div class="stat-card" :class="`stat-${stat.type}`">
          <div class="stat-icon">
            <el-icon :size="24" :color="stat.color">
              <component :is="stat.icon" />
            </el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stat.value }}</div>
            <div class="stat-label">{{ stat.label }}</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top: 16px">
      <el-col :xs="24" :lg="16">
        <el-card class="recent-calls-card">
          <template #header>
            <div class="card-header">
              <span>Последние звонки</span>
              <el-button text @click="$router.push('/calls')" v-if="permissionsStore.canRead('calls')">
                Все звонки
                <el-icon><ArrowRight /></el-icon>
              </el-button>
            </div>
          </template>
          <div v-if="loadingCalls" class="loading-container">
            <el-skeleton :rows="5" animated />
          </div>
          <div v-else-if="recentCalls.length === 0" class="empty-container">
            <el-empty description="Нет звонков" :image-size="80" />
          </div>
          <div v-else class="calls-list">
            <div v-for="call in recentCalls" :key="call.id" class="call-item">
              <div class="call-main">
                <el-tag :type="call.call_type === 'incoming' ? 'success' : 'primary'" size="small" class="call-type-tag">
                  {{ call.call_type === 'incoming' ? 'Входящий' : 'Исходящий' }}
                </el-tag>
                <span class="call-number">{{ call.caller_number }}</span>
                <el-icon class="call-arrow"><Right /></el-icon>
                <span class="call-number">{{ call.called_number }}</span>
              </div>
              <div class="call-details">
                <span class="call-duration">{{ formatDuration(call.duration) }}</span>
                <span class="call-cost">{{ call.cost?.toFixed(2) || '0.00' }} ₽</span>
                <span class="call-date">{{ formatDate(call.started_at) }}</span>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="8">
        <el-card class="info-card">
          <template #header>
            <div class="card-header">
              <span>Информация</span>
            </div>
          </template>
          <div class="profile-info">
            <div class="info-row">
              <span class="info-label">Пользователь</span>
              <span class="info-value">{{ user?.username }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Email</span>
              <span class="info-value">{{ user?.email }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Телефон</span>
              <span class="info-value">{{ user?.phone || 'Не указан' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Баланс</span>
              <span class="info-value balance-value">{{ user?.balance?.toFixed(2) || '0.00' }} ₽</span>
            </div>
            <div class="info-row">
              <span class="info-label">Статус</span>
              <el-tag :type="user?.is_active ? 'success' : 'danger'" size="small">
                {{ user?.is_active ? 'Активен' : 'Неактивен' }}
              </el-tag>
            </div>
          </div>
        </el-card>

        <el-card class="system-status-card" style="margin-top: 16px" v-if="isRoot">
          <template #header>
            <div class="card-header">
              <span>Статус системы</span>
            </div>
          </template>
          <div class="status-item">
            <span>База данных</span>
            <el-tag type="success" size="small">Подключено</el-tag>
          </div>
          <div class="status-item">
            <span>Asterisk</span>
            <el-tag :type="stats.activeDongles > 0 ? 'success' : 'warning'" size="small">
              {{ stats.activeDongles > 0 ? 'Активно' : 'Ожидание' }}
            </el-tag>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { usePermissionsStore } from '@/stores/permissions'
import { statsAPI } from '@/api/stats'
import apiClient from '@/api/client'
import { Phone, Connection, Wallet, ArrowRight, Right } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const authStore = useAuthStore()
const permissionsStore = usePermissionsStore()

const user = computed(() => authStore.user)
const loading = ref(false)
const loadingCalls = ref(false)
const recentCalls = ref([])

const stats = ref({
  totalCalls: 0,
  totalCallsToday: 0,
  activeDongles: 0,
  totalUsers: 1,
  totalBalance: 0,
  totalSpentToday: 0,
  totalSpentMonth: 0
})

const isRoot = computed(() => user.value?.roles?.some(role => role.name === 'root') || false)

const visibleStats = computed(() => {
  const allStats = [
    {
      key: 'calls',
      type: 'primary',
      icon: Phone,
      color: '#409eff',
      value: stats.value.totalCalls,
      label: 'Всего звонков',
      show: true
    },
    {
      key: 'callsToday',
      type: 'success',
      icon: Phone,
      color: '#67c23a',
      value: stats.value.totalCallsToday,
      label: 'Звонков сегодня',
      show: true
    },
    {
      key: 'dongles',
      type: 'warning',
      icon: Connection,
      color: '#e6a23c',
      value: stats.value.activeDongles,
      label: 'Активных донглов',
      show: permissionsStore.canRead('dongles')
    },
    {
      key: 'balance',
      type: 'danger',
      icon: Wallet,
      color: '#f56c6c',
      value: `${(user.value?.balance || 0).toFixed(2)} ₽`,
      label: 'Баланс',
      show: true
    }
  ]
  
  return allStats.filter(stat => stat.show)
})

const loadStats = async () => {
  try {
    loading.value = true
    const response = await statsAPI.getDashboardStats()
    stats.value = {
      totalCalls: response.data.total_calls,
      totalCallsToday: response.data.total_calls_today,
      activeDongles: response.data.active_dongles,
      totalUsers: response.data.total_users,
      totalBalance: response.data.total_balance,
      totalSpentToday: response.data.total_spent_today,
      totalSpentMonth: response.data.total_spent_month
    }
  } catch (error) {
    console.error('Ошибка загрузки статистики:', error)
    ElMessage.error('Не удалось загрузить статистику')
  } finally {
    loading.value = false
  }
}

const loadRecentCalls = async () => {
  if (!permissionsStore.canRead('calls')) return
  
  try {
    loadingCalls.value = true
    const response = await apiClient.get('/calls', { params: { skip: 0, limit: 5 } })
    recentCalls.value = response.data
  } catch (error) {
    console.error('Ошибка загрузки звонков:', error)
  } finally {
    loadingCalls.value = false
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

onMounted(() => {
  loadStats()
  loadRecentCalls()
})
</script>

<style scoped>
.dashboard-view {
  max-width: 1400px;
  margin: 0 auto;
  padding: 16px;
}

.stat-card {
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: all 0.3s;
  cursor: pointer;
  height: 80px;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(45, 90, 61, 0.3);
  border-color: var(--el-color-primary);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background: var(--el-fill-color-light);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-info {
  flex: 1;
  min-width: 0;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--el-text-color-primary);
  line-height: 1.2;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stat-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  font-size: 14px;
}

.recent-calls-card,
.info-card,
.system-status-card {
  box-shadow: 0 2px 8px rgba(45, 90, 61, 0.2);
}

.loading-container,
.empty-container {
  padding: 20px 0;
}

.calls-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.call-item {
  padding: 12px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
  border: 1px solid var(--el-border-color-lighter);
  transition: all 0.2s;
}

.call-item:hover {
  background: var(--el-fill-color);
  border-color: var(--el-border-color);
}

.call-main {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.call-type-tag {
  flex-shrink: 0;
}

.call-number {
  font-weight: 600;
  color: var(--el-text-color-primary);
  font-size: 13px;
}

.call-arrow {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.call-details {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.call-duration,
.call-cost {
  font-weight: 500;
}

.profile-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.info-value {
  font-size: 13px;
  color: var(--el-text-color-primary);
  font-weight: 500;
  text-align: right;
}

.balance-value {
  color: var(--el-color-primary);
  font-weight: 600;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.status-item:not(:last-child) {
  border-bottom: 1px solid var(--el-border-color-lighter);
}

@media (max-width: 768px) {
  .dashboard-view {
    padding: 12px;
  }
  
  .stat-card {
    height: auto;
    padding: 12px;
  }
  
  .stat-value {
    font-size: 18px;
  }
  
  .call-main {
    font-size: 12px;
  }
  
  .call-details {
    flex-wrap: wrap;
    gap: 8px;
  }
}
</style>