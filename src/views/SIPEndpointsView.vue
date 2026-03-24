<template>
  <div class="sip-endpoints-view">
    <el-card class="compact-card">
      <template #header>
        <div class="card-header">
          <span>SIP аккаунты</span>
          <div class="header-actions">
            <el-select v-model="filters.isRegistered" placeholder="Статус" clearable @change="loadEndpoints" size="small" style="width: 110px">
              <el-option label="Все" :value="null" />
              <el-option label="Онлайн" :value="true" />
              <el-option label="Оффлайн" :value="false" />
            </el-select>
            <el-button type="primary" @click="loadEndpoints" size="small" :loading="loading" :icon="Refresh" />
            <el-button type="success" @click="showCreateDialog = true" size="small" :icon="Plus">
              Добавить
            </el-button>
          </div>
        </div>
      </template>

      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="5" animated />
      </div>

      <div v-else-if="endpoints.length === 0" class="empty-container">
        <el-empty description="Нет SIP аккаунтов" :image-size="80" />
      </div>

      <div v-else class="endpoints-list">
        <div v-for="endpoint in endpoints" :key="endpoint.id" class="endpoint-row">
          <div class="endpoint-status">
            <div class="status-indicator" :class="{ online: endpoint.is_registered, offline: !endpoint.is_registered }"></div>
          </div>

          <div class="endpoint-main">
            <div class="endpoint-name">
              <span class="name">{{ endpoint.display_name || endpoint.username }}</span>
              <el-tag v-if="!endpoint.is_active" type="danger" size="small">Неактивен</el-tag>
              <el-tag :type="endpoint.is_registered ? 'success' : 'info'" size="small">
                {{ endpoint.is_registered ? 'Онлайн' : 'Оффлайн' }}
              </el-tag>
            </div>
            <div class="endpoint-details">
              <span class="detail-item">
                <span class="detail-label">Внутр. номер:</span>
                <span class="detail-value">{{ endpoint.extension }}</span>
              </span>
              <span class="detail-item">
                <span class="detail-label">Логин:</span>
                <span class="detail-value">{{ endpoint.username }}</span>
              </span>
            </div>
          </div>

          <div class="endpoint-actions">
            <el-button size="small" @click="showCredentials(endpoint)">
              Данные
            </el-button>
            <el-dropdown @command="(cmd) => handleCommand(cmd, endpoint)" trigger="click">
              <el-button size="small" :icon="MoreFilled" />
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="edit">
                    <el-icon><Edit /></el-icon> Изменить
                  </el-dropdown-item>
                  <el-dropdown-item command="delete" divided>
                    <el-icon><Delete /></el-icon> Удалить
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </div>

      <el-pagination
        v-if="endpoints.length > 0"
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.limit"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        @size-change="loadEndpoints"
        @current-change="loadEndpoints"
        class="pagination"
        small
      />
    </el-card>

    <!-- Диалог создания -->
    <el-dialog v-model="showCreateDialog" title="Добавить SIP аккаунт" width="500px">
      <el-form :model="createForm" label-width="140px" size="default">
        <el-form-item label="Логин" required>
          <el-input v-model="createForm.username" placeholder="user100" />
        </el-form-item>
        <el-form-item label="Экстеншен" required>
          <el-input v-model="createForm.extension" placeholder="100" />
        </el-form-item>
        <el-form-item label="Имя">
          <el-input v-model="createForm.display_name" placeholder="Иван Иванов" />
        </el-form-item>
        <el-form-item label="Asterisk сервер" required v-if="isRoot">
          <el-select v-model="createForm.asterisk_server_id" style="width: 100%" placeholder="Выберите сервер">
            <el-option
              v-for="server in asteriskServers"
              :key="server.id"
              :label="`${server.name} (${server.sip_host})`"
              :value="server.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="Пароль">
          <el-input v-model="createForm.password" type="password" show-password placeholder="Авто, если пусто" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">Отмена</el-button>
        <el-button type="primary" @click="createEndpoint" :loading="saving">Создать</el-button>
      </template>
    </el-dialog>

    <!-- Диалог редактирования -->
    <el-dialog v-model="showEditDialog" title="Редактировать SIP аккаунт" width="500px">
      <el-form :model="editForm" label-width="140px" size="default">
        <el-form-item label="Логин">
          <el-input :value="currentEndpoint?.username" disabled />
        </el-form-item>
        <el-form-item label="Экстеншен">
          <el-input :value="currentEndpoint?.extension" disabled />
        </el-form-item>
        <el-form-item label="Имя">
          <el-input v-model="editForm.display_name" />
        </el-form-item>
        <el-form-item label="Активность">
          <el-switch v-model="editForm.is_active" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditDialog = false">Отмена</el-button>
        <el-button type="primary" @click="updateEndpoint" :loading="saving">Сохранить</el-button>
      </template>
    </el-dialog>

    <!-- Диалог учётных данных -->
    <el-dialog v-model="showCredentialsDialog" title="Данные для подключения" width="420px">
      <div v-loading="loadingCredentials">
        <div class="credentials-grid" v-if="credentials">
          <div class="cred-row">
            <span class="cred-label">SIP сервер</span>
            <div class="cred-value">
              <code>{{ credentials.sip_server }}:{{ credentials.sip_port }}</code>
              <el-button size="small" text @click="copyToClipboard(`${credentials.sip_server}:${credentials.sip_port}`)">
                <el-icon><CopyDocument /></el-icon>
              </el-button>
            </div>
          </div>
          <div class="cred-row">
            <span class="cred-label">Логин</span>
            <div class="cred-value">
              <code>{{ credentials.username }}</code>
              <el-button size="small" text @click="copyToClipboard(credentials.username)">
                <el-icon><CopyDocument /></el-icon>
              </el-button>
            </div>
          </div>
          <div class="cred-row">
            <span class="cred-label">Пароль</span>
            <div class="cred-value">
              <code v-if="passwordVisible">{{ credentials.password }}</code>
              <code v-else>••••••••••••</code>
              <el-button size="small" text @click="passwordVisible = !passwordVisible">
                <el-icon><View v-if="!passwordVisible" /><Hide v-else /></el-icon>
              </el-button>
              <el-button size="small" text @click="copyToClipboard(credentials.password)">
                <el-icon><CopyDocument /></el-icon>
              </el-button>
            </div>
          </div>
          <div class="cred-row">
            <span class="cred-label">Экстеншен</span>
            <div class="cred-value">
              <code>{{ credentials.extension }}</code>
            </div>
          </div>
          <div class="cred-row" v-if="credentials.display_name">
            <span class="cred-label">Имя</span>
            <div class="cred-value">{{ credentials.display_name }}</div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button type="primary" @click="showCredentialsDialog = false">Закрыть</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onActivated } from 'vue'
