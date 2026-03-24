import { defineStore } from 'pinia'
import { authAPI } from '@/api/auth'
import { usePermissionsStore } from './permissions'
import router from '@/router'
import { setAuthStore } from '@/api/client'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: null,
    user: null,
    loading: false,
    error: null,
    originalUser: null
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
    currentUser: (state) => state.user,
    isImpersonating: (state) => !!state.originalUser
  },

  actions: {
    init() {
      setAuthStore(this)
      const token = localStorage.getItem('token')
      if (token) {
        this.token = token
      }
      const originalUserStr = localStorage.getItem('originalUser')
      if (originalUserStr) {
        try {
          this.originalUser = JSON.parse(originalUserStr)
        } catch (e) {
          localStorage.removeItem('originalUser')
        }
      }
    },

    async login(username, password) {
      this.loading = true
      this.error = null
      
      this.clearAuth()
      
      try {
        const response = await authAPI.login(username, password)
        this.token = response.data.access_token
        localStorage.setItem('token', this.token)
        await this.fetchUser()
        router.push('/')
        return response.data
      } catch (error) {
        this.error = error.response?.data?.detail || 'Ошибка входа'
        throw error
      } finally {
        this.loading = false
      }
    },

    async register(data) {
      this.loading = true
      this.error = null
      
      this.clearAuth()
      
      try {
        const response = await authAPI.register(data)
        this.token = response.data.access_token
        localStorage.setItem('token', this.token)
        await this.fetchUser()
        router.push('/')
        return response.data
      } catch (error) {
        this.error = error.response?.data?.detail || 'Ошибка регистрации'
        throw error
      } finally {
        this.loading = false
      }
    },

    async fetchUser(force = false) {
      if (this.user && !force) {
        return
      }
      try {
        const response = await authAPI.getCurrentUser()
        this.user = response.data
        const permissionsStore = usePermissionsStore()
        permissionsStore.clear()
        await permissionsStore.fetchPermissions()
      } catch (error) {
        console.error('Ошибка получения пользователя:', error)
        this.logout()
      }
    },

    clearAuth() {
      this.token = null
      this.user = null
      this.error = null
      this.loading = false
      this.originalUser = null
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('originalUser')
      const permissionsStore = usePermissionsStore()
      permissionsStore.clear()
    },

    logout() {
      this.clearAuth()
      if (router.currentRoute.value.path !== '/login') {
        router.push('/login')
      }
    },

    async loginAs(userId) {
      const { default: apiClient } = await import('@/api/client')

      const currentUserId = this.user.id
      const currentUsername = this.user.username

      const response = await apiClient.post(`/users/${userId}/login-as`)

      const originalUserData = {
        id: response.data.original_user_id || currentUserId,
        username: currentUsername
      }

      const newToken = response.data.access_token

      // Clear old data first
      localStorage.removeItem('token')
      localStorage.removeItem('user')

      // Save new data
      localStorage.setItem('token', newToken)
      localStorage.setItem('originalUser', JSON.stringify(originalUserData))

      // Force full page reload to use new token
      window.location.href = '/?t=' + Date.now()
    },

    async exitImpersonate() {
      if (!this.originalUser) return

      const { default: apiClient } = await import('@/api/client')

      const response = await apiClient.post(`/users/return-to/${this.originalUser.id}`)

      localStorage.setItem('token', response.data.access_token)
      localStorage.removeItem('originalUser')

      // Force full page reload to clear cache
      window.location.href = '/?t=' + Date.now()
    }
  }
})