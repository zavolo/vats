<template>
  <div class="dongles-view">
    <el-card class="compact-card">
      <template #header>
        <div class="card-header">
          <span>Управление донглами</span>
          <div class="header-actions">
            <el-select v-model="filters.isOnline" placeholder="Связь" clearable @change="loadDongles" size="small" style="width: 110px">
              <el-option label="Все" :value="null" />
              <el-option label="Онлайн" :value="true" />
              <el-option label="Оффлайн" :value="false" />
            </el-select>
            <el-button @click="syncDongles" size="small" :loading="syncing" :icon="RefreshRight">
              Синхр.
            </el-button>
            <el-button type="primary" @click="loadDongles" size="small" :loading="loading" :icon="Refresh" />
            <el-button type="success" @click="showCreateDialog = true" size="small" :icon="Plus" v-if="permissionsStore.hasPermission('dongles', 'create')">
              Добавить
            </el-button>
          </div>
        </div>
      </template>

      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="5" animated />
      </div>

      <div v-else-if="dongles.length === 0" class="empty-container">
        <el-empty description="Донглы не найдены" :image-size="80">
          <el-button type="primary" size="small" @click="syncDongles" :loading="syncing">
            Синхронизировать с Asterisk
          </el-button>
        </el-empty>
      </div>

      <div v-else class="dongles-list">
        <div v-for="dongle in dongles" :key="dongle.id" class="dongle-row">
          <div class="dongle-status">
            <div class="status-indicator" :class="{ online: dongle.is_online, offline: !dongle.is_online }"></div>
          </div>

          <div class="dongle-main">
            <div class="dongle-name">
              <span class="name">{{ dongle.name }}</span>
              <el-tag v-if="!dongle.is_active" type="danger" size="small">Неактивен</el-tag>
            </div>
            <div class="dongle-details">
              <span class="phone" v-if="dongle.phone_number">{{ dongle.phone_number }}</span>
              <span class="provider" v-if="dongle.provider">{{ dongle.provider }}</span>
              <span class="company" v-if="isRoot && getCompanyName(dongle.company_id) !== '-'">{{ getCompanyName(dongle.company_id) }}</span>
            </div>
          </div>

          <div class="dongle-tech">
            <div class="tech-item" v-if="dongle.imei">
              <span class="tech-label">IMEI</span>
              <span class="tech-value">{{ dongle.imei }}</span>
            </div>
            <div class="tech-item" v-if="dongle.imsi">
              <span class="tech-label">IMSI</span>
              <span class="tech-value">{{ dongle.imsi }}</span>
            </div>
          </div>

          <div class="dongle-actions">
            <el-button size="small" @click="openEditDialog(dongle)" v-if="permissionsStore.hasPermission('dongles', 'update')">
              Изменить
            </el-button>
            <el-dropdown @command="(cmd) => handleCommand(cmd, dongle)" trigger="click">
              <el-button size="small" :icon="MoreFilled" />
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="sms" v-if="permissionsStore.hasPermission('dongles', 'send_sms')">
                    <el-icon><Message /></el-icon> SMS
                  </el-dropdown-item>
                  <el-dropdown-item command="ussd" v-if="permissionsStore.hasPermission('dongles', 'send_ussd')">
                    <el-icon><Position /></el-icon> USSD
                  </el-dropdown-item>
                  <el-dropdown-item command="reload" v-if="permissionsStore.hasPermission('dongles', 'reload')">
                    <el-icon><RefreshRight /></el-icon> Перезагрузить
                  </el-dropdown-item>
                  <el-dropdown-item command="delete" divided v-if="permissionsStore.hasPermission('dongles', 'delete')">
                    <el-icon><Delete /></el-icon> Удалить
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </div>

      <el-pagination
        v-if="dongles.length > 0"
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.limit"
        :total="pagination.total"
        :page-sizes="[20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        @size-change="loadDongles"
        @current-change="loadDongles"
        class="pagination"
        small
      />
    </el-card>

    <el-dialog v-model="showCreateDialog" title="Добавить донгл" width="500px">
      <el-form :model="createForm" label-width="130px" size="default">
        <el-form-item label="Имя" required>
          <el-input v-model="createForm.name" placeholder="dongle0" />
        </el-form-item>
        <el-form-item label="Провайдер">
          <el-input v-model="createForm.provider" placeholder="МТС, Билайн, МегаФон" />
        </el-form-item>
        <el-form-item label="IMEI">
          <el-input v-model="createForm.imei" placeholder="358705034571309" />
        </el-form-item>
        <el-form-item label="IMSI">
          <el-input v-model="createForm.imsi" placeholder="250028755596504" />
        </el-form-item>
        <el-form-item label="Номер телефона">
          <el-input v-model="createForm.phone_number" placeholder="+79991234567" />
        </el-form-item>
        <el-form-item label="Audio устройство">
          <el-input v-model="createForm.audio_device" placeholder="/dev/ttyUSB1" />
        </el-form-item>
        <el-form-item label="Data устройство">
          <el-input v-model="createForm.data_device" placeholder="/dev/ttyUSB2" />
        </el-form-item>
        <el-form-item label="Контекст">
          <el-input v-model="createForm.context" placeholder="from-gsm-megafon" />
        </el-form-item>
        <el-form-item label="Группа">
          <el-input-number v-model="createForm.group" :min="1" :max="99" />
        </el-form-item>
        <el-form-item label="Компания" v-if="isRoot">
          <el-select v-model="createForm.company_id" placeholder="Выберите компанию" clearable style="width: 100%">
            <el-option v-for="company in companies" :key="company.id" :label="company.name" :value="company.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">Отмена</el-button>
        <el-button type="primary" @click="createDongle" :loading="saving">Создать</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showEditDialog" title="Редактировать донгл" width="500px">
      <el-form :model="editForm" label-width="130px" size="default">
        <el-form-item label="Провайдер">
          <el-input v-model="editForm.provider" />
        </el-form-item>
        <el-form-item label="Номер телефона">
          <el-input v-model="editForm.phone_number" />
        </el-form-item>
        <el-form-item label="Audio устройство">
          <el-input v-model="editForm.audio_device" placeholder="/dev/ttyUSB1" />
        </el-form-item>
        <el-form-item label="Data устройство">
          <el-input v-model="editForm.data_device" placeholder="/dev/ttyUSB2" />
        </el-form-item>
        <el-form-item label="Активность">
          <el-switch v-model="editForm.is_active" />
        </el-form-item>
        <el-form-item label="Компания" v-if="isRoot">
          <el-select v-model="editForm.company_id" placeholder="Выберите компанию" clearable style="width: 100%">
            <el-option v-for="company in companies" :key="company.id" :label="company.name" :value="company.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditDialog = false">Отмена</el-button>
        <el-button type="primary" @click="updateDongle" :loading="saving">Сохранить</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showSmsDialog" title="Отправить SMS" width="450px">
      <el-form :model="smsForm" label-width="100px" size="default">
        <el-form-item label="Донгл">
          <el-input :value="currentDongle?.name" disabled />
        </el-form-item>
        <el-form-item label="Номер" required>
          <el-input v-model="smsForm.number" placeholder="+79991234567" />
        </el-form-item>
        <el-form-item label="Сообщение" required>
          <el-input v-model="smsForm.message" type="textarea" :rows="4" placeholder="Текст сообщения" maxlength="160" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showSmsDialog = false">Отмена</el-button>
        <el-button type="primary" @click="sendSms" :loading="sending">Отправить</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showUssdDialog" title="Отправить USSD" width="380px">
      <el-form :model="ussdForm" label-width="100px" size="default">
        <el-form-item label="Донгл">
          <el-input :value="currentDongle?.name" disabled />
        </el-form-item>
        <el-form-item label="USSD код" required>
          <el-input v-model="ussdForm.ussd" placeholder="*100#, *101#, *105#" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showUssdDialog = false">Отмена</el-button>
        <el-button type="primary" @click="sendUssd" :loading="sending">Отправить</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onActivated } from 'vue'
