<template>
  <div class="companies-view">
    <el-card class="compact-card">
      <template #header>
        <div class="card-header">
          <span>Управление компаниями</span>
          <div class="header-actions">
            <el-button type="primary" @click="loadCompanies" size="small" :loading="loading" :icon="Refresh" />
            <el-button
              type="success"
              @click="showCreateDialog = true"
              size="small"
              :icon="Plus"
              v-if="permissionsStore.hasPermission('companies', 'create')"
            >
              Добавить
            </el-button>
          </div>
        </div>
      </template>

      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="5" animated />
      </div>

      <div v-else-if="companies.length === 0" class="empty-container">
        <el-empty description="Нет компаний" :image-size="60" />
      </div>

      <div v-else class="companies-list">
        <div
          v-for="(company, index) in companies"
          :key="company.id"
          class="company-row"
        >
          <div class="company-index">#{{ company.id }}</div>

          <div class="company-status">
            <div class="status-indicator" :class="{ active: company.is_active }"></div>
          </div>

          <div class="company-avatar">
            <el-icon><OfficeBuilding /></el-icon>
          </div>

          <div class="company-main">
            <div class="company-header">
              <span class="company-name">{{ company.name }}</span>
              <el-tag :type="company.is_active ? 'success' : 'danger'" size="small">
                {{ company.is_active ? 'Активна' : 'Неактивна' }}
              </el-tag>
            </div>
            <div class="company-details">
              <span class="detail-item" v-if="company.legal_name">
                <span class="detail-label">Юр. название:</span>
                <span class="detail-value">{{ company.legal_name }}</span>
              </span>
              <span class="detail-item" v-if="company.inn">
                <span class="detail-label">ИНН:</span>
                <span class="detail-value code">{{ company.inn }}</span>
              </span>
              <span class="detail-item" v-if="company.phone">
                <span class="detail-label">Тел:</span>
                <span class="detail-value">{{ company.phone }}</span>
              </span>
              <span class="detail-item" v-if="company.email">
                <span class="detail-label">Email:</span>
                <span class="detail-value">{{ company.email }}</span>
              </span>
            </div>
          </div>

          <div class="company-actions">
            <el-dropdown trigger="click" @command="(cmd) => handleCommand(cmd, company)">
              <el-button size="small" :icon="MoreFilled" />
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item
                    command="edit"
                    v-if="permissionsStore.hasPermission('companies', 'update')"
                  >
                    <el-icon><Edit /></el-icon>
                    Изменить
                  </el-dropdown-item>
                  <el-dropdown-item
                    command="delete"
                    divided
                    v-if="permissionsStore.hasPermission('companies', 'delete')"
                  >
                    <el-icon><Delete /></el-icon>
                    Удалить
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </div>

      <el-pagination
        v-if="companies.length > 0"
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.limit"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        @size-change="loadCompanies"
        @current-change="loadCompanies"
        class="pagination"
        small
      />
    </el-card>

    <el-dialog v-model="showCreateDialog" title="Добавить компанию" width="700px">
      <el-form :model="createForm" label-width="180px" size="default">
        <el-form-item label="Название" required>
          <el-input v-model="createForm.name" />
        </el-form-item>
        <el-form-item label="Юридическое название">
          <el-input v-model="createForm.legal_name" />
        </el-form-item>
        <el-form-item label="ИНН">
          <el-input v-model="createForm.inn" />
        </el-form-item>
        <el-form-item label="Телефон">
          <el-input v-model="createForm.phone" placeholder="+7..." />
        </el-form-item>
        <el-form-item label="Email">
          <el-input v-model="createForm.email" />
        </el-form-item>
        <el-form-item label="Адрес">
          <el-input v-model="createForm.address" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">Отмена</el-button>
        <el-button type="primary" @click="createCompany" :loading="saving">Создать</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showEditDialog" title="Редактировать компанию" width="750px">
      <el-tabs v-model="editActiveTab">
        <el-tab-pane label="Основные" name="main">
          <el-form :model="editForm" label-width="180px" size="default">
            <el-form-item label="Название">
              <el-input v-model="editForm.name" />
            </el-form-item>
            <el-form-item label="Юридическое название">
              <el-input v-model="editForm.legal_name" />
            </el-form-item>
            <el-form-item label="ИНН">
              <el-input v-model="editForm.inn" />
            </el-form-item>
            <el-form-item label="Телефон">
              <el-input v-model="editForm.phone" />
            </el-form-item>
            <el-form-item label="Email">
              <el-input v-model="editForm.email" />
            </el-form-item>
            <el-form-item label="Адрес">
              <el-input v-model="editForm.address" type="textarea" :rows="2" />
            </el-form-item>
            <el-form-item label="Активность">
              <el-switch v-model="editForm.is_active" />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="Входящие звонки" name="incoming">
          <el-form :model="editForm.settings" label-width="180px" size="default">
            <el-form-item label="Действие при звонке">
              <el-select v-model="editForm.settings.action_type" placeholder="Выберите действие" style="width: 100%">
                <el-option label="Переадресация на SIP" value="forward" />
                <el-option label="IVR меню" value="ivr" />
                <el-option label="Очередь" value="queue" />
              </el-select>
            </el-form-item>

            <el-form-item label="Переадресация на" v-if="editForm.settings.action_type === 'forward'">
              <el-select
                v-model="editForm.settings.forward_to"
                placeholder="Выберите SIP"
                style="width: 100%"
                filterable
              >
                <el-option
                  v-for="sip in companySipEndpoints"
                  :key="sip.id"
                  :label="`${sip.extension} - ${sip.display_name || sip.username}`"
                  :value="`PJSIP/${sip.username}`"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="IVR меню" v-if="editForm.settings.action_type === 'ivr'">
              <el-select v-model="editForm.settings.ivr_id" placeholder="Выберите IVR" style="width: 100%">
                <el-option
                  v-for="ivr in companyIvrMenus"
                  :key="ivr.id"
                  :label="ivr.name"
                  :value="ivr.id"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="Очередь" v-if="editForm.settings.action_type === 'queue'">
              <el-select v-model="editForm.settings.queue_id" placeholder="Выберите очередь" style="width: 100%">
                <el-option
                  v-for="queue in companyQueues"
                  :key="queue.id"
                  :label="queue.name"
                  :value="queue.id"
                />
              </el-select>
            </el-form-item>

            <el-divider />

            <el-form-item label="Запись звонков">
              <el-switch v-model="editForm.settings.record_calls" />
            </el-form-item>

            <el-form-item label="Мелодия ожидания">
              <el-select
                v-model="editForm.settings.custom_melody"
                placeholder="Стандартная мелодия"
                style="width: 100%"
                clearable
                :loading="loadingMelodies"
              >
                <el-option
                  v-for="melody in melodies"
                  :key="melody.filename"
                  :label="melody.name"
                  :value="melody.filename"
                />
              </el-select>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
      <template #footer>
        <el-button @click="showEditDialog = false">Отмена</el-button>
        <el-button type="primary" @click="updateCompany" :loading="saving">Сохранить</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, onActivated } from 'vue'
