<template>
  <CursorFx />
  <router-view v-if="initialized" />
  <div v-else class="loading-app">
    <div class="loading-spinner"></div>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import CursorFx from '@/components/CursorFx.vue'

const authStore = useAuthStore()
const initialized = ref(false)

onMounted(async () => {
  authStore.init()
  if (authStore.isAuthenticated) {
    await authStore.fetchUser(true)
  }
  initialized.value = true

  // Включаем кастомный курсор (скрываем стандартный)
  if (!('ontouchstart' in window) && navigator.maxTouchPoints === 0) {
    document.documentElement.classList.add('cursor-fx-enabled')
  }
})
</script>
<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

#app {
  min-height: 100vh;
}

.loading-app {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: #1a1a1a;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #333;
  border-top-color: #409eff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Стилизованное выделение текста */
::selection {
  background: var(--el-color-primary);
  color: #fff;
}

::-moz-selection {
  background: var(--el-color-primary);
  color: #fff;
}

/* Уведомления рядом с текстом "Виртуальная АТС" */
.el-message {
  top: 12px !important;
  left: 240px !important;
  right: auto !important;
  transform: none !important;
}

.el-notification {
  top: 12px !important;
  left: 240px !important;
  right: auto !important;
}

/* Кастомный скроллбар */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, var(--el-color-primary-light-3), var(--el-color-primary));
  border-radius: 10px;
  border: 2px solid transparent;
  background-clip: padding-box;
}

::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, var(--el-color-primary), var(--el-color-primary-dark-2));
  border: 2px solid transparent;
  background-clip: padding-box;
}

::-webkit-scrollbar-corner {
  background: transparent;
}

/* Firefox */
* {
  scrollbar-width: thin;
  scrollbar-color: var(--el-color-primary) transparent;
}
</style>