import { Refresh, Plus, CopyDocument, View, Hide, Edit, Delete, MoreFilled } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import { useNotifications } from '@/composables/useNotifications'
import { usePermissionsStore } from '@/stores/permissions'
import apiClient from '@/api/client'

const notifications = useNotifications()
const permissionsStore = usePermissionsStore()

const isRoot = computed(() => permissionsStore.isRoot)
const isAdmin = computed(() => permissionsStore.isAdmin)

const endpoints = ref([])
const asteriskServers = ref([])
const loading = ref(false)
const saving = ref(false)
const currentEndpoint = ref(null)
const filters = ref({ isRegistered: null })

const pagination = ref({
  page: 1,
  limit: 20,
  total: 0
})

const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const showCredentialsDialog = ref(false)
const loadingCredentials = ref(false)
const credentials = ref(null)
const passwordVisible = ref(false)

const createForm = ref({
  username: '',
  extension: '',
  display_name: '',
  asterisk_server_id: null,
  password: ''
})

const editForm = ref({
  display_name: '',
  is_active: true
})

const loadEndpoints = async () => {
  try {
    loading.value = true
    const params = {
      skip: (pagination.value.page - 1) * pagination.value.limit,
      limit: pagination.value.limit,
      _t: Date.now()
    }
    if (filters.value.isRegistered !== null) {
      params.is_registered = filters.value.isRegistered
    }
    const response = await apiClient.get('/sip-endpoints', {
      params,
      headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
    })
    endpoints.value = response.data
    pagination.value.total = response.data.length
  } catch (error) {
    console.error('Ошибка загрузки SIP аккаунтов:', error)
    notifications.error('Ошибка загрузки', 'Не удалось загрузить SIP аккаунты')
  } finally {
    loading.value = false
  }
}

const loadAsteriskServers = async () => {
  try {
    const response = await apiClient.get('/asterisk-servers', {
      params: { _t: Date.now() }
    })
    asteriskServers.value = response.data

    // Для админа автоматически выбираем первый сервер (сервер компании)
    if (isAdmin.value && !isRoot.value && asteriskServers.value.length > 0) {
      createForm.value.asterisk_server_id = asteriskServers.value[0].id
    }
  } catch (error) {
    console.error('Ошибка загрузки серверов:', error)
  }
}

const createEndpoint = async () => {
  if (!createForm.value.username || !createForm.value.extension || !createForm.value.asterisk_server_id) {
    notifications.warning('Предупреждение', 'Заполните обязательные поля')
    return
  }
  try {
    saving.value = true
    await apiClient.post('/sip-endpoints', createForm.value)
    notifications.success('Успешно', 'SIP аккаунт создан')
    showCreateDialog.value = false
    createForm.value = {
      username: '',
      extension: '',
      display_name: '',
      asterisk_server_id: null,
      password: ''
    }
    await loadEndpoints()
  } catch (error) {
    console.error('Ошибка создания SIP аккаунта:', error)
    notifications.error('Ошибка создания', error.response?.data?.detail || 'Не удалось создать SIP аккаунт')
  } finally {
    saving.value = false
  }
}

