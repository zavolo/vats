<template>
  <div class="dashboard-layout">
    <div v-if="isImpersonating" class="impersonate-bar">
      <el-icon><Warning /></el-icon>
      <span>Вы вошли как <strong>{{ user?.username }}</strong></span>
      <el-button type="primary" size="small" @click="exitImpersonate" :loading="exitingImpersonate">
        Вернуться к {{ originalUser?.username }}
      </el-button>
    </div>
    <el-container>
      <el-header class="header">
        <div class="header-left">
          <el-button :icon="Expand" circle @click="toggleSidebar" class="sidebar-toggle" />
          <h2>Виртуальная АТС</h2>
        </div>
        <div class="header-right">
          <el-space :size="15">
            <div class="balance" v-if="user && !isRoot">
              <el-icon><Wallet /></el-icon>
              <span>{{ user.balance?.toFixed(2) }} ₽</span>
            </div>
            <el-popover
              v-model:visible="notificationsVisible"
              placement="bottom-end"
              :width="360"
              trigger="click"
              popper-class="notifications-popover"
            >
              <template #reference>
                <el-badge :value="unreadCount" :hidden="unreadCount === 0" :max="99" class="notification-badge">
                  <el-button :icon="Bell" circle class="notification-button" />
                </el-badge>
              </template>
              <div class="notifications-panel">
                <div class="notifications-header">
                  <span class="notifications-title">Уведомления</span>
                  <el-button
                    v-if="unreadCount > 0"
                    text
                    size="small"
                    @click="markAllAsRead"
                  >
                    Отметить все
                  </el-button>
                </div>
                <el-divider style="margin: 0;" />
                <el-scrollbar max-height="400px">
                  <div v-if="notifications.length === 0" class="no-notifications">
                    <el-icon :size="48" color="var(--el-text-color-placeholder)"><BellFilled /></el-icon>
                    <p>Нет уведомлений</p>
                  </div>
                  <div
                    v-for="notification in notifications"
                    :key="notification.id"
                    class="notification-item"
                    :class="{ 'notification-unread': !notification.read }"
                    @click="markAsRead(notification.id)"
                  >
                    <div class="notification-icon" :class="`notification-${notification.type}`">
                      <el-icon v-if="notification.type === 'success'"><CircleCheck /></el-icon>
                      <el-icon v-else-if="notification.type === 'warning'"><Warning /></el-icon>
                      <el-icon v-else-if="notification.type === 'error'"><CircleClose /></el-icon>
                      <el-icon v-else><InfoFilled /></el-icon>
                    </div>
                    <div class="notification-content">
                      <div class="notification-title">{{ notification.title }}</div>
                      <div class="notification-message">{{ notification.message }}</div>
                      <div class="notification-time">{{ formatTime(notification.createdAt) }}</div>
                    </div>
                    <el-button
                      :icon="Close"
                      circle
                      text
                      size="small"
                      class="notification-close"
                      @click.stop="removeNotification(notification.id)"
                    />
                  </div>
                </el-scrollbar>
                <el-divider style="margin: 0;" />
                <div class="notifications-footer">
                  <el-button text size="small" @click="clearAll" :disabled="notifications.length === 0">
                    Очистить все
                  </el-button>
                </div>
              </div>
            </el-popover>
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
        <el-aside :width="sidebarCollapsed ? '64px' : '180px'" class="sidebar" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
          <el-scrollbar>
            <el-menu 
              :default-active="activeMenu" 
              router 
              class="sidebar-menu" 
              :collapse="sidebarCollapsed"
              :collapse-transition="false"
            >
              <el-menu-item index="/">
                <el-icon><HomeFilled /></el-icon>
                <template #title><span>Главная</span></template>
              </el-menu-item>
              <el-menu-item index="/calls" v-show="canReadCalls">
                <el-icon><Phone /></el-icon>
                <template #title><span>Звонки</span></template>
              </el-menu-item>
              <el-menu-item index="/asterisk-servers" v-show="canReadAsterisk">
                <el-icon><Connection /></el-icon>
                <template #title><span>Asterisk</span></template>
              </el-menu-item>
              <el-menu-item index="/sip-endpoints" v-show="canReadSIP">
                <el-icon><Headset /></el-icon>
                <template #title><span>SIP</span></template>
              </el-menu-item>
              <el-menu-item index="/ivr" v-show="canReadIVR">
                <el-icon><Operation /></el-icon>
                <template #title><span>IVR & Роутинг</span></template>
              </el-menu-item>
              <el-menu-item index="/melodies">
                <el-icon><Microphone /></el-icon>
                <template #title><span>Мелодии</span></template>
              </el-menu-item>
              <el-menu-item index="/dongles" v-show="canReadDongles">
                <el-icon><Connection /></el-icon>
                <template #title><span>Донглы</span></template>
              </el-menu-item>
              <el-menu-item index="/sms" v-show="canReadSMS">
                <el-icon><Message /></el-icon>
                <template #title><span>SMS</span></template>
              </el-menu-item>
              <el-menu-item index="/broadcast" v-show="canReadBroadcast">
                <el-icon><Promotion /></el-icon>
                <template #title><span>Массовый обзвон</span></template>
              </el-menu-item>
              <el-menu-item index="/users" v-show="canReadUsers">
                <el-icon><UserFilled /></el-icon>
                <template #title><span>Пользователи</span></template>
              </el-menu-item>
              <el-menu-item index="/companies" v-show="canReadCompanies">
                <el-icon><OfficeBuilding /></el-icon>
                <template #title><span>Компании</span></template>
              </el-menu-item>
              <el-menu-item index="/tariffs" v-show="canReadTariffs">
                <el-icon><Tickets /></el-icon>
                <template #title><span>Тарифы</span></template>
              </el-menu-item>
              <el-menu-item index="/payments" v-show="canReadPayments">
                <el-icon><CreditCard /></el-icon>
                <template #title><span>Платежи</span></template>
              </el-menu-item>
            </el-menu>
          </el-scrollbar>
        </el-aside>

        <el-main class="main-content">
          <router-view v-slot="{ Component }">
            <transition name="fade" mode="out-in">
              <keep-alive>
                <component :is="Component" :key="$route.fullPath" />
              </keep-alive>
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
import { User, SwitchButton, Wallet, ArrowDown, HomeFilled, Phone, Connection, UserFilled, Expand, OfficeBuilding, Tickets, CreditCard, Setting, Operation, Warning, Message, Headset, Microphone, Promotion, Bell, BellFilled, CircleCheck, CircleClose, InfoFilled, Close } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const permissionsStore = usePermissionsStore()