import { Refresh, Plus, OfficeBuilding, MoreFilled, Edit, Delete } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import { useNotifications } from '@/composables/useNotifications'
import apiClient from '@/api/client'
import { usePermissionsStore } from '@/stores/permissions'

const permissionsStore = usePermissionsStore()
const notifications = useNotifications()

const companies = ref([])
const loading = ref(false)
const saving = ref(false)
const currentCompany = ref(null)
const editActiveTab = ref('main')
const companySipEndpoints = ref([])
const companyIvrMenus = ref([])
const companyQueues = ref([])
const melodies = ref([])
const loadingMelodies = ref(false)

const pagination = ref({
  page: 1,
  limit: 20,
  total: 0
})

const showCreateDialog = ref(false)
const showEditDialog = ref(false)

const createForm = ref({
  name: '',
  legal_name: '',
  inn: '',
  phone: '',
  email: '',
  address: ''
})

const defaultSettings = {
  action_type: 'forward',
  forward_to: '',
  ivr_id: null,
  queue_id: null,
  record_calls: false,
  custom_melody: ''
}

const editForm = ref({
  name: '',
  legal_name: '',
  inn: '',
  phone: '',
  email: '',
  address: '',
  is_active: true,
  settings: { ...defaultSettings }
})

const handleCommand = (command, company) => {
  switch (command) {
    case 'edit':
      openEditDialog(company)
      break
    case 'delete':
      deleteCompany(company)
      break
  }
}

