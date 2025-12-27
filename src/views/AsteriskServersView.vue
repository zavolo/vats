<template>
  <div class="asterisk-servers-view">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>Управление серверами</span>
          <el-space>
            <el-button type="primary" @click="loadServers" size="small" :loading="loading">
              <el-icon><Refresh /></el-icon>
              Обновить
            </el-button>
            <el-button type="success" @click="showCreateDialog = true" size="small" v-if="permissionsStore.hasPermission('companies', 'create')">
              <el-icon><Plus /></el-icon>
              Добавить сервер
            </el-button>
          </el-space>
        </div>
      </template>
      <el-table :data="servers" v-loading="loading" style="width: 100%" stripe size="small">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="name" label="Название" width="150" />
        <el-table-column label="SIP" width="180">
          <template #default="{ row }">
            {{ row.sip_host }}:{{ row.sip_port }}
          </template>
        </el-table-column>
        <el-table-column label="AMI" width="180">
          <template #default="{ row }">
            {{ row.ami_host }}:{{ row.ami_port }}
          </template>
        </el-table-column>
        <el-table-column label="Статус" width="100">
          <template #default="{ row }">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span :style="{ 
                width: '10px', 
                height: '10px', 
                borderRadius: '50%', 
                backgroundColor: row.is_online ? '#67c23a' : '#909399',
                display: 'inline-block'
              }"></span>
              <span>{{ row.is_online ? 'Онлайн' : 'Оффлайн' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="capacity" label="Capacity" width="90" />
        <el-table-column prop="current_calls" label="Звонков" width="80" />
        <el-table-column label="Действия" width="280" fixed="right">
          <template #default="{ row }">
            <el-space :size="4">
              <el-button size="small" @click="openEditDialog(row)" v-if="permissionsStore.hasPermission('companies', 'update')">
                Изменить
              </el-button>
              <el-button size="small" type="primary" @click="testConnection(row)">
                Тест
              </el-button>
              <el-button size="small" type="danger" @click="deleteServer(row)" v-if="permissionsStore.hasPermission('companies', 'delete')">
                Удалить
              </el-button>
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
        @size-change="loadServers"
        @current-change="loadServers"
        style="margin-top: 16px; justify-content: center"
        small
      />
    </el-card>
    <el-dialog v-model="showCreateDialog" title="Добавить Asterisk сервер" width="600px">
      <el-form :model="createForm" label-width="140px" size="default">
        <el-form-item label="Название" required>
          <el-input v-model="createForm.name" placeholder="" />
        </el-form-item>
        <el-form-item label="SIP IP" required>
          <el-input v-model="createForm.sip_host" placeholder="" />
        </el-form-item>
        <el-form-item label="SIP Порт">
          <el-input-number v-model="createForm.sip_port" :min="1" :max="65535" style="width: 100%" />
        </el-form-item>
        <el-form-item label="SIP Домен">
          <el-input v-model="createForm.sip_domain" placeholder="" />
        </el-form-item>
        <el-form-item label="AMI IP" required>
          <el-input v-model="createForm.ami_host" placeholder="" />
        </el-form-item>
        <el-form-item label="AMI Порт">
          <el-input-number v-model="createForm.ami_port" :min="1" :max="65535" style="width: 100%" />
        </el-form-item>
        <el-form-item label="AMI Логин" required>
          <el-input v-model="createForm.ami_username" placeholder="" />
        </el-form-item>
        <el-form-item label="AMI Паароль" required>
          <el-input v-model="createForm.ami_password" type="password" show-password />
        </el-form-item>
        <el-form-item label="Capacity">
          <el-input-number v-model="createForm.capacity" :min="1" :max="1000" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">Отмена</el-button>
        <el-button type="primary" @click="createServer" :loading="saving">Создать</el-button>
      </template>
    </el-dialog>
    <el-dialog v-model="showEditDialog" title="Редактировать сервер" width="600px">
      <el-form :model="editForm" label-width="140px" size="default">
        <el-form-item label="Название">
          <el-input v-model="editForm.name" />
        </el-form-item>
        <el-form-item label="SIP IP">
          <el-input v-model="editForm.sip_host" />
        </el-form-item>
        <el-form-item label="SIP Порт">
          <el-input-number v-model="editForm.sip_port" :min="1" :max="65535" style="width: 100%" />
        </el-form-item>
        <el-form-item label="SIP Домен">
          <el-input v-model="editForm.sip_domain" />
        </el-form-item>
        <el-form-item label="AMI IP">
          <el-input v-model="editForm.ami_host" />
        </el-form-item>
        <el-form-item label="AMI Порт">
          <el-input-number v-model="editForm.ami_port" :min="1" :max="65535" style="width: 100%" />
        </el-form-item>
        <el-form-item label="AMI Логин">
          <el-input v-model="editForm.ami_username" />
        </el-form-item>
        <el-form-item label="AMI Пароль">
          <el-input v-model="editForm.ami_password" type="password" show-password placeholder="Оставьте пустым, чтобы не менять" />
        </el-form-item>
        <el-form-item label="Capacity">
          <el-input-number v-model="editForm.capacity" :min="1" :max="1000" style="width: 100%" />
        </el-form-item>
        <el-form-item label="Активность">
          <el-switch v-model="editForm.is_active" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditDialog = false">Отмена</el-button>
        <el-button type="primary" @click="updateServer" :loading="saving">Сохранить</el-button>
      </template>
    </el-dialog>
  </div>
</template>
<script setup>
import { ref, onMounted, onActivated } from 'vue'
import { Refresh, Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import apiClient from '@/api/client'
import { usePermissionsStore } from '@/stores/permissions'
const permissionsStore = usePermissionsStore()
const servers = ref([])
const loading = ref(false)
const saving = ref(false)
const currentServer = ref(null)
const pagination = ref({
  page: 1,
  limit: 20,
  total: 0
})

const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const createForm = ref({
  name: '',
  sip_host: '',
  sip_port: 5060,
  sip_domain: '',
  ami_host: '',
  ami_port: 5038,
  ami_username: '',
  ami_password: '',
  capacity: 100
})

const editForm = ref({
  name: '',
  sip_host: '',
  sip_port: 5060,
  sip_domain: '',
  ami_host: '',
  ami_port: 5038,
  ami_username: '',
  ami_password: '',
  capacity: 100,
  is_active: true
})

const loadServers = async () => {
  try {
    loading.value = true
    const params = {
      skip: (pagination.value.page - 1) * pagination.value.limit,
      limit: pagination.value.limit,
      _t: Date.now()
    }
    const response = await apiClient.get('/asterisk-servers', {
      params,
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
    servers.value = response.data
    pagination.value.total = response.data.length
  } catch (error) {
    console.error('Ошибка загрузки серверов:', error)
    ElMessage.error('Не удалось загрузить серверы')
  } finally {
    loading.value = false
  }
}

const createServer = async () => {
  if (!createForm.value.name || !createForm.value.sip_host || !createForm.value.ami_host || !createForm.value.ami_username || !createForm.value.ami_password) {
    ElMessage.warning('Заполните все обязательные поля')
    return
  }
  try {
    saving.value = true
    await apiClient.post('/asterisk-servers', createForm.value)
    ElMessage.success('Сервер создан')
    showCreateDialog.value = false
    createForm.value = {
      name: '',
      sip_host: '',
      sip_port: 5060,
      sip_domain: '',
      ami_host: '',
      ami_port: 5038,
      ami_username: '',
      ami_password: '',
      capacity: 100
    }
    await loadServers()
  } catch (error) {
    console.error('Ошибка создания сервера:', error)
    ElMessage.error(error.response?.data?.detail || 'Не удалось создать сервер')
  } finally {
    saving.value = false
  }
}

const openEditDialog = (server) => {
  currentServer.value = server
  editForm.value = {
    name: server.name || '',
    sip_host: server.sip_host || '',
    sip_port: server.sip_port || 5060,
    sip_domain: server.sip_domain || '',
    ami_host: server.ami_host || '',
    ami_port: server.ami_port || 5038,
    ami_username: server.ami_username || '',
    ami_password: '',
    capacity: server.capacity || 100,
    is_active: server.is_active
  }
  showEditDialog.value = true
}

const updateServer = async () => {
  try {
    saving.value = true
    const updateData = { ...editForm.value }
    if (!updateData.ami_password) {
      delete updateData.ami_password
    }
    await apiClient.put(`/asterisk-servers/${currentServer.value.id}`, updateData)
    ElMessage.success('Сервер обновлён')
    showEditDialog.value = false
    await loadServers()
  } catch (error) {
    console.error('Ошибка обновления сервера:', error)
    ElMessage.error(error.response?.data?.detail || 'Не удалось обновить сервер')
  } finally {
    saving.value = false
  }
}

const testConnection = async (server) => {
  try {
    const response = await apiClient.post(`/asterisk-servers/${server.id}/test-connection`)
    if (response.data.status === 'online') {
      ElMessage.success('Подключение установлено')
    } else {
      ElMessage.warning(response.data.message || 'Подключение не установлено')
    }
    await loadServers()
  } catch (error) {
    console.error('Ошибка тестирования:', error)
    ElMessage.error('Не удалось протестировать подключение')
  }
}

const deleteServer = async (server) => {
  try {
    await ElMessageBox.confirm(
      `Вы уверены, что хотите удалить сервер "${server.name}"?`,
      'Подтверждение',
      {
        confirmButtonText: 'Удалить',
        cancelButtonText: 'Отмена',
        type: 'warning'
      }
    )
    await apiClient.delete(`/asterisk-servers/${server.id}`)
    ElMessage.success('Сервер удалён')
    await loadServers()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Ошибка удаления сервера:', error)
      ElMessage.error('Не удалось удалить сервер')
    }
  }
}

onMounted(() => {
  loadServers()
})

onActivated(() => {
  loadServers()
})
</script>
<style scoped>
.asterisk-servers-view {
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

@media (max-width: 768px) {
  .asterisk-servers-view {
    padding: 12px;
  }
}
</style>