<template>
  <div class="dashboard-layout">
    <el-container>
      <el-header class="header">
        <div class="header-left">
          <el-button 
            :icon="Expand" 
            circle 
            @click="toggleSidebar"
            class="sidebar-toggle"
          />
          <h2>CloudPBX</h2>
        </div>
        <div class="header-right">
          <el-space :size="20">
            <div class="balance" v-if="user">
              <el-icon><Wallet /></el-icon>
              <span>{{ user.balance?.toFixed(2) }} ₽</span>
            </div>
            <el-dropdown @command="handleCommand" trigger="click">
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
          <el-scrollbar>
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
          </el-scrollbar>
        </el-aside>

        <el-main class="main-content">
          <router-view v-slot="{ Component }">
            <transition name="fade" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>
<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePermissionsStore } from '@/stores/permissions'
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
  Expand,
  OfficeBuilding,
  Tickets
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const permissionsStore = usePermissionsStore()
const user = computed(() => authStore.user)
const activeMenu = computed(() => route.path)
const sidebarCollapsed = ref(localStorage.getItem('sidebarCollapsed') === 'true')

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
      index: '/companies',
      icon: OfficeBuilding,
      label: 'Компании',
      show: permissionsStore.canRead('companies')
    },
    {
      index: '/tariffs',
      icon: Tickets,
      label: 'Тарифы',
      show: true
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

onMounted(async () => {
  if (!permissionsStore.permissions.length) {
    await permissionsStore.fetchPermissions()
  }
})
</script>
<style scoped>
.dashboard-layout {
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
  transition: width 0.2s ease;
  overflow: hidden;
}

.sidebar-menu {
  border: none;
  transition: none;
}

.main-content {
  padding: 20px;
  background-color: var(--el-bg-color-page);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>