<template>
  <router-view />
</template>
<script setup>
import { onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

onMounted(() => {
  authStore.init()
  if (authStore.isAuthenticated) {
    authStore.fetchUser(true)
  }
})

watch(() => router.currentRoute.value, async () => {
  if (authStore.isAuthenticated && authStore.user) {
    await authStore.fetchUser(true)
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