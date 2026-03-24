<template>
  <div class="asterisk-servers-view">
    <el-card class="compact-card">
      <template #header>
        <div class="card-header">
          <span>Управление серверами Asterisk</span>
          <div class="header-actions">
            <el-button type="primary" @click="loadServers" size="small" :icon="Refresh">
              Обновить
            </el-button>
            <el-button type="success" @click="showCreateDialog = true" size="small" :icon="Plus" v-if="permissionsStore.hasPermission('asterisk-servers', 'create')">
              Добавить
            </el-button>
          </div>
        </div>
      </template>

      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="5" animated />
      </div>

      <div v-else-if="servers.length === 0" class="empty-container">
        <el-empty description="Нет серверов" :image-size="80" />
      </div>

      <div v-else class="servers-list">
        <div v-for="server in servers" :key="server.id" class="server-row">
          <div class="server-status">
            <div class="status-indicator" :class="{ online: server.is_online, offline: !server.is_online }"></div>
          </div>

          <div class="server-main">
            <div class="server-name">
              <span class="name">{{ server.name }}</span>
              <el-tag v-if="!server.is_active" type="danger" size="small">Неактивен</el-tag>
            </div>
            <div class="server-endpoints">
              <span class="endpoint">
                <span class="label">SIP:</span>
                {{ server.sip_host }}:{{ server.sip_port }}
              </span>
              <span class="endpoint">
                <span class="label">AMI:</span>
                {{ server.ami_host }}:{{ server.ami_port }}
              </span>
            </div>
          </div>

          <div class="server-stats">
            <div class="stat">
              <span class="stat-value">{{ server.current_calls || 0 }}</span>
              <span class="stat-label">{{ pluralize(server.current_calls || 0, ['звонок', 'звонка', 'звонков']) }}</span>
            </div>
            <div class="stat">
              <span class="stat-value">{{ server.capacity || 100 }}</span>
              <span class="stat-label">лимит</span>
            </div>
          </div>

          <div class="server-actions">
            <el-button size="small" @click="testConnection(server)" :icon="Connection" circle title="Тест подключения" />
            <el-button size="small" @click="openEditDialog(server)" :icon="Edit" circle v-if="permissionsStore.hasPermission('asterisk-servers', 'update')" title="Редактировать" />
            <el-button size="small" type="danger" @click="deleteServer(server)" :icon="Delete" circle v-if="permissionsStore.hasPermission('asterisk-servers', 'delete')" title="Удалить" />
          </div>
        </div>
      </div>

      <el-pagination
        v-if="servers.length > 0"
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.limit"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        @size-change="loadServers"
        @current-change="loadServers"
        class="pagination"
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
        <el-form-item label="AMI Пароль" required>
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
import { Refresh, Plus, Edit, Delete, Connection } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import { useNotifications } from '@/composables/useNotifications'
import apiClient from '@/api/client'
import { usePermissionsStore } from '@/stores/permissions'

const permissionsStore = usePermissionsStore()
const notifications = useNotifications()

const pluralize = (n, forms) => {
  const num = Math.abs(n) % 100
  const n1 = num % 10
  if (num > 10 && num < 20) return forms[2]
  if (n1 > 1 && n1 < 5) return forms[1]
  if (n1 === 1) return forms[0]
  return forms[2]
}

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
    notifications.error('Ошибка загрузки', 'Не удалось загрузить серверы')
  } finally {
    loading.value = false
  }
}

const createServer = async () => {
  if (!createForm.value.name || !createForm.value.sip_host || !createForm.value.ami_host || !createForm.value.ami_username || !createForm.value.ami_password) {
    notifications.warning('Предупреждение', 'Заполните все обязательные поля')
    return
  }
  try {
    saving.value = true
    await apiClient.post('/asterisk-servers', createForm.value)
    notifications.success('Успешно', 'Сервер создан')
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
    notifications.error('Ошибка создания', error.response?.data?.detail || 'Не удалось создать сервер')
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
    notifications.success('Успешно', 'Сервер обновлён')
    showEditDialog.value = false
    await loadServers()
  } catch (error) {
    console.error('Ошибка обновления сервера:', error)
    notifications.error('Ошибка обновления', error.response?.data?.detail || 'Не удалось обновить сервер')
  } finally {
    saving.value = false
  }
}

const testConnection = async (server) => {
  try {
    const response = await apiClient.post(`/asterisk-servers/${server.id}/test-connection`)
    if (response.data.status === 'online') {
      notifications.success('Успешно', 'Подключение установлено')
    } else {
      notifications.warning('Предупреждение', response.data.message || 'Подключение не установлено')
    }
    await loadServers()
  } catch (error) {
    console.error('Ошибка тестирования:', error)
    notifications.error('Ошибка подключения', 'Не удалось протестировать подключение')
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
    notifications.success('Успешно', 'Сервер удалён')
    await loadServers()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Ошибка удаления сервера:', error)
      notifications.error('Ошибка удаления', 'Не удалось удалить сервер')
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

.servers-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.server-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 6px;
  transition: background-color 0.15s;
}

.server-row:hover {
  background: var(--el-fill-color-light);
}

.server-status {
  flex-shrink: 0;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  transition: all 0.3s;
}

.status-indicator.online {
  background: var(--el-color-success);
  box-shadow: 0 0 6px var(--el-color-success);
}

.status-indicator.offline {
  background: var(--el-color-info-light-5);
}

.server-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.server-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.server-name .name {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.server-endpoints {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.endpoint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  font-family: 'SF Mono', Monaco, Consolas, monospace;
}

.endpoint .label {
  color: var(--el-text-color-placeholder);
  margin-right: 4px;
}

.server-stats {
  display: flex;
  gap: 16px;
  flex-shrink: 0;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 50px;
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.stat-label {
  font-size: 10px;
  color: var(--el-text-color-secondary);
  text-transform: uppercase;
}

.server-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.pagination {
  margin-top: 16px;
  justify-content: center;
}

@media (max-width: 768px) {
  .asterisk-servers-view {
    padding: 8px;
  }

  .card-header {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
  }

  .server-row {
    flex-wrap: wrap;
    gap: 8px;
  }

  .server-main {
    flex: 1 1 calc(100% - 30px);
  }

  .server-stats {
    width: 100%;
    justify-content: flex-start;
    padding-left: 24px;
  }

  .server-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>