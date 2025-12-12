<template>
  <div class="dashboard-layout">
    <el-container>
      <el-header class="header">
        <div class="header-left">
          <el-button :icon="Expand" circle @click="toggleSidebar" class="sidebar-toggle" />
          <h2>CloudPBX</h2>
        </div>
        <div class="header-right">
          <el-space :size="15">
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
        <el-aside :width="sidebarWidth" class="sidebar">
          <el-scrollbar>
            <el-menu 
              :default-active="activeMenu" 
              router 
              class="sidebar-menu" 
              :collapse="sidebarCollapsed"
            >
              <el-menu-item index="/">
                <el-icon><HomeFilled /></el-icon>
                <template #title><span>Главная</span></template>
              </el-menu-item>
              <el-menu-item index="/calls" v-if="canReadCalls">
                <el-icon><Phone /></el-icon>
                <template #title><span>Звонки</span></template>
              </el-menu-item>
              <el-menu-item index="/dongles" v-if="canReadDongles">
                <el-icon><Connection /></el-icon>
                <template #title><span>Донглы</span></template>
              </el-menu-item>
              <el-menu-item index="/users" v-if="canReadUsers">
                <el-icon><UserFilled /></el-icon>
                <template #title><span>Пользователи</span></template>
              </el-menu-item>
              <el-menu-item index="/companies" v-if="canReadCompanies">
                <el-icon><OfficeBuilding /></el-icon>
                <template #title><span>Компании</span></template>
              </el-menu-item>
              <el-menu-item index="/tariffs">
                <el-icon><Tickets /></el-icon>
                <template #title><span>Тарифы</span></template>
              </el-menu-item>
              <el-menu-item index="/payments">
                <el-icon><CreditCard /></el-icon>
                <template #title><span>Платежи</span></template>
              </el-menu-item>
            </el-menu>
          </el-scrollbar>
        </el-aside>

        <el-main class="main-content">
          <router-view v-slot="{ Component }">
            <transition name="fade" mode="out-in">
              <component :is="Component" :key="$route.fullPath" />
            </transition>
          </router-view>
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
import { User, SwitchButton, Wallet, ArrowDown, HomeFilled, Phone, Connection, UserFilled, Expand, OfficeBuilding, Tickets, CreditCard, Setting } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const permissionsStore = usePermissionsStore()
const user = computed(() => authStore.user)
const activeMenu = computed(() => route.path)
const sidebarCollapsed = ref(localStorage.getItem('sidebarCollapsed') === 'true')
const sidebarWidth = computed(() => sidebarCollapsed.value ? '64px' : '200px')

const canReadCalls = computed(() => permissionsStore.canRead('calls'))
const canReadDongles = computed(() => permissionsStore.canRead('dongles'))
const canReadUsers = computed(() => permissionsStore.canRead('users'))
const canReadCompanies = computed(() => permissionsStore.canRead('companies'))

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

watch(() => route.path, () => {
  if (window.innerWidth < 768) {
    sidebarCollapsed.value = true
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
  height: 56px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 15px;
}

.header-left h2 {
  margin: 0;
  color: var(--el-text-color-primary);
  font-size: 18px;
}

.sidebar-toggle {
  background-color: var(--el-fill-color-light);
  border-color: var(--el-border-color);
  color: var(--el-text-color-regular);
  transition: all 0.3s;
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
  gap: 6px;
  font-weight: 500;
  color: var(--el-color-primary-light-7);
  font-size: 14px;
}

.user-dropdown {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 4px;
  transition: background-color 0.3s;
  font-size: 14px;
}

.user-dropdown:hover {
  background-color: var(--el-fill-color-light);
}

.sidebar {
  background: var(--el-bg-color-overlay);
  box-shadow: 2px 0 8px rgba(45, 90, 61, 0.2);
  border-right: 1px solid var(--el-border-color);
  transition: width 0.3s ease;
  overflow: hidden;
}

.sidebar-menu {
  border: none;
  height: 100%;
}

.el-menu-item {
  transition: none !important;
}

.main-content {
  padding: 0;
  background-color: var(--el-bg-color-page);
  overflow-x: hidden;
  min-height: calc(100vh - 56px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .header {
    padding: 0 12px;
  }
  
  .header-left h2 {
    font-size: 16px;
  }
  
  .balance span {
    display: none;
  }
}
</style>