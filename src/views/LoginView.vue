<template>
  <div class="login-container">
    <div class="login-box">
      <h2 class="login-title">Виртуальная АТС</h2>

      <el-alert
        v-if="errorMessage"
        :title="errorMessage"
        type="error"
        :closable="true"
        @close="errorMessage = ''"
        show-icon
      />

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        @submit.prevent="handleSubmit"
      >
        <el-form-item prop="username">
          <el-input
            v-model="form.username"
            placeholder="Логин"
            size="large"
            clearable
          >
            <template #prefix>
              <el-icon><User /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item v-if="isRegister" prop="email">
          <el-input
            v-model="form.email"
            type="email"
            placeholder="Email"
            size="large"
            clearable
          >
            <template #prefix>
              <el-icon><Message /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item v-if="isRegister" prop="phone">
          <el-input
            v-model="form.phone"
            placeholder="Телефон"
            size="large"
            clearable
          >
            <template #prefix>
              <el-icon><Phone /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="Пароль"
            size="large"
            show-password
          >
            <template #prefix>
              <el-icon><Lock /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item v-if="isRegister" prop="confirmPassword">
          <el-input
            v-model="form.confirmPassword"
            type="password"
            placeholder="Повторите пароль"
            size="large"
            show-password
          >
            <template #prefix>
              <el-icon><Lock /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-button
          type="primary"
          size="large"
          :loading="authStore.loading"
          native-type="submit"
          class="login-button"
        >
          {{ isRegister ? 'Зарегистрироваться' : 'Войти' }}
        </el-button>

        <div class="toggle-mode">
          <el-link type="primary" @click="toggleMode">
            {{ isRegister ? 'Уже есть аккаунт? Войти' : 'Регистрация' }}
          </el-link>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { User, Lock, Message, Phone } from '@element-plus/icons-vue'

const authStore = useAuthStore()
const formRef = ref()
const errorMessage = ref('')
const isRegister = ref(false)

const form = reactive({
  username: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: ''
})

const validateConfirmPassword = (rule, value, callback) => {
  if (value !== form.password) {
    callback(new Error('Пароли не совпадают'))
  } else {
    callback()
  }
}

const rules = reactive({
  username: [
    { required: true, message: 'Введите логин', trigger: 'blur' }
  ],
  email: [
    { required: true, message: 'Введите email', trigger: 'blur' },
    { type: 'email', message: 'Неверный формат email', trigger: 'blur' }
  ],
  phone: [
    { required: true, message: 'Введите телефон', trigger: 'blur' }
  ],
  password: [
    { required: true, message: 'Введите пароль', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: 'Подтвердите пароль', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' }
  ]
})

const toggleMode = () => {
  isRegister.value = !isRegister.value
  formRef.value?.resetFields()
  errorMessage.value = ''
}

const handleSubmit = async () => {
  errorMessage.value = ''

  try {
    await formRef.value.validate()

    if (isRegister.value) {
      await authStore.register({
        username: form.username,
        email: form.email,
        phone: form.phone,
        password: form.password
      })
    } else {
      await authStore.login(form.username, form.password)
    }
  } catch (error) {
    if (error.response?.status === 502) {
      errorMessage.value = 'Сервер временно недоступен. Попробуйте позже.'
    } else if (error.response?.data?.detail) {
      const detail = error.response.data.detail
      if (Array.isArray(detail)) {
        errorMessage.value = detail.map(err => `${err.field}: ${err.message}`).join(', ')
      } else {
        errorMessage.value = detail
      }
    } else if (error.message) {
      errorMessage.value = error.message
    } else {
      errorMessage.value = 'Неверный логин или пароль'
    }
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0a1612 0%, #1a3a2d 50%, #2d5a3d 100%);
  padding: 20px;
}

.login-box {
  width: 100%;
  max-width: 380px;
  background: var(--el-bg-color-overlay);
  border-radius: 12px;
  padding: 40px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.login-title {
  text-align: center;
  margin: 0 0 30px 0;
  color: var(--el-text-color-primary);
  font-size: 24px;
  font-weight: 600;
}

.el-alert {
  margin-bottom: 20px;
}

.el-form-item {
  margin-bottom: 20px;
}

.login-button {
  width: 100%;
  margin-top: 10px;
}

.toggle-mode {
  text-align: center;
  margin-top: 15px;
}

:deep(.el-input__inner:-webkit-autofill),
:deep(.el-input__inner:-webkit-autofill:hover),
:deep(.el-input__inner:-webkit-autofill:focus),
:deep(.el-input__inner:-webkit-autofill:active) {
  -webkit-text-fill-color: var(--el-text-color-primary) !important;
  -webkit-box-shadow: 0 0 0 1000px var(--el-fill-color-blank) inset !important;
  box-shadow: 0 0 0 1000px var(--el-fill-color-blank) inset !important;
  transition: background-color 5000s ease-in-out 0s !important;
}
</style>