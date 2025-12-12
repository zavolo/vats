import { defineStore } from 'pinia'
import { authAPI } from '@/api/auth'
import { usePermissionsStore } from './permissions'
import router from '@/router'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: null,
    user: null,
    loading: false,
    error: null
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
    currentUser: (state) => state.user
  },

  actions: {
    init() {
      const token = localStorage.getItem('token')
      if (token) {
        this.token = token
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
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      const permissionsStore = usePermissionsStore()
      permissionsStore.clear()
    },

    logout() {
      this.clearAuth()
      if (router.currentRoute.value.path !== '/login') {
        router.push('/login')
      }
    }
  }
})