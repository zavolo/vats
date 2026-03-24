<template>
  <div class="dashboard-view" :class="{ 'admin-dashboard': isAdmin }">
    <el-row :gutter="isAdmin ? 0 : 12" v-loading="loading">
      <el-col :xs="12" :sm="6" :md="4" :lg="isAdmin ? 8 : 3" v-for="stat in visibleStats" :key="stat.key">
        <div class="stat-card" :class="[`stat-${stat.type}`, { 'admin-stat-card': isAdmin }]">
          <el-icon class="stat-icon" :size="18">
            <component :is="stat.icon" />
          </el-icon>
          <div class="stat-content">
            <div class="stat-value">{{ stat.value }}</div>
            <div class="stat-label">{{ stat.label }}</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="isAdmin ? 0 : 12" :style="isRoot && !isAdmin ? 'margin-top: 12px; display: flex;' : 'margin-top: 12px'">
      <el-col :xs="24" :lg="isAdmin ? 24 : 14" :style="isRoot && !isAdmin ? 'display: flex;' : ''">
        <el-card class="compact-card" :class="{ 'admin-calls-card': isAdmin, 'root-calls-card': isRoot && !isAdmin }" :style="isAdmin ? 'margin: 6px' : (isRoot && !isAdmin ? 'width: 100%;' : '')">
          <template #header>
            <div class="card-header">
              <span>Последние звонки</span>
              <div style="display: flex; gap: 8px; align-items: center;">
                <el-button text size="small" @click="toggleBlurNumbers" :icon="blurNumbers ? Hide : View" v-if="recentCalls.length > 0">
                  {{ blurNumbers ? 'Показать' : 'Скрыть' }}
                </el-button>
                <el-button text size="small" @click="$router.push('/calls')">
                  Все <el-icon><ArrowRight /></el-icon>
                </el-button>
              </div>
            </div>
          </template>
          <div v-if="loadingCalls" class="loading-container">
            <el-skeleton :rows="3" animated />
          </div>
          <div v-else-if="recentCalls.length === 0" class="empty-container">
            <el-empty description="Нет звонков" :image-size="60" />
          </div>
          <div v-else class="calls-list">
            <div v-for="call in recentCalls" :key="call.id" class="call-row">
              <div class="call-direction">
                <el-icon :class="call.call_type === 'incoming' ? 'incoming' : 'outgoing'">
                  <Phone />
                </el-icon>
              </div>
              <div class="call-main">
                <span class="call-number" :class="{ 'blurred-number': blurNumbers }">{{ formatPhoneNumber(call.caller_number || call.called_number) }}</span>
                <span class="call-company" v-if="isRoot && call.company_name">{{ call.company_name }}</span>
              </div>
              <div class="call-meta">
                <span class="call-duration">{{ formatDuration(call.duration) }}</span>
                <span class="call-cost">{{ call.cost?.toFixed(2) || '0.00' }} ₽</span>
              </div>
              <div class="call-time">{{ formatDate(call.started_at) }}</div>
            </div>
          </div>
        </el-card>

      </el-col>

      <el-col :xs="24" :lg="10" v-if="!isAdmin" :style="isRoot ? 'display: flex; flex-direction: column; gap: 12px;' : ''">
          <el-card class="compact-card" :style="isRoot ? 'flex: 1;' : ''">
            <template #header>
              <div class="card-header">
                <span>Мой профиль</span>
              </div>
            </template>
            <div class="profile-grid">
              <div class="profile-row">
                <span>Пользователь</span>
                <strong>{{ user?.username }}</strong>
              </div>
              <div class="profile-row">
                <span>Email</span>
                <span>{{ user?.email }}</span>
              </div>
              <div class="profile-row">
                <span>Баланс</span>
                <strong class="primary">{{ user?.balance?.toFixed(2) || '0.00' }} ₽</strong>
              </div>
              <div class="profile-row">
                <span>Статус</span>
                <el-tag :type="user?.is_active ? 'success' : 'danger'" size="small">
                  {{ user?.is_active ? 'Активен' : 'Неактивен' }}
                </el-tag>
              </div>
            </div>
          </el-card>

          <el-card class="compact-card" :style="isRoot ? 'flex: 1;' : 'margin-top: 12px'">
            <template #header>
              <div class="card-header">
                <span>Моя статистика</span>
              </div>
            </template>
            <div class="profile-grid">
              <div class="profile-row">
                <span>Звонков всего</span>
                <strong>{{ stats.totalCalls }}</strong>
              </div>
              <div class="profile-row">
                <span>Звонков сегодня</span>
                <strong class="success">{{ stats.totalCallsToday }}</strong>
              </div>
              <div class="profile-row">
                <span>Расход сегодня</span>
                <strong>{{ stats.totalSpentToday?.toFixed(2) || '0.00' }} ₽</strong>
              </div>
              <div class="profile-row">
                <span>Расход за месяц</span>
                <strong>{{ stats.totalSpentMonth?.toFixed(2) || '0.00' }} ₽</strong>
              </div>
            </div>
          </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="12" style="margin-top: 12px; display: flex;" v-if="isRoot">
      <el-col :xs="24" :sm="8" style="display: flex;">
        <el-card class="compact-card mini-card equal-height" style="width: 100%;">
          <template #header>
            <div class="card-header">
              <span>Финансы</span>
            </div>
          </template>
          <div class="mini-stats">
            <div class="mini-stat">
              <span class="mini-label">Сегодня</span>
              <span class="mini-value success">+{{ stats.totalSpentToday?.toFixed(2) || '0.00' }} ₽</span>
            </div>
            <div class="mini-stat">
              <span class="mini-label">За месяц</span>
              <span class="mini-value success">+{{ stats.totalSpentMonth?.toFixed(2) || '0.00' }} ₽</span>
            </div>
            <div class="mini-stat">
              <span class="mini-label">Общий баланс</span>
              <span class="mini-value primary">{{ stats.totalBalance?.toFixed(2) || '0.00' }} ₽</span>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="8" style="display: flex;">
        <el-card class="compact-card mini-card equal-height" style="width: 100%;">
          <template #header>
            <div class="card-header">
              <span>Инфраструктура</span>
            </div>
          </template>
          <div class="mini-stats">
            <div class="mini-stat">
              <span class="mini-label">Asterisk</span>
              <el-tag :type="stats.totalAsteriskServers > 0 ? 'success' : 'danger'" size="small">
                {{ stats.totalAsteriskServers }} серв.
              </el-tag>
            </div>
            <div class="mini-stat">
              <span class="mini-label">Донглы</span>
              <el-tag :type="stats.activeDongles > 0 ? 'success' : 'warning'" size="small">
                {{ stats.activeDongles }} онлайн
              </el-tag>
            </div>
            <div class="mini-stat">
              <span class="mini-label">SIP</span>
              <el-tag type="info" size="small">{{ stats.totalSipEndpoints }} акк.</el-tag>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="8" style="display: flex;">
        <el-card class="compact-card mini-card equal-height" style="width: 100%;">
          <template #header>
            <div class="card-header">
              <span>Статус системы</span>
              <el-tag type="success" size="small">Online</el-tag>
            </div>
          </template>
          <div class="mini-stats">
            <div class="mini-stat">
              <span class="mini-label">База данных</span>
              <el-tag type="success" size="small">OK</el-tag>
            </div>
            <div class="mini-stat">
              <span class="mini-label">AGI сервер</span>
              <el-tag type="success" size="small">OK</el-tag>
            </div>
            <div class="mini-stat">
              <span class="mini-label">Asterisk</span>
              <el-tag :type="stats.totalAsteriskServers > 0 ? 'success' : 'danger'" size="small">
                {{ stats.totalAsteriskServers > 0 ? 'OK' : 'Нет' }}
              </el-tag>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onActivated } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { usePermissionsStore } from '@/stores/permissions'
