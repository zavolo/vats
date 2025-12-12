<template>
  <div class="dongles-view">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>Управление донглами</span>
          <el-space>
            <el-button type="info" @click="syncDongles" size="small" :loading="syncing">
              <el-icon><RefreshRight /></el-icon>
              Синхронизация
            </el-button>
            <el-button type="primary" @click="loadDongles" size="small" :loading="loading">
              <el-icon><Refresh /></el-icon>
              Обновить
            </el-button>
            <el-button type="success" @click="showCreateDialog = true" size="small" v-if="permissionsStore.hasPermission('dongles', 'create')">
              <el-icon><Plus /></el-icon>
              Добавить донгл
            </el-button>
          </el-space>
        </div>
      </template>

      <el-form :inline="true" class="filter-form" size="small">
        <el-form-item label="Активность">
          <el-select v-model="filters.isActive" placeholder="Все" clearable @change="loadDongles" style="width: 140px">
            <el-option label="Все" :value="null" />
            <el-option label="Активные" :value="true" />
            <el-option label="Неактивные" :value="false" />
          </el-select>
        </el-form-item>
        <el-form-item label="Связь">
          <el-select v-model="filters.isOnline" placeholder="Все" clearable @change="loadDongles" style="width: 140px">
            <el-option label="Все" :value="null" />
            <el-option label="Онлайн" :value="true" />
            <el-option label="Оффлайн" :value="false" />
          </el-select>
        </el-form-item>
      </el-form>

      <el-alert v-if="dongles.length === 0 && !loading" type="info" :closable="false" style="margin-bottom: 16px">
        <template #default>
          <div style="display: flex; align-items: center; gap: 12px;">
            <span>Донглы не найдены. Попробуйте синхронизировать с Asterisk.</span>
            <el-button type="primary" size="small" @click="syncDongles" :loading="syncing">
              Синхронизировать
            </el-button>
          </div>
        </template>
      </el-alert>

      <el-table :data="dongles" v-loading="loading" style="width: 100%" stripe size="small">
        <el-table-column prop="name" label="Имя" width="130" />
        <el-table-column prop="provider" label="Провайдер" width="110" />
        <el-table-column prop="phone_number" label="Номер" width="130" />
        <el-table-column label="Активность" width="100">
          <template #default="{ row }">
            <el-tag :type="row.is_active ? 'success' : 'danger'" size="small">
              {{ row.is_active ? 'Активен' : 'Неактивен' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Связь" width="90">
          <template #default="{ row }">
            <el-tag :type="row.is_online ? 'success' : 'info'" size="small">
              {{ row.is_online ? 'Online' : 'Offline' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="imei" label="IMEI" min-width="140" show-overflow-tooltip />
        <el-table-column prop="imsi" label="IMSI" min-width="140" show-overflow-tooltip />
        <el-table-column label="Действия" width="200" fixed="right">
          <template #default="{ row }">
            <el-space :size="4">
              <el-button size="small" @click="openEditDialog(row)" v-if="permissionsStore.hasPermission('dongles', 'update')">
                Изменить
              </el-button>
              <el-dropdown @command="(cmd) => handleCommand(cmd, row)" trigger="click">
                <el-button size="small">
                  <el-icon><MoreFilled /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="sms" v-if="permissionsStore.hasPermission('dongles', 'send_sms')">
                      SMS
                    </el-dropdown-item>
                    <el-dropdown-item command="ussd" v-if="permissionsStore.hasPermission('dongles', 'send_ussd')">
                      USSD
                    </el-dropdown-item>
                    <el-dropdown-item command="reload" v-if="permissionsStore.hasPermission('dongles', 'reload')">
                      Перезагрузить
                    </el-dropdown-item>
                    <el-dropdown-item command="delete" divided v-if="permissionsStore.hasPermission('dongles', 'delete')">
                      Удалить
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </el-space>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.limit"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        @size-change="loadDongles"
        @current-change="loadDongles"
        style="margin-top: 16px; justify-content: center"
        small
      />
    </el-card>

    <el-dialog v-model="showCreateDialog" title="Добавить донгл" width="550px">
      <el-form :model="createForm" label-width="140px" size="default">
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
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">Отмена</el-button>
        <el-button type="primary" @click="createDongle" :loading="saving">Создать</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showEditDialog" title="Редактировать донгл" width="550px">
      <el-form :model="editForm" label-width="140px" size="default">
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
      </el-form>
      <template #footer>
        <el-button @click="showEditDialog = false">Отмена</el-button>
        <el-button type="primary" @click="updateDongle" :loading="saving">Сохранить</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showSmsDialog" title="Отправить SMS" width="500px">
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

    <el-dialog v-model="showUssdDialog" title="Отправить USSD" width="400px">
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
import { ref, onMounted } from 'vue'
import { Refresh, Plus, MoreFilled, RefreshRight } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import apiClient from '@/api/client'
import { usePermissionsStore } from '@/stores/permissions'

const permissionsStore = usePermissionsStore()

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
  group: 1
})
const editForm = ref({ 
  provider: '', 
  phone_number: '', 
  audio_device: '',
  data_device: '',
  is_active: true 
})
const smsForm = ref({ number: '', message: '' })
const ussdForm = ref({ ussd: '' })
const currentDongle = ref(null)

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
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
    dongles.value = response.data
    pagination.value.total = response.data.length
  } catch (error) {
    console.error('Ошибка загрузки донглов:', error)
    ElMessage.error('Не удалось загрузить донглы')
  } finally {
    loading.value = false
  }
}

