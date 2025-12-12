<template>
  <div class="profile-view">
    <el-row :gutter="20">
      <el-col :xs="24" :lg="8">
        <el-card class="profile-card">
          <template #header>
            <div class="card-header">
              <span>Профиль</span>
            </div>
          </template>
          <div class="profile-avatar">
            <el-avatar :size="120" :icon="UserFilled" />
            <h2>{{ user?.username }}</h2>
            <el-tag :type="user?.is_active ? 'success' : 'danger'">
              {{ user?.is_active ? 'Активен' : 'Неактивен' }}
            </el-tag>
          </div>
          <el-divider />
          <el-descriptions :column="1" border>
            <el-descriptions-item label="ID">{{ user?.id }}</el-descriptions-item>
            <el-descriptions-item label="Email">{{ user?.email }}</el-descriptions-item>
            <el-descriptions-item label="Телефон">{{ user?.phone || 'Не указан' }}</el-descriptions-item>
            <el-descriptions-item label="Баланс">
              <span style="color: var(--el-color-primary); font-weight: 600;">
                {{ user?.balance?.toFixed(2) || '0.00' }} ₽
              </span>
            </el-descriptions-item>
          </el-descriptions>
        </el-card>

        <el-card class="roles-card" style="margin-top: 20px">
          <template #header>
            <div class="card-header">
              <span>Роли и права</span>
            </div>
          </template>
          <div v-if="userRoles.length > 0">
            <h4>Роли:</h4>
            <el-space wrap>
              <el-tag 
                v-for="role in userRoles" 
                :key="role.id"
                :type="role.name === 'root' ? 'danger' : role.name === 'admin' ? 'warning' : 'info'"
              >
                {{ role.name }}
              </el-tag>
            </el-space>
          </div>
          <el-divider />
          <div v-if="userPermissions.length > 0">
            <h4>Права доступа:</h4>
            <el-scrollbar max-height="300px">
              <div class="permissions-list">
                <el-tag 
                  v-for="perm in displayedPermissions" 
                  :key="perm.id"
                  size="small"
                  style="margin: 4px;"
                >
                  {{ perm.resource }}: {{ perm.action }}
                </el-tag>
              </div>
            </el-scrollbar>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="16">
        <el-card class="edit-card">
          <template #header>
            <div class="card-header">
              <span>Редактирование профиля</span>
            </div>
          </template>
          <el-form :model="editForm" label-width="140px">
            <el-form-item label="Email">
              <el-input v-model="editForm.email" />
            </el-form-item>
            <el-form-item label="Телефон">
              <el-input v-model="editForm.phone" placeholder="+7..." />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="updateProfile" :loading="saving">
                Сохранить изменения
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
        <el-card class="password-card" style="margin-top: 20px">
          <template #header>
            <div class="card-header">
              <span>Изменение пароля</span>
            </div>
          </template>
          <el-form :model="passwordForm" label-width="180px">
            <el-form-item label="Текущий пароль">
              <el-input v-model="passwordForm.currentPassword" type="password" show-password />
            </el-form-item>
            <el-form-item label="Новый пароль">
              <el-input v-model="passwordForm.newPassword" type="password" show-password />
            </el-form-item>
            <el-form-item label="Подтвердите пароль">
              <el-input v-model="passwordForm.confirmPassword" type="password" show-password />
            </el-form-item>
            <el-form-item>
              <el-button type="warning" @click="changePassword" :loading="changingPassword">
                Изменить пароль
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
        <el-card class="stats-card" style="margin-top: 20px">
          <template #header>
            <div class="card-header">
              <span>Моя статистика</span>
            </div>
          </template>
          <el-row :gutter="20" v-loading="loadingStats">
            <el-col :xs="24" :sm="12">
              <div class="stat-item">
                <el-icon :size="32" color="#409eff"><Phone /></el-icon>
                <div class="stat-content">
                  <div class="stat-value">{{ stats.totalCalls }}</div>
                  <div class="stat-label">Всего звонков</div>
                </div>
              </div>
            </el-col>
            <el-col :xs="24" :sm="12">
              <div class="stat-item">
                <el-icon :size="32" color="#67c23a"><Phone /></el-icon>
                <div class="stat-content">
                  <div class="stat-value">{{ stats.totalCallsToday }}</div>
                  <div class="stat-label">Звонков сегодня</div>
                </div>
              </div>
            </el-col>
            <el-col :xs="24" :sm="12" style="margin-top: 20px">
              <div class="stat-item">
                <el-icon :size="32" color="#f56c6c"><Wallet /></el-icon>
                <div class="stat-content">
                  <div class="stat-value">{{ stats.totalSpentToday.toFixed(2) }} ₽</div>
                  <div class="stat-label">Потрачено сегодня</div>
                </div>
              </div>
            </el-col>
            <el-col :xs="24" :sm="12" style="margin-top: 20px">
              <div class="stat-item">
                <el-icon :size="32" color="#e6a23c"><Wallet /></el-icon>
                <div class="stat-content">
                  <div class="stat-value">{{ stats.totalSpentMonth.toFixed(2) }} ₽</div>
                  <div class="stat-label">Потрачено за месяц</div>
                </div>
              </div>
            </el-col>
          </el-row>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { usePermissionsStore } from '@/stores/permissions'
