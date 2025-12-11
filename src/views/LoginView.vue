<template>
  <div class="login-container">
    <el-card class="login-card">
      <template #header>
        <div class="card-header">
          <h2>{{ isRegister ? 'Регистрация' : 'Вход в систему' }}</h2>
        </div>
      </template>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        @submit.prevent="handleSubmit"
      >
        <el-form-item label="Имя пользователя" prop="username">
          <el-input
            v-model="form.username"
            placeholder="Введите имя пользователя"
            size="large"
          />
        </el-form-item>

        <el-form-item v-if="isRegister" label="Email" prop="email">
          <el-input
            v-model="form.email"
            type="email"
            placeholder="Введите email"
            size="large"
          />
        </el-form-item>

        <el-form-item v-if="isRegister" label="Телефон" prop="phone">
          <el-input
            v-model="form.phone"
            placeholder="Введите телефон (необязательно)"
            size="large"
          />
        </el-form-item>

        <el-form-item label="Пароль" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="Введите пароль"
            size="large"
            show-password
          />
        </el-form-item>

        <el-form-item v-if="isRegister" label="Подтверждение пароля" prop="confirmPassword">
          <el-input
            v-model="form.confirmPassword"
            type="password"
            placeholder="Повторите пароль"
            size="large"
            show-password
          />
        </el-form-item>

        <el-alert
          v-if="authStore.error"
          :title="authStore.error"
          type="error"
          :closable="false"
          style="margin-bottom: 20px"
        />

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="authStore.loading"
            native-type="submit"
            style="width: 100%"
          >
            {{ isRegister ? 'Зарегистрироваться' : 'Войти' }}
          </el-button>
        </el-form-item>

        <div class="switch-mode">
          <el-link type="primary" @click="toggleMode">
            {{ isRegister ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться' }}
          </el-link>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'

const authStore = useAuthStore()
const formRef = ref()
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
    { required: true, message: 'Введите имя пользователя', trigger: 'blur' },
    { min: 3, message: 'Минимум 3 символа', trigger: 'blur' }
  ],
  email: [
    { required: true, message: 'Введите email', trigger: 'blur' },
    { type: 'email', message: 'Неверный формат email', trigger: 'blur' }
  ],
  password: [
    { required: true, message: 'Введите пароль', trigger: 'blur' },
    { min: 5, message: 'Минимум 5 символов', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: 'Подтвердите пароль', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' }
  ]
})

const toggleMode = () => {
  isRegister.value = !isRegister.value
  formRef.value?.resetFields()
  authStore.error = null
}

const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    
    if (isRegister.value) {
      await authStore.register({
        username: form.username,
        email: form.email,
        phone: form.phone || null,
        password: form.password
      })
      ElMessage.success('Регистрация успешна!')
    } else {
      await authStore.login(form.username, form.password)
      ElMessage.success('Вход выполнен!')
    }
  } catch (error) {
    if (error.response?.data?.detail) {
      if (Array.isArray(error.response.data.detail)) {
        error.response.data.detail.forEach(err => {
          ElMessage.error(`${err.field}: ${err.message}`)
        })
      } else {
        ElMessage.error(error.response.data.detail)
      }
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

.login-card {
  width: 100%;
  max-width: 450px;
}

.card-header {
  text-align: center;
}

.card-header h2 {
  margin: 0;
  color: var(--el-text-color-primary);
}

.switch-mode {
  text-align: center;
  margin-top: 10px;
}
</style>