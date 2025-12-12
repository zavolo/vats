<template>
  <router-view />
</template>
<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
const authStore = useAuthStore()

onMounted(() => {
  const token = localStorage.getItem('token')
  if (token && authStore.isAuthenticated && !authStore.user) {
    authStore.fetchUser()
  } else if (!token) {
    authStore.logout()
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
</style>