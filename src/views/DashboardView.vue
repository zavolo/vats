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
          <el-table :data="recentCalls" v-loading="loadingCalls" style="width: 100%">
            <el-table-column prop="call_type" label="Тип" width="80">
              <template #default="{ row }">
                <el-tag :type="row.call_type === 'incoming' ? 'success' : 'primary'" size="small">
                  {{ row.call_type === 'incoming' ? 'Вх.' : 'Исх.' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="caller_number" label="Номер" />
            <el-table-column label="Длительность" width="100">
              <template #default="{ row }">
                {{ formatDuration(row.duration) }}
              </template>
            </el-table-column>
            <el-table-column label="Стоимость" width="90">
              <template #default="{ row }">
                {{ row.cost?.toFixed(2) || '0.00' }} ₽
              </template>
            </el-table-column>
            <el-table-column label="Дата" width="130">
              <template #default="{ row }">
                {{ formatDate(row.started_at) }}
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!loadingCalls && recentCalls.length === 0" description="Нет звонков" :image-size="60" />
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="8">
        <el-card class="info-card">
          <template #header>
            <div class="card-header">
              <span>Информация</span>
            </div>
          </template>
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="Пользователь">{{ user?.username }}</el-descriptions-item>
            <el-descriptions-item label="Email">{{ user?.email }}</el-descriptions-item>
            <el-descriptions-item label="Телефон">{{ user?.phone || 'Не указан' }}</el-descriptions-item>
            <el-descriptions-item label="Баланс">
              <span style="color: var(--el-color-primary); font-weight: 600;">
                {{ user?.balance?.toFixed(2) || '0.00' }} ₽
              </span>
            </el-descriptions-item>
            <el-descriptions-item label="Статус">
              <el-tag :type="user?.is_active ? 'success' : 'danger'" size="small">
                {{ user?.is_active ? 'Активен' : 'Неактивен' }}
              </el-tag>
            </el-descriptions-item>
          </el-descriptions>
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
import { Phone, Connection, Wallet, UserFilled, ArrowRight } from '@element-plus/icons-vue'
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
}
</style>