import { statsAPI } from '@/api/stats'
import apiClient from '@/api/client'
import { UserFilled, Phone, Wallet } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
const authStore = useAuthStore()
const permissionsStore = usePermissionsStore()
const user = computed(() => authStore.user)
const saving = ref(false)
const changingPassword = ref(false)
const loadingStats = ref(false)

const editForm = ref({
  email: '',
  phone: ''
})

const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const stats = ref({
  totalCalls: 0,
  totalCallsToday: 0,
  totalSpentToday: 0,
  totalSpentMonth: 0
})

const userRoles = computed(() => user.value?.roles || [])
const userPermissions = computed(() => permissionsStore.permissions || [])
const displayedPermissions = computed(() => userPermissions.value.slice(0, 20))
const loadProfile = () => {
  if (user.value) {
    editForm.value = {
      email: user.value.email || '',
      phone: user.value.phone || ''
    }
  }
}

const loadStats = async () => {
  try {
    loadingStats.value = true
    const response = await statsAPI.getDashboardStats()
    stats.value = {
      totalCalls: response.data.total_calls,
      totalCallsToday: response.data.total_calls_today,
      totalSpentToday: response.data.total_spent_today,
      totalSpentMonth: response.data.total_spent_month
    }
  } catch (error) {
    console.error('Ошибка загрузки статистики:', error)
  } finally {
    loadingStats.value = false
  }
}

const updateProfile = async () => {
  try {
    saving.value = true
    await apiClient.put(`/users/${user.value.id}`, editForm.value)
    await authStore.fetchUser(true)
    ElMessage.success('Профиль обновлен')
  } catch (error) {
    console.error('Ошибка обновления профиля:', error)
    ElMessage.error('Не удалось обновить профиль')
  } finally {
    saving.value = false
  }
}

const changePassword = async () => {
  if (!passwordForm.value.currentPassword || !passwordForm.value.newPassword || !passwordForm.value.confirmPassword) {
    ElMessage.warning('Заполните все поля')
    return
  }
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    ElMessage.warning('Пароли не совпадают')
    return
  }
  if (passwordForm.value.newPassword.length < 5) {
    ElMessage.warning('Пароль должен содержать минимум 5 символов')
    return
  }
  try {
    changingPassword.value = true
    ElMessage.info('Функционал изменения пароля в разработке')
    passwordForm.value = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  } catch (error) {
    console.error('Ошибка изменения пароля:', error)
    ElMessage.error('Не удалось изменить пароль')
  } finally {
    changingPassword.value = false
  }
}

onMounted(() => {
  loadProfile()
  loadStats()
})
</script>
<style scoped>
.profile-view {
  max-width: 1400px;
  margin: 0 auto;
}

.card-header {
  font-weight: 600;
  font-size: 16px;
}

.profile-avatar {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0;
}

.profile-avatar h2 {
  margin: 15px 0 10px 0;
  color: var(--el-text-color-primary);
}

.roles-card h4 {
  margin: 0 0 10px 0;
  color: var(--el-text-color-primary);
  font-size: 14px;
}

.permissions-list {
  padding: 10px 0;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: var(--el-fill-color-light);
  border-radius: 8px;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--el-text-color-primary);
  line-height: 1;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
</style>