const handleCommand = async (command, endpoint) => {
  currentEndpoint.value = endpoint
  switch (command) {
    case 'edit':
      openEditDialog(endpoint)
      break
    case 'delete':
      await deleteEndpoint(endpoint)
      break
  }
}

const openEditDialog = (endpoint) => {
  currentEndpoint.value = endpoint
  editForm.value = {
    display_name: endpoint.display_name || '',
    is_active: endpoint.is_active
  }
  showEditDialog.value = true
}

const updateEndpoint = async () => {
  try {
    saving.value = true
    await apiClient.put(`/sip-endpoints/${currentEndpoint.value.id}`, editForm.value)
    notifications.success('Успешно', 'SIP аккаунт обновлён')
    showEditDialog.value = false
    await loadEndpoints()
  } catch (error) {
    console.error('Ошибка обновления SIP аккаунта:', error)
    notifications.error('Ошибка обновления', error.response?.data?.detail || 'Не удалось обновить SIP аккаунт')
  } finally {
    saving.value = false
  }
}

const deleteEndpoint = async (endpoint) => {
  try {
    await ElMessageBox.confirm(
      `Удалить SIP аккаунт "${endpoint.username}"?`,
      'Подтверждение',
      {
        confirmButtonText: 'Удалить',
        cancelButtonText: 'Отмена',
        type: 'warning'
      }
    )
    await apiClient.delete(`/sip-endpoints/${endpoint.id}`)
    notifications.success('Успешно', 'SIP аккаунт удалён')
    await loadEndpoints()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Ошибка удаления SIP аккаунта:', error)
      notifications.error('Ошибка удаления', 'Не удалось удалить SIP аккаунт')
    }
  }
}

const showCredentials = async (endpoint) => {
  showCredentialsDialog.value = true
  loadingCredentials.value = true
  passwordVisible.value = false
  credentials.value = null
  try {
    const response = await apiClient.get(`/sip-endpoints/${endpoint.id}/credentials`)
    credentials.value = response.data
  } catch (error) {
    console.error('Ошибка загрузки учётных данных:', error)
    notifications.error('Ошибка загрузки', error.response?.data?.detail || 'Не удалось загрузить учётные данные')
    showCredentialsDialog.value = false
  } finally {
    loadingCredentials.value = false
  }
}

const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    notifications.success('Успешно', 'Скопировано')
  } catch {
    notifications.error('Ошибка', 'Не удалось скопировать')
  }
}

// Следим за открытием диалога создания для админа
watch(showCreateDialog, (newVal) => {
  if (newVal && isAdmin.value && !isRoot.value && asteriskServers.value.length > 0) {
    createForm.value.asterisk_server_id = asteriskServers.value[0].id
  }
})

onMounted(() => {
  loadEndpoints()
  loadAsteriskServers()
})

onActivated(() => {
  loadEndpoints()
})
</script>

<style scoped>
.sip-endpoints-view {
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

.endpoints-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.endpoint-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  transition: background-color 0.15s;
}

.endpoint-row:hover {
  background: var(--el-fill-color-light);
}

.endpoint-status {
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

.endpoint-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.endpoint-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.endpoint-name .name {
  font-weight: 600;
  font-size: 13px;
  color: var(--el-text-color-primary);
}

.endpoint-name .extension {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color);
  padding: 2px 6px;
  border-radius: 4px;
}

.endpoint-details {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 12px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.detail-label {
  color: var(--el-text-color-secondary);
}

.detail-value {
  color: var(--el-text-color-regular);
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  background: var(--el-fill-color-lighter);
  padding: 1px 6px;
  border-radius: 3px;
}

.endpoint-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.pagination {
  margin-top: 16px;
  justify-content: center;
}

/* Credentials dialog */
.credentials-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cred-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cred-label {
  min-width: 90px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.cred-value {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 4px;
}

.cred-value code {
  background: var(--el-fill-color-light);
  padding: 4px 8px;
  border-radius: 4px;
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 13px;
}

@media (max-width: 768px) {
  .sip-endpoints-view {
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

  .endpoint-row {
    flex-wrap: wrap;
    gap: 8px;
  }

  .endpoint-main {
    flex: 1 1 calc(100% - 30px);
  }

  .endpoint-details {
    flex-wrap: wrap;
    gap: 8px;
  }

  .endpoint-actions {
    flex: 1 1 100%;
    justify-content: flex-end;
  }
}
</style>