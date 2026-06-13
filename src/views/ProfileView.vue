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

        <el-card class="apikey-card" style="margin-top: 16px">
          <template #header>
            <div class="card-header">
              <span>API-ключ для бота</span>
            </div>
          </template>
          <p class="apikey-desc">
            С этим ключом ваш бот узнаёт о звонках и SMS мгновенно — слушает поток
            событий или опрашивает API. Ключ — это пароль, не публикуйте его.
          </p>

          <div v-if="hasKey" class="apikey-box">
            <el-input v-model="apiKey" readonly>
              <template #append>
                <el-button @click="copyText(apiKey)">Копировать</el-button>
              </template>
            </el-input>
            <div class="apikey-actions">
              <el-button size="small" type="primary" :loading="apiKeyLoading" @click="generateApiKey">
                Перевыпустить
              </el-button>
              <el-button size="small" type="danger" plain :loading="apiKeyLoading" @click="revokeApiKey">
                Отозвать
              </el-button>
            </div>
          </div>
          <div v-else>
            <el-button type="success" :loading="apiKeyLoading" @click="generateApiKey">
              Создать API-ключ
            </el-button>
          </div>

          <el-collapse v-if="hasKey" style="margin-top: 14px">
            <el-collapse-item title="Как использовать (для разработчика бота)">
              <div class="docs">
                <p><b>Поток событий (рекомендуется):</b></p>
                <pre>GET {{ apiBase }}/stream?api_key={{ apiKey }}</pre>
                <p>SSE-поток. События: <code>call.ringing</code> (вам звонят),
                   <code>call.ended</code>, <code>sms.received</code>,
                   <code>sms.updated</code>.</p>

                <p><b>Опрос (long-poll), если SSE неудобен:</b></p>
                <pre>GET {{ apiBase }}/events?since=&lt;last_id&gt;
Header: X-API-Key: {{ apiKey }}</pre>
                <p>Висит до 25 сек, отдаёт новые события и <code>last_event_id</code>.
                   В следующий раз передавайте его в <code>since</code>.</p>

                <p><b>Снимок сейчас:</b></p>
                <pre>GET {{ apiBase }}/active</pre>
                <p>Активные звонки + число непрочитанных SMS.</p>

                <p><b>Детали:</b> <code>{{ apiBase }}/calls</code>,
                   <code>{{ apiBase }}/sms</code> (можно <code>?unread_only=true</code>).</p>

                <p>Авторизация везде: заголовок <code>X-API-Key</code> или
                   <code>?api_key=</code> в URL.</p>
              </div>
            </el-collapse-item>
          </el-collapse>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import apiClient from '@/api/client'
import { useNotifications } from '@/composables/useNotifications'

const notifications = useNotifications()

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
    notifications.success('Успешно', 'Профиль обновлен')
    loadProfile()
  } catch (error) {
    console.error('Ошибка обновления профиля:', error)
    notifications.error('Ошибка обновления', 'Не удалось обновить профиль')
  } finally {
    saving.value = false
  }
}

const changePassword = async () => {
  if (!passwordForm.value.currentPassword || !passwordForm.value.newPassword || !passwordForm.value.confirmPassword) {
    notifications.warning('Предупреждение', 'Заполните все поля')
    return
  }
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    notifications.warning('Предупреждение', 'Пароли не совпадают')
    return
  }
  if (passwordForm.value.newPassword.length < 5) {
    notifications.warning('Предупреждение', 'Пароль должен содержать минимум 5 символов')
    return
  }
  try {
    changingPassword.value = true
    await apiClient.post('/users/me/change-password', {
      old_password: passwordForm.value.currentPassword,
      new_password: passwordForm.value.newPassword,
    })
    notifications.success('Готово', 'Пароль изменён')
    passwordForm.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
  } catch (error) {
    const detail = error.response?.data?.detail || 'Не удалось изменить пароль'
    notifications.error('Ошибка', detail)
  } finally {
    changingPassword.value = false
  }
}

// --- API ключ для бота ---
const apiKey = ref('')
const hasKey = ref(false)
const apiKeyLoading = ref(false)
const apiBase = computed(() => `${location.origin}/api/bot`)

const loadApiKey = async () => {
  try {
    const r = await apiClient.get('/users/me/api-key')
    apiKey.value = r.data.api_key || ''
    hasKey.value = r.data.has_key
  } catch (e) {
    console.warn('api-key load failed', e)
  }
}

const generateApiKey = async () => {
  apiKeyLoading.value = true
  try {
    const r = await apiClient.post('/users/me/api-key')
    apiKey.value = r.data.api_key
    hasKey.value = true
    notifications.success('Готово', 'API-ключ создан. Скопируйте его — он нужен боту.')
  } catch (e) {
    notifications.error('Ошибка', 'Не удалось создать ключ')
  } finally {
    apiKeyLoading.value = false
  }
}

const revokeApiKey = async () => {
  apiKeyLoading.value = true
  try {
    await apiClient.delete('/users/me/api-key')
    apiKey.value = ''
    hasKey.value = false
    notifications.success('Готово', 'API-ключ отозван')
  } catch (e) {
    notifications.error('Ошибка', 'Не удалось отозвать ключ')
  } finally {
    apiKeyLoading.value = false
  }
}

const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    notifications.success('Скопировано', '')
  } catch {
    notifications.warning('Не удалось скопировать', 'Скопируйте вручную')
  }
}

onMounted(() => {
  loadProfile()
  loadApiKey()
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

.apikey-desc {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin: 0 0 12px;
}
.apikey-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}
.docs {
  font-size: 13px;
  line-height: 1.5;
}
.docs pre {
  background: var(--el-fill-color-light);
  padding: 8px 10px;
  border-radius: 6px;
  overflow-x: auto;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
}
.docs code {
  background: var(--el-fill-color-light);
  padding: 1px 4px;
  border-radius: 3px;
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