import { statsAPI } from '@/api/stats'
import apiClient from '@/api/client'
import { ArrowRight, Phone, Calendar, OfficeBuilding, User, Connection, Headset, Wallet, Money, View, Hide } from '@element-plus/icons-vue'
import { useNotifications } from '@/composables/useNotifications'

const notifications = useNotifications()

const authStore = useAuthStore()
const permissionsStore = usePermissionsStore()
const user = computed(() => authStore.user)
const loading = ref(false)
const loadingCalls = ref(false)
const recentCalls = ref([])
const blurNumbers = ref(localStorage.getItem('dashboard_blur_numbers') === 'true')

const stats = ref({
  totalCalls: 0,
  totalCallsToday: 0,
  activeDongles: 0,
  totalDongles: 0,
  totalUsers: 0,
  totalBalance: 0,
  totalSpentToday: 0,
  totalSpentMonth: 0,
  totalCompanies: 0,
  totalSipEndpoints: 0,
  totalAsteriskServers: 0,
  avgDuration: 0
})

const isRoot = computed(() => permissionsStore.isRoot)
const isAdmin = computed(() => permissionsStore.isAdmin)

const pluralize = (n, forms) => {
  const num = Math.abs(n) % 100
  const n1 = num % 10
  if (num > 10 && num < 20) return forms[2]
  if (n1 > 1 && n1 < 5) return forms[1]
  if (n1 === 1) return forms[0]
  return forms[2]
}

