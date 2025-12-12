import apiClient from './client'

export const statsAPI = {
  getDashboardStats() {
    return apiClient.get('/stats/dashboard')
  }
}