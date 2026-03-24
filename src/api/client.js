import axios from 'axios'
import router from '@/router'

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

let authStore = null

export const setAuthStore = (store) => {
  authStore = store
}

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    // Disable caching for all requests
    config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    config.headers['Pragma'] = 'no-cache'
    config.headers['Expires'] = '0'
    // Add timestamp to prevent browser caching
    config.params = { ...config.params, _t: Date.now() }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (authStore) {
        authStore.logout()
      } else {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        localStorage.removeItem('originalUser')
        router.push('/login')
      }
    }
    return Promise.reject(error)
  }
)

export default apiClient