<template>
  <div class="dashboard">
    <el-container>
      <el-header class="header">
        <div class="header-left">
          <el-button 
            :icon="Expand" 
            circle 
            @click="toggleSidebar"
            class="sidebar-toggle"
          />
          <h2>Виртуальная АТС</h2>
        </div>
        <div class="header-right">
          <el-space :size="20">
            <div class="balance">
              <el-icon><Wallet /></el-icon>
              <span>Баланс: {{ user?.balance?.toFixed(2) || '0.00' }} ₽</span>
            </div>
            <el-dropdown @command="handleCommand">
              <span class="user-dropdown">
                <el-icon><User /></el-icon>
                {{ user?.username }}
                <el-icon><ArrowDown /></el-icon>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="profile">
                    <el-icon><User /></el-icon>
                    Профиль
                  </el-dropdown-item>
                  <el-dropdown-item command="settings">
                    <el-icon><Setting /></el-icon>
                    Настройки
                  </el-dropdown-item>
                  <el-dropdown-item divided command="logout">
                    <el-icon><SwitchButton /></el-icon>
                    Выход
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </el-space>
        </div>
      </el-header>

      <el-container>
        <el-aside :width="sidebarCollapsed ? '64px' : '250px'" class="sidebar">
          <el-menu
            :default-active="activeMenu"
            router
            class="sidebar-menu"
            :collapse="sidebarCollapsed"
            :collapse-transition="false"
          >
            <el-menu-item 
              v-for="item in menuItems" 
              :key="item.index"
              :index="item.index"
            >
              <el-icon><component :is="item.icon" /></el-icon>
              <span>{{ item.label }}</span>
            </el-menu-item>
          </el-menu>
        </el-aside>

        <el-main class="main-content">
          <div class="welcome-section">
            <el-row :gutter="20">
              <el-col :xs="24" :sm="12" :md="6">
                <el-card class="stat-card" v-loading="loading">
                  <el-statistic title="Всего звонков" :value="stats.totalCalls">
                    <template #prefix>
                      <el-icon style="color: #409eff"><Phone /></el-icon>
                    </template>
                  </el-statistic>
                </el-card>
              </el-col>
              <el-col :xs="24" :sm="12" :md="6">
                <el-card class="stat-card" v-loading="loading">
                  <el-statistic title="Звонков сегодня" :value="stats.totalCallsToday">
                    <template #prefix>
                      <el-icon style="color: #67c23a"><Phone /></el-icon>
                    </template>
                  </el-statistic>
                </el-card>
              </el-col>
              <el-col :xs="24" :sm="12" :md="6">
                <el-card class="stat-card" v-loading="loading">
                  <el-statistic title="Активных донглов" :value="stats.activeDongles">
                    <template #prefix>
                      <el-icon style="color: #67c23a"><Connection /></el-icon>
                    </template>
                  </el-statistic>
                </el-card>
              </el-col>
              <el-col :xs="24" :sm="12" :md="6">
                <el-card class="stat-card" v-loading="loading">
                  <el-statistic title="Баланс" :value="user?.balance || 0" :precision="2" suffix="₽">
                    <template #prefix>
                      <el-icon style="color: #e6a23c"><Wallet /></el-icon>
                    </template>
                  </el-statistic>
                </el-card>
              </el-col>
            </el-row>

            <el-row :gutter="20" style="margin-top: 20px">
              <el-col :xs="24" :sm="12" :md="8">
                <el-card class="stat-card" v-loading="loading">
                  <el-statistic title="Потрачено сегодня" :value="stats.totalSpentToday" :precision="2" suffix="₽">
                    <template #prefix>
                      <el-icon style="color: #f56c6c"><Wallet /></el-icon>
                    </template>
                  </el-statistic>
                </el-card>
              </el-col>
              <el-col :xs="24" :sm="12" :md="8">
                <el-card class="stat-card" v-loading="loading">
                  <el-statistic title="Потрачено за месяц" :value="stats.totalSpentMonth" :precision="2" suffix="₽">
                    <template #prefix>
                      <el-icon style="color: #f56c6c"><Wallet /></el-icon>
                    </template>
                  </el-statistic>
                </el-card>
              </el-col>
              <el-col :xs="24" :sm="12" :md="8">
                <el-card class="stat-card" v-loading="loading">
                  <el-statistic title="Пользователей" :value="stats.totalUsers">
                    <template #prefix>
                      <el-icon style="color: #909399"><UserFilled /></el-icon>
                    </template>
                  </el-statistic>
                </el-card>
              </el-col>
            </el-row>

            <el-card class="info-card">
              <template #header>
                <div class="card-header">
                  <span>Добро пожаловать в CloudPBX</span>
                </div>
              </template>
              <div>
                <p>Добро пожаловать, <strong>{{ user?.username }}</strong>!</p>
                <p>Email: {{ user?.email }}</p>
                <p>Статус: <el-tag :type="user?.is_active ? 'success' : 'danger'">{{ user?.is_active ? 'Активен' : 'Неактивен' }}</el-tag></p>
                <el-divider />     
                <h3>Быстрые действия:</h3>
                <el-space wrap>
                  <el-button v-if="permissionsStore.canRead('calls')" type="primary" @click="$router.push('/calls')">
                    <el-icon><Phone /></el-icon>
                    Просмотр звонков
                  </el-button>
                  <el-button v-if="permissionsStore.canRead('dongles')" type="success" @click="$router.push('/dongles')">
                    <el-icon><Connection /></el-icon>
                    Управление донглами
                  </el-button>
                  <el-button type="warning" @click="$router.push('/payments')">
                    <el-icon><Wallet /></el-icon>
                    Пополнить баланс
                  </el-button>
                </el-space>
              </div>
            </el-card>
          </div>
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>
<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePermissionsStore } from '@/stores/permissions'
import { statsAPI } from '@/api/stats'
import { 
  User, 
  Setting, 
  SwitchButton, 
  Wallet, 
  ArrowDown,
  HomeFilled,
  Phone,
  Connection,
  UserFilled,
  Expand
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const permissionsStore = usePermissionsStore()
const user = computed(() => authStore.user)
const activeMenu = computed(() => route.path)
const sidebarCollapsed = ref(localStorage.getItem('sidebarCollapsed') === 'true')

const stats = ref({
  totalCalls: 0,
  totalCallsToday: 0,
  activeDongles: 0,
  totalUsers: 1,
  totalBalance: 0,
  totalSpentToday: 0,
  totalSpentMonth: 0
})

const loading = ref(false)

const menuItems = computed(() => {
  const items = [
    {
      index: '/',
      icon: HomeFilled,
      label: 'Главная',
      show: true
    },
    {
      index: '/calls',
      icon: Phone,
      label: 'Звонки',
      show: permissionsStore.canRead('calls')
    },
    {
      index: '/dongles',
      icon: Connection,
      label: 'Донглы',
      show: permissionsStore.canRead('dongles')
    },
    {
      index: '/users',
      icon: UserFilled,
      label: 'Пользователи',
      show: permissionsStore.canRead('users')
    },
    {
      index: '/payments',
      icon: Wallet,
      label: 'Платежи',
      show: true
    },
    {
      index: '/settings',
      icon: Setting,
      label: 'Настройки',
      show: true
    }
  ]
  return items.filter(item => item.show)
})

const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
  localStorage.setItem('sidebarCollapsed', sidebarCollapsed.value)
}

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