const user = computed(() => authStore.user)
const originalUser = computed(() => authStore.originalUser)
const isImpersonating = computed(() => !!authStore.originalUser)
const activeMenu = computed(() => route.path)
const sidebarCollapsed = ref(localStorage.getItem('sidebarCollapsed') === 'true')

// Уведомления
const notificationsVisible = ref(false)
const notifications = ref([])
const unreadCount = computed(() => notifications.value.filter(n => !n.read).length)

// Роли
const isRoot = computed(() => permissionsStore.isRoot)
const isAdmin = computed(() => permissionsStore.isAdmin)

// Видимость разделов меню по ролям:
// root: всё
// admin: SIP, IVR, пользователи компании, платежи, звонки компании, номера (назначенные с донглов)
// user: только свои звонки
const canReadCalls = computed(() => true) // все видят звонки (фильтрация на бекенде)
const canReadDongles = computed(() => permissionsStore.isRoot) // только root управляет донглами
const canReadUsers = computed(() => permissionsStore.isRoot || permissionsStore.isAdmin)
const canReadCompanies = computed(() => permissionsStore.isRoot) // только root
const canReadSIP = computed(() => permissionsStore.isRoot || permissionsStore.isAdmin)
const canReadIVR = computed(() => permissionsStore.isRoot || permissionsStore.isAdmin)
const canReadTariffs = computed(() => permissionsStore.isRoot) // только root
const canReadPayments = computed(() => permissionsStore.isRoot || permissionsStore.isAdmin)
const canReadAsterisk = computed(() => permissionsStore.isRoot)
const canReadSMS = computed(() => permissionsStore.isRoot || permissionsStore.isAdmin)
const canReadBroadcast = computed(() => permissionsStore.isRoot || permissionsStore.isAdmin)

const exitingImpersonate = ref(false)

const exitImpersonate = async () => {
  try {
    exitingImpersonate.value = true
    await authStore.exitImpersonate()
  } catch (error) {
    console.error('Ошибка выхода из режима:', error)
    ElMessage.error('Не удалось вернуться')
    exitingImpersonate.value = false
  }
}

