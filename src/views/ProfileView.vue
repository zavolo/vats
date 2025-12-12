<template>
  <div class="profile-view">
    <el-row :gutter="16">
      <el-col :xs="24" :lg="10">
        <el-card class="profile-card">
          <template #header>
            <div class="card-header">
              <span>Профиль</span>
            </div>
          </template>
          <div class="profile-avatar">
            <el-avatar :size="80" :icon="UserFilled" />
            <h3>{{ user?.username }}</h3>
            <el-tag :type="user?.is_active ? 'success' : 'danger'" size="small">
              {{ user?.is_active ? 'Активен' : 'Неактивен' }}
            </el-tag>
          </div>
          <el-divider style="margin: 16px 0" />
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="ID">{{ user?.id }}</el-descriptions-item>
            <el-descriptions-item label="Email">{{ user?.email }}</el-descriptions-item>
            <el-descriptions-item label="Телефон">{{ user?.phone || 'Не указан' }}</el-descriptions-item>
            <el-descriptions-item label="Баланс">
              <span style="color: var(--el-color-primary); font-weight: 600;">
                {{ user?.balance?.toFixed(2) || '0.00' }} ₽
              </span>
            </el-descriptions-item>
          </el-descriptions>
          <el-divider style="margin: 16px 0" v-if="userRoles.length > 0" />
          <div v-if="userRoles.length > 0">
            <h4 style="margin: 0 0 8px 0; font-size: 13px;">Роли:</h4>
            <el-space wrap>
              <el-tag v-for="role in userRoles" :key="role.id" :type="getRoleType(role.name)" size="small">
                {{ role.name }}
              </el-tag>
            </el-space>
          </div>
        </el-card>

        <el-card class="stats-card" style="margin-top: 16px">
          <template #header>
            <div class="card-header">
              <span>Статистика</span>
            </div>
          </template>
          <el-row :gutter="12" v-loading="loadingStats">
            <el-col :span="12">
              <div class="stat-box">
                <div class="stat-value">{{ stats.totalCalls }}</div>
                <div class="stat-label">Всего звонков</div>
              </div>
            </el-col>
            <el-col :span="12">
              <div class="stat-box">
                <div class="stat-value">{{ stats.totalCallsToday }}</div>
                <div class="stat-label">Сегодня</div>
              </div>
            </el-col>
            <el-col :span="12" style="margin-top: 12px">
              <div class="stat-box">
                <div class="stat-value">{{ stats.totalSpentToday.toFixed(2) }} ₽</div>
                <div class="stat-label">Потрачено сегодня</div>
              </div>
            </el-col>
            <el-col :span="12" style="margin-top: 12px">
              <div class="stat-box">
                <div class="stat-value">{{ stats.totalSpentMonth.toFixed(2) }} ₽</div>
                <div class="stat-label">За месяц</div>
              </div>
            </el-col>
          </el-row>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="14">
        <el-card class="edit-card">
          <template #header>
            <div class="card-header">
              <span>Редактирование</span>
            </div>
          </template>
          <el-form :model="editForm" label-width="120px" size="default">
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

        <el-card class="password-card" style="margin-top: 16px">
          <template #header>
            <div class="card-header">
              <span>Изменение пароля</span>
            </div>
          </template>
          <el-form :model="passwordForm" label-width="160px" size="default">
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
import { UserFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const authStore = useAuthStore()
const permissionsStore = usePermissionsStore()
const user = computed(() => authStore.user)
const saving = ref(false)
const changingPassword = ref(false)
const loadingStats = ref(false)

const editForm = ref({ email: '', phone: '' })
const passwordForm = ref({ currentPassword: '', newPassword: '', confirmPassword: '' })
const stats = ref({ totalCalls: 0, totalCallsToday: 0, totalSpentToday: 0, totalSpentMonth: 0 })

const userRoles = computed(() => user.value?.roles || [])

const getRoleType = (roleName) => {
  const types = { 'root': 'danger', 'admin': 'warning', 'user': 'info' }
  return types[roleName] || 'info'
}

const loadProfile = () => {
  if (user.value) {
    editForm.value = { email: user.value.email || '', phone: user.value.phone || '' }
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
    passwordForm.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
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
  padding: 16px;
  max-width: 1400px;
  margin: 0 auto;
}

.card-header {
  font-size: 14px;
  font-weight: 600;
}

.profile-avatar {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 0;
}

.profile-avatar h3 {
  margin: 12px 0 8px 0;
  color: var(--el-text-color-primary);
  font-size: 18px;
}

.stat-box {
  text-align: center;
  padding: 12px;
  background: var(--el-fill-color-light);
  border-radius: 8px;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--el-text-color-primary);
  line-height: 1.2;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

@media (max-width: 768px) {
  .profile-view {
    padding: 12px;
  }
}
</style>