const visibleStats = computed(() => {
  const callsLabel = pluralize(stats.value.totalCalls, ['звонок', 'звонка', 'звонков'])
  const companiesLabel = pluralize(stats.value.totalCompanies, ['компания', 'компании', 'компаний'])
  const usersLabel = pluralize(stats.value.totalUsers, ['юзер', 'юзера', 'юзеров'])
  const donglesLabel = pluralize(stats.value.activeDongles, ['донгл', 'донгла', 'донглов'])

  if (isRoot.value) {
    return [
      { key: 'calls', type: 'primary', icon: Phone, value: stats.value.totalCalls, label: callsLabel },
      { key: 'today', type: 'success', icon: Calendar, value: stats.value.totalCallsToday, label: `сегодня` },
      { key: 'companies', type: 'info', icon: OfficeBuilding, value: stats.value.totalCompanies, label: companiesLabel },
      { key: 'users', type: 'warning', icon: User, value: stats.value.totalUsers, label: usersLabel },
      { key: 'dongles', type: 'success', icon: Connection, value: stats.value.activeDongles, label: donglesLabel },
      { key: 'sip', type: 'info', icon: Headset, value: stats.value.totalSipEndpoints, label: 'SIP' },
      { key: 'revenue', type: 'success', icon: Money, value: `${(stats.value.totalSpentMonth || 0).toFixed(0)}₽`, label: 'за месяц' },
      { key: 'balance', type: 'primary', icon: Wallet, value: `${(stats.value.totalBalance || 0).toFixed(0)}₽`, label: 'баланс' }
    ]
  } else {
    return [
      { key: 'calls', type: 'primary', icon: Phone, value: stats.value.totalCalls, label: callsLabel },
      { key: 'today', type: 'success', icon: Calendar, value: stats.value.totalCallsToday, label: `сегодня` },
      { key: 'spent', type: 'warning', icon: Money, value: `${(stats.value.totalSpentMonth || 0).toFixed(0)}₽`, label: 'расход' }
    ]
  }
})

const loadStats = async () => {
  try {
    loading.value = true
    const response = await statsAPI.getDashboardStats()
    stats.value = {
      totalCalls: response.data.total_calls || 0,
      totalCallsToday: response.data.total_calls_today || 0,
      activeDongles: response.data.active_dongles || 0,
      totalDongles: response.data.total_dongles || 0,
      totalUsers: response.data.total_users || 0,
      totalBalance: response.data.total_balance || 0,
      totalSpentToday: response.data.total_spent_today || 0,
      totalSpentMonth: response.data.total_spent_month || 0,
      totalCompanies: response.data.total_companies || 0,
      totalSipEndpoints: response.data.total_sip_endpoints || 0,
      totalAsteriskServers: response.data.total_asterisk_servers || 0,
      avgDuration: response.data.avg_duration || 0
    }
  } catch (error) {
    console.error('Ошибка загрузки статистики:', error)
    notifications.error('Ошибка загрузки', 'Не удалось загрузить статистику')
  } finally {
    loading.value = false
  }
}