import { Refresh, Plus, MoreFilled, RefreshRight, Message, Position, Delete } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import { useNotifications } from '@/composables/useNotifications'
import apiClient from '@/api/client'
import { usePermissionsStore } from '@/stores/permissions'

const notifications = useNotifications()
const permissionsStore = usePermissionsStore()
const isRoot = computed(() => permissionsStore.isRoot)
const companies = ref([])

const dongles = ref([])
const loading = ref(false)
const saving = ref(false)
const sending = ref(false)
const syncing = ref(false)
const filters = ref({ isActive: null, isOnline: null })
const pagination = ref({ page: 1, limit: 20, total: 0 })

const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const showSmsDialog = ref(false)
const showUssdDialog = ref(false)

const createForm = ref({
  name: '',
  provider: '',
  imei: '',
  imsi: '',
  phone_number: '',
  audio_device: '',
  data_device: '',
  context: '',
  group: 1,
  company_id: null
})
const editForm = ref({
  provider: '',
  phone_number: '',
  audio_device: '',
  data_device: '',
  is_active: true,
  company_id: null
})
const smsForm = ref({ number: '', message: '' })
const ussdForm = ref({ ussd: '' })
const currentDongle = ref(null)

const loadCompanies = async () => {
  if (!isRoot.value) return
  try {
    const response = await apiClient.get('/companies', { params: { _t: Date.now() } })
    companies.value = response.data
  } catch (error) {
    console.error('Ошибка загрузки компаний:', error)
  }
}