const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
  localStorage.setItem('sidebarCollapsed', sidebarCollapsed.value.toString())
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

// Методы для работы с уведомлениями
const formatTime = (timestamp) => {
  const now = new Date()
  const time = new Date(timestamp)
  const diff = Math.floor((now - time) / 1000)

  if (diff < 60) return 'только что'
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`
  if (diff < 604800) return `${Math.floor(diff / 86400)} д назад`

  return time.toLocaleDateString('ru-RU')
}

const markAsRead = (id) => {
  const notification = notifications.value.find(n => n.id === id)
  if (notification) {
    notification.read = true
  }
}

const markAllAsRead = () => {
  notifications.value.forEach(n => n.read = true)
}

const removeNotification = (id) => {
  const index = notifications.value.findIndex(n => n.id === id)
  if (index !== -1) {
    notifications.value.splice(index, 1)
  }
}

const clearAll = () => {
  notifications.value = []
  notificationsVisible.value = false
}

// Функция для добавления уведомления (будет использоваться из других компонентов)
const addNotification = (notification) => {
  notifications.value.unshift({
    id: Date.now() + Math.random(),
    createdAt: new Date(),
    read: false,
    ...notification
  })
}

// Делаем метод доступным глобально через window для использования в других компонентах
if (typeof window !== 'undefined') {
  window.addNotification = addNotification
}
</script>

<style scoped>
.dashboard-layout {
  min-height: 100vh;
  background-color: var(--el-bg-color-page);
}

.impersonate-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #e6a23c 0%, #f56c6c 100%);
  color: #fff;
  font-size: 14px;
  position: sticky;
  top: 0;
  z-index: 2001;
}

.impersonate-bar .el-icon {
  font-size: 18px;
}

.impersonate-bar strong {
  font-weight: 600;
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
  transition: width 0.28s ease-in-out;
  overflow: hidden;
  will-change: width;
}

.sidebar-menu {
  border: none;
  height: 100%;
}

.sidebar-menu:not(.el-menu--collapse) {
  width: 180px;
}

:deep(.el-menu-item) {
  height: 40px;
  line-height: 40px;
  font-size: 13px;
  transition: background-color 0.3s, color 0.3s !important;
}

:deep(.el-menu-item .el-icon) {
  font-size: 16px;
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

.notification-badge {
  cursor: pointer;
}

.notification-button {
  background-color: var(--el-fill-color-light);
  border-color: var(--el-border-color);
  color: var(--el-text-color-regular);
  transition: all 0.3s;
}

.notification-button:hover {
  background-color: var(--el-color-primary);
  border-color: var(--el-color-primary);
  color: #ffffff;
}

.notifications-panel {
  padding: 0;
}

.notifications-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
}

.notifications-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.no-notifications {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--el-text-color-placeholder);
}

.no-notifications p {
  margin: 10px 0 0 0;
  font-size: 14px;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.3s;
  border-bottom: 1px solid var(--el-border-color-lighter);
  position: relative;
}

.notification-item:hover {
  background-color: var(--el-fill-color-light);
}

.notification-item:last-child {
  border-bottom: none;
}

.notification-unread {
  background-color: var(--el-fill-color);
}

.notification-unread::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background-color: var(--el-color-primary);
}

.notification-icon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.notification-success {
  background-color: rgba(103, 194, 58, 0.1);
  color: var(--el-color-success);
}

.notification-warning {
  background-color: rgba(230, 162, 60, 0.1);
  color: var(--el-color-warning);
}

.notification-error {
  background-color: rgba(245, 108, 108, 0.1);
  color: var(--el-color-error);
}

.notification-info {
  background-color: rgba(64, 158, 255, 0.1);
  color: var(--el-color-info);
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  margin-bottom: 4px;
  line-height: 1.4;
}

.notification-message {
  font-size: 13px;
  color: var(--el-text-color-regular);
  margin-bottom: 4px;
  line-height: 1.4;
  word-wrap: break-word;
}

.notification-time {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.notification-close {
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.3s;
}

.notification-item:hover .notification-close {
  opacity: 1;
}

.notifications-footer {
  padding: 8px 16px;
  display: flex;
  justify-content: center;
}
</style>