watch(user, (newUser) => {
  if (newUser) {
    loadStats()
  }
}, { immediate: false })

onMounted(() => {
  if (!permissionsStore.permissions.length) {
    permissionsStore.fetchPermissions()
  }
  if (user.value) {
    loadStats()
  }
})

const handleCommand = (command) => {
  switch (command) {
    case 'profile':
      router.push('/profile')
      break
    case 'settings':
      router.push('/settings')
      break
    case 'logout':
      authStore.logout()
      ElMessage.success('Вы вышли из системы')
      break
  }
}
</script>
<style scoped>
.dashboard {
  min-height: 100vh;
  background-color: var(--el-bg-color-page);
}

.header {
  background: var(--el-bg-color-overlay);
  box-shadow: 0 2px 8px rgba(45, 90, 61, 0.3);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  border-bottom: 1px solid var(--el-border-color);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 15px;
}

.header-left h2 {
  margin: 0;
  color: var(--el-text-color-primary);
  font-size: 20px;
}

.sidebar-toggle {
  background-color: var(--el-fill-color-light);
  border-color: var(--el-border-color);
  color: var(--el-text-color-regular);
}

.sidebar-toggle:hover {
  background-color: var(--el-color-primary);
  border-color: var(--el-color-primary);
  color: #ffffff;
}

.header-right {
  display: flex;
  align-items: center;
}

.balance {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  color: var(--el-color-primary-light-7);
}

.user-dropdown {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.user-dropdown:hover {
  background-color: var(--el-fill-color-light);
}

.sidebar {
  background: var(--el-bg-color-overlay);
  box-shadow: 2px 0 8px rgba(45, 90, 61, 0.2);
  border-right: 1px solid var(--el-border-color);
  min-height: calc(100vh - 60px);
  transition: width 0.2s ease;
  overflow: hidden;
}

.sidebar-menu {
  border: none;
  height: 100%;
  min-height: calc(100vh - 60px);
  transition: none;
}

.main-content {
  padding: 20px;
}

.stat-card {
  margin-bottom: 20px;
  transition: transform 0.3s, box-shadow 0.3s;
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 12px rgba(45, 90, 61, 0.4);
}

.info-card {
  box-shadow: 0 2px 8px rgba(45, 90, 61, 0.3);
}

.card-header {
  font-weight: 600;
  font-size: 16px;
}
</style>