const getCompanyName = (companyId) => {
  if (!companyId) return '-'
  const company = companies.value.find(c => c.id === companyId)
  return company ? company.name : '-'
}

const loadDongles = async () => {
  try {
    loading.value = true
    const params = {
      skip: (pagination.value.page - 1) * pagination.value.limit,
      limit: pagination.value.limit,
      _t: Date.now()
    }
    if (filters.value.isActive !== null) params.is_active = filters.value.isActive
    if (filters.value.isOnline !== null) params.is_online = filters.value.isOnline

    const response = await apiClient.get('/dongles', {
      params,
      headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
    })
    dongles.value = response.data
    pagination.value.total = response.data.length
  } catch (error) {
    console.error('Ошибка загрузки донглов:', error)
    notifications.error('Ошибка загрузки', 'Не удалось загрузить список донглов')
  } finally {
    loading.value = false
  }
}

const syncDongles = async () => {
  try {
    syncing.value = true
    const response = await apiClient.get('/dongles/sync', {
      params: { _t: Date.now() },
      headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
    })
    notifications.success('Синхронизация завершена', response.data.message || `Синхронизировано: ${response.data.count}`)
    await loadDongles()
  } catch (error) {
    console.error('Ошибка синхронизации донглов:', error)
    notifications.error('Ошибка синхронизации', error.response?.data?.detail || 'Не удалось синхронизировать донглы')
  } finally {
    syncing.value = false
  }
}

const createDongle = async () => {
  if (!createForm.value.name) {
    notifications.warning('Не все поля заполнены', 'Укажите имя донгла')
    return
  }
  try {
    saving.value = true
    await apiClient.post('/dongles', createForm.value)
    notifications.success('Донгл создан', 'Новый донгл успешно добавлен')
    showCreateDialog.value = false
    createForm.value = { name: '', provider: '', imei: '', imsi: '', phone_number: '', audio_device: '', data_device: '', context: '', group: 1, company_id: null }
    await loadDongles()
  } catch (error) {
    console.error('Ошибка создания донгла:', error)
    notifications.error('Ошибка создания', error.response?.data?.detail || 'Не удалось создать донгл')
  } finally {
    saving.value = false
  }
}

const openEditDialog = (dongle) => {
  currentDongle.value = dongle
  editForm.value = {
    provider: dongle.provider || '',
    phone_number: dongle.phone_number || '',
    audio_device: dongle.audio_device || '',
    data_device: dongle.data_device || '',
    is_active: dongle.is_active,
    company_id: dongle.company_id || null
  }
  showEditDialog.value = true
}

const updateDongle = async () => {
  try {
    saving.value = true
    await apiClient.put(`/dongles/${currentDongle.value.id}`, editForm.value)
    notifications.success('Донгл обновлен', 'Данные донгла успешно сохранены')
    showEditDialog.value = false
    await loadDongles()
  } catch (error) {
    console.error('Ошибка обновления донгла:', error)
    notifications.error('Ошибка обновления', error.response?.data?.detail || 'Не удалось обновить донгл')
  } finally {
    saving.value = false
  }
}

const handleCommand = async (command, dongle) => {
  currentDongle.value = dongle
  switch (command) {
    case 'sms':
      smsForm.value = { number: '', message: '' }
      showSmsDialog.value = true
      break
    case 'ussd':
      ussdForm.value = { ussd: '' }
      showUssdDialog.value = true
      break
    case 'reload':
      await reloadDongle(dongle)
      break
    case 'delete':
      await deleteDongle(dongle)
      break
  }
}

