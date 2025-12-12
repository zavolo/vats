import { defineStore } from 'pinia'
import { authAPI } from '@/api/auth'
import { usePermissionsStore } from './permissions'
import router from '@/router'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || null,
    user: null,
    loading: false,
    error: null
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
    currentUser: (state) => state.user
  },

  actions: {
    async login(username, password) {
      this.loading = true
      this.error = null
      
      this.token = null
      this.user = null
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      const permissionsStore = usePermissionsStore()
      permissionsStore.clear()
      
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
      
      this.token = null
      this.user = null
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      const permissionsStore = usePermissionsStore()
      permissionsStore.clear()
      
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

    async fetchUser() {
      try {
        const response = await authAPI.getCurrentUser()
        this.user = response.data
        const permissionsStore = usePermissionsStore()
        await permissionsStore.fetchPermissions()
      } catch (error) {
        console.error('Ошибка получения пользователя:', error)
        this.logout()
      }
    },

    logout() {
      this.token = null
      this.user = null
      this.error = null
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      const permissionsStore = usePermissionsStore()
      permissionsStore.clear()
      if (router.currentRoute.value.path !== '/login') {
        router.push('/login')
      }
    }
  }
})