const syncDongles = async () => {
  try {
    syncing.value = true
    const response = await apiClient.get('/dongles/sync', {
      params: { _t: Date.now() },
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
    ElMessage.success(response.data.message || `Синхронизировано донглов: ${response.data.count}`)
    await loadDongles()
  } catch (error) {
    console.error('Ошибка синхронизации донглов:', error)
    ElMessage.error(error.response?.data?.detail || 'Не удалось синхронизировать донглы с Asterisk')
  } finally {
    syncing.value = false
  }
}

const createDongle = async () => {
  if (!createForm.value.name) {
    ElMessage.warning('Укажите имя донгла')
    return
  }
  try {
    saving.value = true
    await apiClient.post('/dongles', createForm.value)
    ElMessage.success('Донгл создан и настроен в Asterisk')
    showCreateDialog.value = false
    createForm.value = { 
      name: '', 
      provider: '', 
      imei: '', 
      imsi: '', 
      phone_number: '',
      audio_device: '',
      data_device: '',
      context: '',
      group: 1
    }
    await loadDongles()
  } catch (error) {
    console.error('Ошибка создания донгла:', error)
    ElMessage.error(error.response?.data?.detail || 'Не удалось создать донгл')
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
    is_active: dongle.is_active 
  }
  showEditDialog.value = true
}

const updateDongle = async () => {
  try {
    saving.value = true
    await apiClient.put(`/dongles/${currentDongle.value.id}`, editForm.value)
    ElMessage.success('Донгл обновлен, изменения применены в Asterisk')
    showEditDialog.value = false
    await loadDongles()
  } catch (error) {
    console.error('Ошибка обновления донгла:', error)
    ElMessage.error(error.response?.data?.detail || 'Не удалось обновить донгл')
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
    ElMessage.warning('Заполните все поля')
    return
  }
  try {
    sending.value = true
    await apiClient.post(`/dongles/${currentDongle.value.id}/sms`, smsForm.value)
    ElMessage.success('SMS отправлено')
    showSmsDialog.value = false
  } catch (error) {
    console.error('Ошибка отправки SMS:', error)
    ElMessage.error(error.response?.data?.detail || 'Не удалось отправить SMS')
  } finally {
    sending.value = false
  }
}

const sendUssd = async () => {
  if (!ussdForm.value.ussd) {
    ElMessage.warning('Укажите USSD код')
    return
  }
  try {
    sending.value = true
    await apiClient.post(`/dongles/${currentDongle.value.id}/ussd`, ussdForm.value)
    ElMessage.success('USSD запрос отправлен')
    showUssdDialog.value = false
  } catch (error) {
    console.error('Ошибка отправки USSD:', error)
    ElMessage.error(error.response?.data?.detail || 'Не удалось отправить USSD')
  } finally {
    sending.value = false
  }
}

const reloadDongle = async (dongle) => {
  try {
    await apiClient.post(`/dongles/${dongle.id}/reload`)
    ElMessage.success('Донгл перезагружен')
    setTimeout(() => loadDongles(), 2000)
  } catch (error) {
    console.error('Ошибка перезагрузки донгла:', error)
    ElMessage.error(error.response?.data?.detail || 'Не удалось перезагрузить донгл')
  }
}

const deleteDongle = async (dongle) => {
  try {
    await ElMessageBox.confirm(
      `Вы уверены, что хотите удалить донгл "${dongle.name}"? Это также удалит его конфигурацию из Asterisk.`, 
      'Подтверждение', 
      {
        confirmButtonText: 'Удалить',
        cancelButtonText: 'Отмена',
        type: 'warning'
      }
    )
    await apiClient.delete(`/dongles/${dongle.id}`)
    ElMessage.success('Донгл удален из БД и Asterisk')
    await loadDongles()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Ошибка удаления донгла:', error)
      ElMessage.error(error.response?.data?.detail || 'Не удалось удалить донгл')
    }
  }
}

onMounted(() => {
  loadDongles()
})
</script>

<style scoped>
.dongles-view {
  padding: 16px;
  max-width: 1400px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
}

.filter-form {
  margin-bottom: 16px;
}

@media (max-width: 768px) {
  .dongles-view {
    padding: 12px;
  }
}
</style>