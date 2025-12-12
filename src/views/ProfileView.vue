<template>
  <div class="profile-view">
    <el-row :gutter="16">
      <el-col :xs="24" :lg="14">
        <el-card class="edit-card">
          <template #header>
            <div class="card-header">
              <span>Редактирование профиля</span>
            </div>
          </template>
          <el-form :model="editForm" label-width="120px" size="default">
            <el-form-item label="Логин">
              <el-input v-model="user.username" disabled />
            </el-form-item>
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
      <el-col :xs="24" :lg="10">
        <el-card class="info-card">
          <template #header>
            <div class="card-header">
              <span>Информация о счете</span>
            </div>
          </template>
          <div class="balance-info">
            <div class="balance-amount">{{ user?.balance?.toFixed(2) || '0.00' }} ₽</div>
            <div class="balance-label">Текущий баланс</div>
            <el-button type="primary" @click="$router.push('/payments')" style="width: 100%; margin-top: 16px">
              Пополнить баланс
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import apiClient from '@/api/client'
import { ElMessage } from 'element-plus'

const authStore = useAuthStore()
const user = computed(() => authStore.user)
const saving = ref(false)
const changingPassword = ref(false)

const editForm = ref({ email: '', phone: '' })
const passwordForm = ref({ currentPassword: '', newPassword: '', confirmPassword: '' })

const loadProfile = () => {
  if (user.value) {
    editForm.value = { 
      email: user.value.email || '', 
      phone: user.value.phone || '' 
    }
  }
}

const updateProfile = async () => {
  try {
    saving.value = true
    await apiClient.put(`/users/${user.value.id}`, editForm.value)
    await authStore.fetchUser(true)
    ElMessage.success('Профиль обновлен')
    loadProfile()
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

.balance-info {
  text-align: center;
  padding: 32px 16px;
}

.balance-amount {
  font-size: 48px;
  font-weight: 700;
  color: var(--el-color-primary);
  line-height: 1.2;
  margin-bottom: 8px;
}

.balance-label {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  margin-bottom: 24px;
}

@media (max-width: 768px) {
  .profile-view {
    padding: 12px;
  }
  
  .balance-amount {
    font-size: 36px;
  }
}
</style>