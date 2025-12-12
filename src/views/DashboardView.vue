<template>
  <div class="dashboard-view">
    <div class="welcome-banner">
      <h1>Добро пожаловать, {{ user?.username }}!</h1>
      <p>{{ currentGreeting }}</p>
    </div>

    <el-row :gutter="20" v-loading="loading">
      <el-col :xs="24" :sm="12" :md="6" v-for="stat in visibleStats" :key="stat.key">
        <el-card class="stat-card" :class="`stat-${stat.type}`">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon :size="32" :color="stat.color">
                <component :is="stat.icon" />
              </el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stat.value }}</div>
              <div class="stat-label">{{ stat.label }}</div>
            </div>
          </div>
          <div class="stat-footer" v-if="stat.footer">
            <el-icon><TrendCharts /></el-icon>
            <span>{{ stat.footer }}</span>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :xs="24" :lg="16">
        <el-card class="activity-card">
          <template #header>
            <div class="card-header">
              <span>Последние звонки</span>
              <el-button text @click="$router.push('/calls')" v-if="permissionsStore.canRead('calls')">
                Все звонки
                <el-icon><ArrowRight /></el-icon>
              </el-button>
            </div>
          </template>
          <el-table
            :data="recentCalls"
            v-loading="loadingCalls"
            style="width: 100%"
            :show-header="true"
          >
            <el-table-column prop="call_type" label="Тип" width="100">
              <template #default="{ row }">
                <el-tag :type="row.call_type === 'incoming' ? 'success' : 'primary'" size="small">
                  {{ row.call_type === 'incoming' ? 'Вх.' : 'Исх.' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="caller_number" label="Номер" />
            <el-table-column label="Длительность" width="120">
              <template #default="{ row }">
                {{ formatDuration(row.duration) }}
              </template>
            </el-table-column>
            <el-table-column label="Стоимость" width="100">
              <template #default="{ row }">
                {{ row.cost?.toFixed(2) || '0.00' }} ₽
              </template>
            </el-table-column>
            <el-table-column label="Дата" width="160">
              <template #default="{ row }">
                {{ formatDate(row.started_at) }}
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!loadingCalls && recentCalls.length === 0" description="Нет звонков" />
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="8">
        <el-card class="quick-actions-card">
          <template #header>
            <div class="card-header">
              <span>Быстрые действия</span>
            </div>
          </template>
          <el-space direction="vertical" :size="12" style="width: 100%">
            <el-button 
              v-if="permissionsStore.canRead('calls')" 
              type="primary" 
              @click="$router.push('/calls')"
              style="width: 100%"
            >
              <el-icon><Phone /></el-icon>
              Просмотр звонков
            </el-button>
            <el-button 
              v-if="permissionsStore.canRead('dongles')" 
              type="success" 
              @click="$router.push('/dongles')"
              style="width: 100%"
            >
              <el-icon><Connection /></el-icon>
              Управление донглами
            </el-button>
            <el-button 
              v-if="permissionsStore.canRead('users')" 
              @click="$router.push('/users')"
              style="width: 100%"
            >
              <el-icon><UserFilled /></el-icon>
              Пользователи
            </el-button>
            <el-button 
              type="warning" 
              @click="$router.push('/payments')"
              style="width: 100%"
            >
              <el-icon><Wallet /></el-icon>
              Пополнить баланс
            </el-button>
          </el-space>

          <el-divider />

          <div class="system-status" v-if="isRoot">
            <h4>Статус системы</h4>
            <el-space direction="vertical" :size="8" style="width: 100%">
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
            </el-space>
          </div>
        </el-card>

        <el-card class="info-card" style="margin-top: 20px">
          <template #header>
            <div class="card-header">
              <span>Информация</span>
            </div>
          </template>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="Email">{{ user?.email }}</el-descriptions-item>
            <el-descriptions-item label="Телефон">{{ user?.phone || 'Не указан' }}</el-descriptions-item>
            <el-descriptions-item label="Статус">
              <el-tag :type="user?.is_active ? 'success' : 'danger'" size="small">
                {{ user?.is_active ? 'Активен' : 'Неактивен' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="Роли" v-if="userRoles.length > 0">
              <el-space wrap>
                <el-tag v-for="role in userRoles" :key="role" size="small">{{ role }}</el-tag>
              </el-space>
            </el-descriptions-item>
          </el-descriptions>
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
import { 
  Phone,
  Connection,
  Wallet,
  UserFilled,
  TrendCharts,
  ArrowRight
} from '@element-plus/icons-vue'
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

const isRoot = computed(() => 
  user.value?.roles?.some(role => role.name === 'root') || false
)

const userRoles = computed(() => 
  user.value?.roles?.map(role => role.name) || []
)

const currentGreeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 6) return 'Доброй ночи! Вы работаете поздно.'
  if (hour < 12) return 'Доброе утро! Продуктивного дня.'
  if (hour < 18) return 'Добрый день! Успехов в работе.'
  return 'Добрый вечер! Завершайте день с успехом.'
})

const visibleStats = computed(() => {
  const allStats = [
    {
      key: 'calls',
      type: 'primary',
      icon: Phone,
      color: '#409eff',
      value: stats.value.totalCalls,
      label: 'Всего звонков',
      footer: `Сегодня: ${stats.value.totalCallsToday}`,
      show: true
    },
    {
      key: 'dongles',
      type: 'success',
      icon: Connection,
      color: '#67c23a',
      value: stats.value.activeDongles,
      label: 'Активных донглов',
      show: permissionsStore.canRead('dongles')
    },
    {
      key: 'users',
      type: 'info',
      icon: UserFilled,
      color: '#909399',
      value: stats.value.totalUsers,
      label: 'Пользователей',
      show: isRoot.value
    },
    {
      key: 'balance',
      type: 'warning',
      icon: Wallet,
      color: '#e6a23c',
      value: `${(user.value?.balance || 0).toFixed(2)} ₽`,
      label: 'Баланс',
      footer: `Потрачено сегодня: ${stats.value.totalSpentToday.toFixed(2)} ₽`,
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
    const response = await apiClient.get('/calls', { 
      params: { skip: 0, limit: 5 } 
    })
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
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
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
}

.welcome-banner {
  background: linear-gradient(135deg, var(--el-color-primary) 0%, var(--el-color-primary-light-3) 100%);
  padding: 30px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 4px 12px rgba(45, 90, 61, 0.4);
}

.welcome-banner h1 {
  margin: 0 0 10px 0;
  color: #ffffff;
  font-size: 28px;
  font-weight: 600;
}

.welcome-banner p {
  margin: 0;
  color: rgba(255, 255, 255, 0.9);
  font-size: 16px;
}

.stat-card {
  margin-bottom: 20px;
  transition: all 0.3s;
  cursor: pointer;
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 6px 16px rgba(45, 90, 61, 0.5);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 20px;
}

.stat-icon {
  padding: 15px;
  border-radius: 12px;
  background: var(--el-fill-color-light);
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--el-text-color-primary);
  line-height: 1;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.stat-footer {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid var(--el-border-color-lighter);
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  font-size: 16px;
}

.activity-card,
.quick-actions-card,
.info-card {
  box-shadow: 0 2px 8px rgba(45, 90, 61, 0.3);
}

.system-status h4 {
  margin: 0 0 15px 0;
  color: var(--el-text-color-primary);
  font-size: 14px;
  font-weight: 600;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.status-item span {
  color: var(--el-text-color-regular);
}
</style>