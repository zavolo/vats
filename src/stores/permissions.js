import { defineStore } from 'pinia'
import apiClient from '@/api/client'

export const usePermissionsStore = defineStore('permissions', {
  state: () => ({
    permissions: [],
    roles: [],
    loading: false
  }),

  getters: {
    hasPermission: (state) => (resource, action) => {
      if (state.roles.some(role => role.name === 'root')) {
        return true
      }
      return state.permissions.some(
        p => (p.resource === resource && p.action === action) ||
             (p.resource === '*' && p.action === '*')
      )
    },
    
    canRead: (state) => (resource) => {
      if (state.roles.some(role => role.name === 'root')) {
        return true
      }
      return state.permissions.some(
        p => (p.resource === resource && p.action === 'read') ||
             (p.resource === '*' && p.action === '*')
      )
    }
  },

  actions: {
    async fetchPermissions() {
      this.loading = true
      try {
        const response = await apiClient.get('/users/me/permissions')
        this.permissions = response.data.permissions
        this.roles = response.data.roles
      } catch (error) {
        console.error('Ошибка загрузки прав:', error)
      } finally {
        this.loading = false
      }
    },

    clear() {
      this.permissions = []
      this.roles = []
    }
  }
})