const loadRecentCalls = async () => {
  try {
    loadingCalls.value = true
    const response = await apiClient.get('/calls', {
      params: { skip: 0, limit: 8, _t: Date.now() },
      headers: { 'Cache-Control': 'no-cache' }
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
  return date.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const formatPhoneNumber = (number) => {
  if (!number) return '-'
  if (blurNumbers.value) {
    const length = number.length
    if (length <= 4) return '****'
    return '*'.repeat(length - 4) + number.slice(-4)
  }
  return number
}

const toggleBlurNumbers = () => {
  blurNumbers.value = !blurNumbers.value
  localStorage.setItem('dashboard_blur_numbers', blurNumbers.value.toString())
}

onMounted(async () => {
  if (!permissionsStore.roles.length) {
    await permissionsStore.fetchPermissions()
  }
  loadStats()
  loadRecentCalls()
})

onActivated(() => {
  loadStats()
  loadRecentCalls()
})
</script>

<style scoped>
.dashboard-view {
  padding: 12px;
  width: 100%;
  box-sizing: border-box;
}

.admin-dashboard :deep(.el-row) {
  margin: 0 !important;
}

.admin-dashboard :deep(.el-col) {
  padding: 0 !important;
}

.admin-stat-card {
  margin: 6px;
}

.stat-card {
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.2s;
}

.stat-icon {
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}

.stat-primary .stat-icon { color: var(--el-color-primary); }
.stat-success .stat-icon { color: var(--el-color-success); }
.stat-warning .stat-icon { color: var(--el-color-warning); }
.stat-info .stat-icon { color: var(--el-color-info); }

.stat-content {
  flex: 1;
  min-width: 0;
  text-align: left;
}

.stat-card:hover {
  border-color: var(--el-color-primary);
}

.stat-card .stat-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--el-text-color-primary);
  line-height: 1.2;
}

.stat-card .stat-label {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  margin-top: 2px;
}

.stat-primary .stat-value { color: var(--el-color-primary); }
.stat-success .stat-value { color: var(--el-color-success); }
.stat-warning .stat-value { color: var(--el-color-warning); }
.stat-info .stat-value { color: var(--el-color-info); }

.compact-card {
  box-shadow: 0 1px 4px rgba(0,0,0,0.1);
}

.stretch-row {
  display: flex;
  flex-wrap: wrap;
}

.stretch-row > .el-col {
  display: flex;
}

.full-height {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.full-height :deep(.el-card__body) {
  flex: 1;
}

.compact-card :deep(.el-card__header) {
  padding: 10px 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.compact-card :deep(.el-card__body) {
  padding: 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  font-size: 13px;
}

.loading-container, .empty-container {
  padding: 16px 0;
}

.calls-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.call-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  transition: background-color 0.15s;
}

.call-row:hover {
  background: var(--el-fill-color-light);
}

.call-direction {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.call-direction .el-icon {
  font-size: 14px;
}

.call-direction .incoming {
  color: var(--el-color-success);
}

.call-direction .outgoing {
  color: var(--el-color-primary);
}

.call-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.call-number {
  font-weight: 500;
  font-size: 13px;
  color: var(--el-text-color-primary);
  transition: all 0.2s;
}

.call-number.blurred-number {
  font-family: monospace;
  letter-spacing: 1px;
}

.call-company {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.call-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.call-duration {
  font-size: 12px;
  color: var(--el-text-color-regular);
  font-weight: 500;
}

.call-cost {
  font-size: 11px;
  color: var(--el-color-success);
  font-weight: 600;
}

.call-time {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
  min-width: 70px;
  text-align: right;
}

.mini-card :deep(.el-card__body) {
  padding: 8px 12px;
}

.equal-height {
  height: 100%;
}

.equal-height :deep(.el-card__body) {
  height: calc(100% - 40px);
}

.mini-stats {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mini-stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.mini-label {
  color: var(--el-text-color-secondary);
}

.mini-value {
  font-weight: 600;
}

.mini-value.success { color: var(--el-color-success); }
.mini-value.primary { color: var(--el-color-primary); }

.analytics-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: space-between;
}

.analytics-item {
  flex: 1;
  min-width: 60px;
  text-align: center;
  padding: 8px 4px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
}

.analytics-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--el-text-color-primary);
  line-height: 1.2;
}

.analytics-value.primary { color: var(--el-color-primary); }
.analytics-value.success { color: var(--el-color-success); }

.analytics-label {
  font-size: 10px;
  color: var(--el-text-color-secondary);
  margin-top: 2px;
}

.analytics-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.analytics-row span {
  color: var(--el-text-color-secondary);
}

.analytics-row strong {
  color: var(--el-text-color-primary);
}

.analytics-row strong.success {
  color: var(--el-color-success);
}

.status-grid, .profile-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.status-row, .profile-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  padding: 4px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.status-row:last-child, .profile-row:last-child {
  border-bottom: none;
}

.status-row span, .profile-row span {
  color: var(--el-text-color-secondary);
}

.profile-row strong {
  color: var(--el-text-color-primary);
}

.profile-row strong.primary {
  color: var(--el-color-primary);
}

.profile-row strong.success {
  color: var(--el-color-success);
}

.admin-calls-card {
  min-height: 350px;
}

.admin-calls-card :deep(.el-card__body) {
  min-height: 300px;
}

.admin-calls-card .calls-list {
  min-height: 280px;
}

.root-calls-card {
  /* Для root убрана минимальная высота */
}

.root-calls-card :deep(.el-card__body) {
  /* Для root убрана минимальная высота */
}

.root-calls-card .calls-list {
  /* Для root убрана минимальная высота */
}

@media (max-width: 768px) {
  .dashboard-view {
    padding: 8px;
  }

  .stat-card {
    padding: 8px;
  }

  .stat-card .stat-value {
    font-size: 16px;
  }
}
</style>