const sendSms = async () => {
  if (!smsForm.value.number || !smsForm.value.message) {
    notifications.warning('Не все поля заполнены', 'Укажите получателя и текст сообщения')
    return
  }
  try {
    sending.value = true
    await apiClient.post(`/dongles/${currentDongle.value.id}/sms`, smsForm.value)
    notifications.success('SMS отправлено', 'Сообщение успешно отправлено')
    showSmsDialog.value = false
  } catch (error) {
    console.error('Ошибка отправки SMS:', error)
    notifications.error('Ошибка отправки', error.response?.data?.detail || 'Не удалось отправить SMS')
  } finally {
    sending.value = false
  }
}

const sendUssd = async () => {
  if (!ussdForm.value.ussd) {
    notifications.warning('Не все поля заполнены', 'Укажите USSD код')
    return
  }
  try {
    sending.value = true
    await apiClient.post(`/dongles/${currentDongle.value.id}/ussd`, ussdForm.value)
    notifications.success('USSD запрос отправлен', 'Запрос успешно отправлен')
    showUssdDialog.value = false
  } catch (error) {
    console.error('Ошибка отправки USSD:', error)
    notifications.error('Ошибка отправки', error.response?.data?.detail || 'Не удалось отправить USSD запрос')
  } finally {
    sending.value = false
  }
}

const reloadDongle = async (dongle) => {
  try {
    await apiClient.post(`/dongles/${dongle.id}/reload`)
    notifications.success('Донгл перезагружен', 'Перезагрузка успешно выполнена')
    setTimeout(() => loadDongles(), 2000)
  } catch (error) {
    console.error('Ошибка перезагрузки донгла:', error)
    notifications.error('Ошибка перезагрузки', error.response?.data?.detail || 'Не удалось перезагрузить донгл')
  }
}

const deleteDongle = async (dongle) => {
  try {
    await ElMessageBox.confirm(`Удалить донгл "${dongle.name}"?`, 'Подтверждение', {
      confirmButtonText: 'Удалить',
      cancelButtonText: 'Отмена',
      type: 'warning'
    })
    await apiClient.delete(`/dongles/${dongle.id}`)
    notifications.success('Донгл удален', 'Донгл успешно удалён из системы')
    await loadDongles()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Ошибка удаления донгла:', error)
      notifications.error('Ошибка удаления', error.response?.data?.detail || 'Не удалось удалить донгл')
    }
  }
}

onMounted(() => {
  loadDongles()
  loadCompanies()
})

onActivated(() => {
  loadDongles()
  loadCompanies()
})
</script>

<style scoped>
.dongles-view {
  padding: 12px;
  max-width: 1200px;
  margin: 0 auto;
}

.compact-card {
  box-shadow: 0 1px 4px rgba(0,0,0,0.1);
}

.compact-card :deep(.el-card__header) {
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.compact-card :deep(.el-card__body) {
  padding: 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.loading-container, .empty-container {
  padding: 24px 0;
}

.dongles-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dongle-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  transition: background-color 0.15s;
}

.dongle-row:hover {
  background: var(--el-fill-color-light);
}

.dongle-status {
  flex-shrink: 0;
}

.status-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--el-color-info-light-5);
}

.status-indicator.online {
  background: var(--el-color-success);
  box-shadow: 0 0 6px var(--el-color-success);
}

.status-indicator.offline {
  background: var(--el-color-info-light-5);
}

.dongle-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dongle-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dongle-name .name {
  font-weight: 600;
  font-size: 13px;
  color: var(--el-text-color-primary);
}

.dongle-details {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
}

.dongle-details .phone {
  color: var(--el-color-primary);
  font-weight: 500;
}

.dongle-details .provider {
  color: var(--el-text-color-secondary);
}

.dongle-details .company {
  color: var(--el-text-color-secondary);
  font-style: italic;
}

.dongle-tech {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 140px;
}

.tech-item {
  display: flex;
  gap: 6px;
  font-size: 11px;
}

.tech-label {
  color: var(--el-text-color-secondary);
  min-width: 35px;
}

.tech-value {
  color: var(--el-text-color-regular);
  font-family: monospace;
}

.dongle-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.pagination {
  margin-top: 16px;
  justify-content: center;
}

@media (max-width: 768px) {
  .dongles-view {
    padding: 8px;
  }

  .card-header {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .dongle-row {
    flex-wrap: wrap;
    gap: 8px;
  }

  .dongle-main {
    flex: 1 1 calc(100% - 30px);
  }

  .dongle-tech {
    flex: 1 1 100%;
    flex-direction: row;
    gap: 12px;
    min-width: auto;
  }

  .dongle-actions {
    flex: 1 1 100%;
    justify-content: flex-end;
  }
}
</style>