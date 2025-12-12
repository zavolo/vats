<template>
  <div class="settings-view">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>Настройки системы</span>
        </div>
      </template>

      <el-tabs v-model="activeTab" type="border-card">
        <el-tab-pane label="Общие" name="general">
          <el-form label-width="180px" size="default">
            <el-form-item label="Тема интерфейса">
              <el-radio-group v-model="settings.theme">
                <el-radio label="dark">Тёмная</el-radio>
                <el-radio label="light">Светлая</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="Язык">
              <el-select v-model="settings.language" style="width: 200px">
                <el-option label="Русский" value="ru" />
                <el-option label="English" value="en" />
              </el-select>
            </el-form-item>
            <el-form-item label="Часовой пояс">
              <el-select v-model="settings.timezone" style="width: 200px">
                <el-option label="UTC+3 (Москва)" value="Europe/Moscow" />
                <el-option label="UTC+0 (UTC)" value="UTC" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="saveSettings" :loading="saving">
                Сохранить
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="Звонки" name="calls">
          <el-form label-width="200px" size="default">
            <el-form-item label="Запись звонков">
              <el-switch v-model="callSettings.recordCalls" />
            </el-form-item>
            <el-form-item label="Автоответчик">
              <el-switch v-model="callSettings.autoAnswer" />
            </el-form-item>
            <el-form-item label="Мелодия ожидания">
              <el-input v-model="callSettings.waitMelody" placeholder="custom/melody.wav" />
            </el-form-item>
            <el-form-item label="Максимальное время звонка">
              <el-input-number v-model="callSettings.maxCallDuration" :min="60" :max="3600" />
              <span style="margin-left: 8px;">секунд</span>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="saveCallSettings" :loading="saving">
                Сохранить
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="Уведомления" name="notifications">
          <el-form label-width="200px" size="default">
            <el-form-item label="Email уведомления">
              <el-switch v-model="notificationSettings.emailEnabled" />
            </el-form-item>
            <el-form-item label="SMS уведомления">
              <el-switch v-model="notificationSettings.smsEnabled" />
            </el-form-item>
            <el-form-item label="Уведомления о звонках">
              <el-switch v-model="notificationSettings.callNotifications" />
            </el-form-item>
            <el-form-item label="Уведомления о платежах">
              <el-switch v-model="notificationSettings.paymentNotifications" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="saveNotificationSettings" :loading="saving">
                Сохранить
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="Безопасность" name="security">
          <el-form label-width="220px" size="default">
            <el-form-item label="Двухфакторная аутентификация">
              <el-switch v-model="securitySettings.twoFactorEnabled" />
            </el-form-item>
            <el-form-item label="Время сеанса (минуты)">
              <el-input-number v-model="securitySettings.sessionTimeout" :min="5" :max="1440" />
            </el-form-item>
            <el-form-item label="История входов">
              <el-button @click="showLoginHistory = true">Просмотреть</el-button>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="saveSecuritySettings" :loading="saving">
                Сохранить
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="API" name="api" v-if="isRoot">
          <el-form label-width="150px" size="default">
            <el-form-item label="API токен">
              <el-input v-model="apiToken" disabled>
                <template #append>
                  <el-button @click="regenerateToken" :loading="regenerating">
                    Обновить
                  </el-button>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item label="Webhook URL">
              <el-input v-model="webhookUrl" placeholder="https://example.com/webhook" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="saveApiSettings" :loading="saving">
                Сохранить
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <el-dialog v-model="showLoginHistory" title="История входов" width="700px">
      <el-table :data="loginHistory" size="small">
        <el-table-column prop="date" label="Дата" width="150" />
        <el-table-column prop="ip" label="IP адрес" width="150" />
        <el-table-column prop="device" label="Устройство" />
        <el-table-column prop="location" label="Местоположение" width="150" />
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const user = computed(() => authStore.user)
const isRoot = computed(() => user.value?.roles?.some(role => role.name === 'root') || false)

const activeTab = ref('general')
const saving = ref(false)
const regenerating = ref(false)
const showLoginHistory = ref(false)

const settings = ref({
  theme: 'dark',
  language: 'ru',
  timezone: 'Europe/Moscow'
})

const callSettings = ref({
  recordCalls: false,
  autoAnswer: false,
  waitMelody: '',
  maxCallDuration: 1800
})

const notificationSettings = ref({
  emailEnabled: true,
  smsEnabled: false,
  callNotifications: true,
  paymentNotifications: true
})

const securitySettings = ref({
  twoFactorEnabled: false,
  sessionTimeout: 30
})

const apiToken = ref('sk_live_1234567890abcdefghijklmnopqrstuvwxyz')
const webhookUrl = ref('')

const loginHistory = ref([
  { date: '2025-12-12 14:30', ip: '192.168.1.100', device: 'Chrome, Windows', location: 'Москва, Россия' },
  { date: '2025-12-11 09:15', ip: '192.168.1.101', device: 'Safari, macOS', location: 'Москва, Россия' }
])

const saveSettings = () => {
  saving.value = true
  setTimeout(() => {
    ElMessage.success('Настройки сохранены')
    saving.value = false
  }, 500)
}

const saveCallSettings = () => {
  saving.value = true
  setTimeout(() => {
    ElMessage.success('Настройки звонков сохранены')
    saving.value = false
  }, 500)
}

const saveNotificationSettings = () => {
  saving.value = true
  setTimeout(() => {
    ElMessage.success('Настройки уведомлений сохранены')
    saving.value = false
  }, 500)
}

const saveSecuritySettings = () => {
  saving.value = true
  setTimeout(() => {
    ElMessage.success('Настройки безопасности сохранены')
    saving.value = false
  }, 500)
}

const saveApiSettings = () => {
  saving.value = true
  setTimeout(() => {
    ElMessage.success('API настройки сохранены')
    saving.value = false
  }, 500)
}

const regenerateToken = () => {
  regenerating.value = true
  setTimeout(() => {
    apiToken.value = 'sk_live_' + Math.random().toString(36).substring(2, 40)
    ElMessage.success('Токен обновлён')
    regenerating.value = false
  }, 500)
}

onMounted(() => {
  const savedSettings = localStorage.getItem('app_settings')
  if (savedSettings) {
    const parsed = JSON.parse(savedSettings)
    settings.value = { ...settings.value, ...parsed }
  }
})
</script>

<style scoped>
.settings-view {
  padding: 16px;
  max-width: 1200px;
  margin: 0 auto;
}

.card-header {
  font-size: 14px;
  font-weight: 600;
}

@media (max-width: 768px) {
  .settings-view {
    padding: 12px;
  }
}
</style>