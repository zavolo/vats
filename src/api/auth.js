import apiClient from './client'

export const authAPI = {
  login(username, password) {
    const formData = new FormData()
    formData.append('username', username)
    formData.append('password', password)
    return apiClient.post('/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })
  },

  register(data) {
    return apiClient.post('/auth/register', data)
  },

  getCurrentUser() {
    return apiClient.get('/users/me')
  }
}