const loadCompanies = async () => {
  try {
    loading.value = true
    const params = {
      skip: (pagination.value.page - 1) * pagination.value.limit,
      limit: pagination.value.limit,
      _t: Date.now()
    }
    const response = await apiClient.get('/companies', {
      params,
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
    companies.value = response.data
    pagination.value.total = response.data.length
  } catch (error) {
    console.error('Ошибка загрузки компаний:', error)
    notifications.error('Ошибка загрузки', 'Не удалось загрузить компании')
  } finally {
    loading.value = false
  }
}

const createCompany = async () => {
  if (!createForm.value.name) {
    notifications.warning('Предупреждение', 'Укажите название компании')
    return
  }
  try {
    saving.value = true
    await apiClient.post('/companies', createForm.value)
    notifications.success('Успешно', 'Компания создана')
    showCreateDialog.value = false
    createForm.value = {
      name: '',
      legal_name: '',
      inn: '',
      phone: '',
      email: '',
      address: ''
    }
    await loadCompanies()
  } catch (error) {
    console.error('Ошибка создания компании:', error)
    notifications.error('Ошибка создания', 'Не удалось создать компанию')
  } finally {
    saving.value = false
  }
}

const loadCompanyData = async (companyId) => {
  try {
    const sipResponse = await apiClient.get('/sip-endpoints', {
      params: { company_id: companyId }
    })
    companySipEndpoints.value = sipResponse.data || []

    try {
      const ivrResponse = await apiClient.get('/ivr/menus', {
        params: { company_id: companyId }
      })
      companyIvrMenus.value = ivrResponse.data || []
    } catch {
      companyIvrMenus.value = []
    }

    try {
      const queuesResponse = await apiClient.get('/ivr/queues', {
        params: { company_id: companyId }
      })
      companyQueues.value = queuesResponse.data || []
    } catch {
      companyQueues.value = []
    }
  } catch (error) {
    console.error('Ошибка загрузки данных компании:', error)
  }
}

const loadMelodies = async () => {
  try {
    loadingMelodies.value = true
    const response = await apiClient.get('/calls/melodies')
    melodies.value = response.data
  } catch (error) {
    console.error('Ошибка загрузки мелодий:', error)
  } finally {
    loadingMelodies.value = false
  }
}

const openEditDialog = async (company) => {
  currentCompany.value = company
  editActiveTab.value = 'main'

  const settings = company.settings || {}
  editForm.value = {
    name: company.name || '',
    legal_name: company.legal_name || '',
    inn: company.inn || '',
    phone: company.phone || '',
    email: company.email || '',
    address: company.address || '',
    is_active: company.is_active,
    settings: {
      action_type: settings.action_type || 'forward',
      forward_to: settings.forward_to || '',
      ivr_id: settings.ivr_id || null,
      queue_id: settings.queue_id || null,
      record_calls: settings.record_calls || false,
      custom_melody: settings.custom_melody || ''
    }
  }

  showEditDialog.value = true
  await Promise.all([
    loadCompanyData(company.id),
    loadMelodies()
  ])
}

const updateCompany = async () => {
  try {
    saving.value = true
    const payload = {
      name: editForm.value.name,
      legal_name: editForm.value.legal_name,
      inn: editForm.value.inn,
      phone: editForm.value.phone,
      email: editForm.value.email,
      address: editForm.value.address,
      is_active: editForm.value.is_active,
      settings: editForm.value.settings
    }
    await apiClient.put(`/companies/${currentCompany.value.id}`, payload)
    notifications.success('Успешно', 'Компания обновлена')
    showEditDialog.value = false
    await loadCompanies()
  } catch (error) {
    console.error('Ошибка обновления компании:', error)
    notifications.error('Ошибка обновления', 'Не удалось обновить компанию')
  } finally {
    saving.value = false
  }
}

const deleteCompany = async (company) => {
  try {
    await ElMessageBox.confirm(
      `Вы уверены, что хотите удалить компанию "${company.name}"?`,
      'Подтверждение',
      {
        confirmButtonText: 'Удалить',
        cancelButtonText: 'Отмена',
        type: 'warning'
      }
    )
    await apiClient.delete(`/companies/${company.id}`)
    notifications.success('Успешно', 'Компания удалена')
    await loadCompanies()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Ошибка удаления компании:', error)
      notifications.error('Ошибка удаления', 'Не удалось удалить компанию')
    }
  }
}

onMounted(() => {
  loadCompanies()
})

onActivated(() => {
  loadCompanies()
})
</script>

<style scoped>
.companies-view {
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

.companies-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.company-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  transition: background-color 0.15s;
}

.company-row:hover {
  background: var(--el-fill-color-light);
}

.company-index {
  min-width: 32px;
  text-align: center;
  font-size: 11px;
  color: var(--el-text-color-placeholder);
  font-family: 'SF Mono', Monaco, 'Courier New', monospace;
  flex-shrink: 0;
}

.company-status {
  flex-shrink: 0;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--el-color-danger);
}

.status-indicator.active {
  background: var(--el-color-success);
  box-shadow: 0 0 6px var(--el-color-success);
}

.company-avatar {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  background: var(--el-color-primary-light-8);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.company-avatar .el-icon {
  font-size: 18px;
  color: var(--el-color-primary);
}

.company-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.company-header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.company-name {
  font-weight: 600;
  font-size: 13px;
  color: var(--el-text-color-primary);
}

.company-details {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
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
}

.detail-value.code {
  font-family: 'SF Mono', Monaco, 'Courier New', monospace;
  background: var(--el-fill-color-light);
  padding: 1px 4px;
  border-radius: 3px;
}

.company-actions {
  flex-shrink: 0;
}

.pagination {
  margin-top: 16px;
  justify-content: center;
}

@media (max-width: 768px) {
  .companies-view {
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

  .company-row {
    flex-wrap: wrap;
    gap: 8px;
  }

  .company-main {
    flex: 1 1 calc(100% - 120px);
  }

  .company-actions {
    flex: 0 0 auto;
  }
}
</style>