<template>
  <div class="users-view">
    <el-card class="compact-card">
      <template #header>
        <div class="card-header">
          <span>Пользователи</span>
          <div class="header-actions">
            <el-button type="primary" @click="loadUsers" size="small" :loading="loading" :icon="Refresh" />
            <el-button type="success" @click="showCreateDialog = true" size="small" :icon="Plus" v-if="permissionsStore.hasPermission('users', 'create')">
              Добавить
            </el-button>
          </div>
        </div>
      </template>

      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="5" animated />
      </div>

      <div v-else-if="users.length === 0" class="empty-container">
        <el-empty description="Нет пользователей" :image-size="60" />
      </div>

      <div v-else class="users-list">
        <div v-for="(user, index) in users" :key="user.id" class="user-row">
          <div class="user-index">{{ getRowIndex(index) }}</div>

          <div class="user-avatar">
            <el-icon><User /></el-icon>
          </div>

          <div class="user-main">
            <div class="user-header">
              <span class="user-name">{{ user.username }}</span>
              <el-tag :type="user.is_active ? 'success' : 'danger'" size="small">
                {{ user.is_active ? 'Активен' : 'Неактивен' }}
              </el-tag>
            </div>
            <div class="user-details">
              <span class="detail-item" v-if="user.email">
                <span class="detail-value">{{ user.email }}</span>
              </span>
              <span class="detail-item" v-if="user.phone">
                <span class="detail-value">{{ user.phone }}</span>
              </span>
              <span class="detail-item" v-if="isRoot && user.company_id">
                <span class="detail-label">Компания:</span>
                <span class="detail-value">{{ getCompanyName(user.company_id) }}</span>
              </span>
              <span class="detail-item" v-if="user.tariff_id">
                <el-tag type="warning" size="small">{{ getTariffName(user.tariff_id) }}</el-tag>
              </span>
            </div>
          </div>

          <div class="user-balance">
            <span class="balance-value">{{ user.balance?.toFixed(2) || '0.00' }} ₽</span>
            <span class="balance-label">баланс</span>
          </div>

          <div class="user-actions">
            <el-button size="small" @click="openEditDialog(user)" v-if="permissionsStore.hasPermission('users', 'update')">
              Изменить
            </el-button>
            <el-dropdown @command="(cmd) => handleCommand(cmd, user)" trigger="click">
              <el-button size="small" :icon="MoreFilled" />
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="roles" v-if="permissionsStore.hasPermission('users', 'assign_role') || permissionsStore.hasPermission('users', 'remove_role')">
                    <el-icon><Operation /></el-icon> Роли
                  </el-dropdown-item>
                  <el-dropdown-item command="balance" v-if="permissionsStore.hasPermission('users', 'update_balance')">
                    <el-icon><Wallet /></el-icon> Баланс
                  </el-dropdown-item>
                  <el-dropdown-item command="login_as" v-if="permissionsStore.hasPermission('users', 'login_as')">
                    <el-icon><SwitchButton /></el-icon> Войти как
                  </el-dropdown-item>
                  <el-dropdown-item command="delete" divided v-if="permissionsStore.hasPermission('users', 'delete')">
                    <el-icon><Delete /></el-icon> Удалить
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </div>

      <el-pagination
        v-if="users.length > 0"
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.limit"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        @size-change="loadUsers"
        @current-change="loadUsers"
        class="pagination"
        small
      />
    </el-card>

    <el-dialog v-model="showCreateDialog" title="Добавить пользователя" width="500px">
      <el-form :model="createForm" label-width="120px" size="default">
        <el-form-item label="Имя" required>
          <el-input v-model="createForm.username" placeholder="username" />
        </el-form-item>
        <el-form-item label="Email" required>
          <el-input v-model="createForm.email" placeholder="user@example.com" />
        </el-form-item>
        <el-form-item label="Пароль" required>
          <el-input v-model="createForm.password" type="password" show-password />
        </el-form-item>
        <el-form-item label="Телефон">
          <el-input v-model="createForm.phone" placeholder="+7..." />
        </el-form-item>
        <el-form-item label="Компания" v-if="isRoot">
          <el-select v-model="createForm.company_id" placeholder="Выберите компанию" clearable style="width: 100%">
            <el-option
              v-for="company in companies"
              :key="company.id"
              :label="company.name"
              :value="company.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="Тариф">
          <el-select v-model="createForm.tariff_id" placeholder="Выберите тариф" clearable style="width: 100%">
            <el-option
              v-for="tariff in tariffs"
              :key="tariff.id"
              :label="tariff.name"
              :value="tariff.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">Отмена</el-button>
        <el-button type="primary" @click="createUser" :loading="saving">Создать</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showEditDialog" title="Редактировать пользователя" width="500px">
      <el-form :model="editForm" label-width="120px" size="default">
        <el-form-item label="Email">
          <el-input v-model="editForm.email" />
        </el-form-item>
        <el-form-item label="Телефон">
          <el-input v-model="editForm.phone" />
        </el-form-item>
        <el-form-item label="Компания" v-if="isRoot">
          <el-select v-model="editForm.company_id" placeholder="Выберите компанию" clearable style="width: 100%">
            <el-option
              v-for="company in companies"
              :key="company.id"
              :label="company.name"
              :value="company.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="Тариф">
          <el-select v-model="editForm.tariff_id" placeholder="Выберите тариф" clearable style="width: 100%">
            <el-option
              v-for="tariff in tariffs"
              :key="tariff.id"
              :label="tariff.name"
              :value="tariff.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="Активность">
          <el-switch v-model="editForm.is_active" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditDialog = false">Отмена</el-button>
        <el-button type="primary" @click="updateUser" :loading="saving">Сохранить</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showBalanceDialog" title="Изменить баланс" width="400px">
      <el-form :model="balanceForm" label-width="100px" size="default">
        <el-form-item label="Сумма">
          <el-input-number v-model="balanceForm.amount" :precision="2" :step="10" style="width: 100%" />
        </el-form-item>
        <el-alert :title="`Текущий баланс: ${currentUser?.balance?.toFixed(2) || '0.00'} ₽`" type="info" :closable="false" />
      </el-form>
      <template #footer>
        <el-button @click="showBalanceDialog = false">Отмена</el-button>
        <el-button type="primary" @click="updateBalance" :loading="saving">Изменить</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showRolesDialog" title="Управление ролями" width="500px">
      <div class="roles-section">
        <div class="section-title">Текущие роли:</div>
        <div v-if="currentUserRoles.length === 0" class="no-roles">
          <el-empty description="Роли не назначены" :image-size="60" />
        </div>
        <div v-else class="roles-list">
          <el-tag
            v-for="role in currentUserRoles"
            :key="role.id"
            closable
            :disable-transitions="false"
            @close="removeUserRole(role.id)"
            type="success"
            size="large"
            style="margin: 4px"
          >
            {{ role.name }}
          </el-tag>
        </div>
      </div>

      <el-divider />

      <div class="roles-section">
        <div class="section-title">Добавить роль:</div>
        <el-select
          v-model="selectedRoleToAdd"
          placeholder="Выберите роль"
          clearable
          style="width: 100%"
          size="default"
        >
          <el-option
            v-for="role in availableRolesToAdd"
            :key="role.id"
            :label="`${role.name}${role.description ? ' - ' + role.description : ''}`"
            :value="role.id"
          />
        </el-select>
      </div>

      <template #footer>
        <el-button @click="showRolesDialog = false">Закрыть</el-button>
        <el-button
          type="primary"
          @click="addUserRole"
          :loading="saving"
          :disabled="!selectedRoleToAdd"
        >
          Добавить роль
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onActivated } from 'vue'
import { Refresh, Plus, MoreFilled, User, Wallet, SwitchButton, Delete, Operation } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import { useNotifications } from '@/composables/useNotifications'
import apiClient from '@/api/client'
import { usePermissionsStore } from '@/stores/permissions'
import { useAuthStore } from '@/stores/auth'

const permissionsStore = usePermissionsStore()
const authStore = useAuthStore()
const notifications = useNotifications()

const isRoot = computed(() => permissionsStore.isRoot)

const users = ref([])
const companies = ref([])
const tariffs = ref([])
const roles = ref([])
const currentUserRoles = ref([])
const loading = ref(false)
const saving = ref(false)
const currentUser = ref(null)
const selectedRoleToAdd = ref(null)
const pagination = ref({ page: 1, limit: 20, total: 0 })

const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const showBalanceDialog = ref(false)
const showRolesDialog = ref(false)

const createForm = ref({ username: '', email: '', password: '', phone: '', company_id: null, tariff_id: null })
const editForm = ref({ email: '', phone: '', is_active: true, company_id: null, tariff_id: null })
const balanceForm = ref({ amount: 0 })

const getCompanyName = (companyId) => {
  if (!companyId) return '-'
  const company = companies.value.find(c => c.id === companyId)
  return company ? company.name : '-'
}

const getTariffName = (tariffId) => {
  if (!tariffId) return '-'
  const tariff = tariffs.value.find(t => t.id === tariffId)
  return tariff ? tariff.name : '-'
}

const loadCompanies = async () => {
  if (!isRoot.value) return
  try {
    const response = await apiClient.get('/companies', { params: { _t: Date.now() } })
    companies.value = response.data
  } catch (error) {
    console.error('Ошибка загрузки компаний:', error)
  }
}

const loadTariffs = async () => {
  try {
    const response = await apiClient.get('/tariffs', { params: { _t: Date.now() } })
    tariffs.value = response.data
  } catch (error) {
    console.error('Ошибка загрузки тарифов:', error)
  }
}

const loadRoles = async () => {
  try {
    const response = await apiClient.get('/users/roles/available', { params: { _t: Date.now() } })
    roles.value = response.data
  } catch (error) {
    console.error('Ошибка загрузки ролей:', error)
  }
}

const loadUserRoles = async (userId) => {
  try {
    const response = await apiClient.get(`/users/${userId}/permissions`, { params: { _t: Date.now() } })
    currentUserRoles.value = response.data.roles || []
  } catch (error) {
    console.error('Ошибка загрузки ролей пользователя:', error)
    notifications.error('Ошибка', 'Не удалось загрузить роли пользователя')
  }
}

const availableRolesToAdd = computed(() => {
  const currentRoleIds = currentUserRoles.value.map(r => r.id)
  return roles.value.filter(r => !currentRoleIds.includes(r.id))
})

const getRowIndex = (index) => {
  return (pagination.value.page - 1) * pagination.value.limit + index + 1
}

const loadUsers = async () => {
  try {
    loading.value = true
    const params = {
      skip: (pagination.value.page - 1) * pagination.value.limit,
      limit: pagination.value.limit,
      sort_by: 'id',
      sort_order: 'asc',
      _t: Date.now()
    }
    const response = await apiClient.get('/users', {
      params,
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
    users.value = response.data.sort((a, b) => a.id - b.id)
    pagination.value.total = response.data.length
  } catch (error) {
    console.error('Ошибка загрузки пользователей:', error)
    notifications.error('Ошибка загрузки', 'Не удалось загрузить пользователей')
  } finally {
    loading.value = false
  }
}

const createUser = async () => {
  if (!createForm.value.username || !createForm.value.email || !createForm.value.password) {
    notifications.warning('Предупреждение', 'Заполните обязательные поля')
    return
  }
  try {
    saving.value = true
    await apiClient.post('/users', createForm.value)
    notifications.success('Успешно', 'Пользователь создан')
    showCreateDialog.value = false
    createForm.value = { username: '', email: '', password: '', phone: '', company_id: null, tariff_id: null }
    await loadUsers()
  } catch (error) {
    console.error('Ошибка создания пользователя:', error)
    notifications.error('Ошибка создания', error.response?.data?.detail || 'Не удалось создать пользователя')
  } finally {
    saving.value = false
  }
}

const openEditDialog = (user) => {
  currentUser.value = user
  editForm.value = {
    email: user.email || '',
    phone: user.phone || '',
    is_active: user.is_active,
    company_id: user.company_id || null,
    tariff_id: user.tariff_id || null
  }
  showEditDialog.value = true
}

const updateUser = async () => {
  try {
    saving.value = true
    await apiClient.put(`/users/${currentUser.value.id}`, editForm.value)
    notifications.success('Успешно', 'Пользователь обновлен')
    showEditDialog.value = false
    await loadUsers()
  } catch (error) {
    console.error('Ошибка обновления пользователя:', error)
    notifications.error('Ошибка обновления', 'Не удалось обновить пользователя')
  } finally {
    saving.value = false
  }
}

const handleCommand = async (command, user) => {
  currentUser.value = user
  switch (command) {
    case 'roles':
      await openRolesDialog(user)
      break
    case 'balance':
      balanceForm.value = { amount: 0 }
      showBalanceDialog.value = true
      break
    case 'login_as':
      await loginAsUser(user)
      break
    case 'delete':
      await deleteUser(user)
      break
  }
}

const openRolesDialog = async (user) => {
  currentUser.value = user
  selectedRoleToAdd.value = null
  await loadUserRoles(user.id)
  showRolesDialog.value = true
}

const addUserRole = async () => {
  if (!selectedRoleToAdd.value) return

  try {
    saving.value = true
    await apiClient.post(`/users/${currentUser.value.id}/roles/${selectedRoleToAdd.value}`)
    notifications.success('Успешно', 'Роль добавлена')
    selectedRoleToAdd.value = null
    await loadUserRoles(currentUser.value.id)
  } catch (error) {
    console.error('Ошибка добавления роли:', error)
    notifications.error('Ошибка', error.response?.data?.detail || 'Не удалось добавить роль')
  } finally {
    saving.value = false
  }
}

const removeUserRole = async (roleId) => {
  try {
    await ElMessageBox.confirm('Удалить эту роль у пользователя?', 'Подтверждение', {
      confirmButtonText: 'Удалить',
      cancelButtonText: 'Отмена',
      type: 'warning'
    })

    saving.value = true
    await apiClient.delete(`/users/${currentUser.value.id}/roles/${roleId}`)
    notifications.success('Успешно', 'Роль удалена')
    await loadUserRoles(currentUser.value.id)
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Ошибка удаления роли:', error)
      notifications.error('Ошибка', 'Не удалось удалить роль')
    }
  } finally {
    saving.value = false
  }
}

const updateBalance = async () => {
  try {
    saving.value = true
    await apiClient.post(`/users/${currentUser.value.id}/balance`, balanceForm.value)
    notifications.success('Успешно', 'Баланс изменен')
    showBalanceDialog.value = false
    await loadUsers()
  } catch (error) {
    console.error('Ошибка изменения баланса:', error)
    notifications.error('Ошибка', 'Не удалось изменить баланс')
  } finally {
    saving.value = false
  }
}

const loginAsUser = async (user) => {
  try {
    await ElMessageBox.confirm(`Войти от имени пользователя "${user.username}"?`, 'Подтверждение', {
      confirmButtonText: 'Войти',
      cancelButtonText: 'Отмена',
      type: 'warning'
    })
    await authStore.loginAs(user.id)
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Ошибка входа:', error)
      notifications.error('Ошибка входа', 'Не удалось войти от имени пользователя')
    }
  }
}

const deleteUser = async (user) => {
  try {
    await ElMessageBox.confirm(`Удалить пользователя "${user.username}"?`, 'Подтверждение', {
      confirmButtonText: 'Удалить',
      cancelButtonText: 'Отмена',
      type: 'warning'
    })
    await apiClient.delete(`/users/${user.id}`)
    notifications.success('Успешно', 'Пользователь удален')
    await loadUsers()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Ошибка удаления пользователя:', error)
      notifications.error('Ошибка удаления', 'Не удалось удалить пользователя')
    }
  }
}

onMounted(() => {
  loadUsers()
  loadCompanies()
  loadTariffs()
  loadRoles()
})

onActivated(() => {
  loadUsers()
  loadCompanies()
  loadTariffs()
  loadRoles()
})
</script>

<style scoped>
.users-view {
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

.users-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.user-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  transition: background-color 0.15s;
}

.user-row:hover {
  background: var(--el-fill-color-light);
}

.user-index {
  width: 24px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  text-align: center;
  flex-shrink: 0;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: var(--el-color-primary-light-8);
  color: var(--el-color-primary);
}

.user-avatar .el-icon {
  font-size: 18px;
}

.user-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.user-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-name {
  font-weight: 600;
  font-size: 13px;
  color: var(--el-text-color-primary);
}

.user-details {
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
}

.user-balance {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  min-width: 80px;
}

.balance-value {
  font-weight: 600;
  font-size: 14px;
  color: var(--el-color-success);
}

.balance-label {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.user-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.pagination {
  margin-top: 16px;
  justify-content: center;
}

@media (max-width: 768px) {
  .users-view {
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

  .user-row {
    flex-wrap: wrap;
    gap: 8px;
  }

  .user-index {
    display: none;
  }

  .user-main {
    flex: 1 1 calc(100% - 60px);
  }

  .user-details {
    flex-wrap: wrap;
    gap: 8px;
  }

  .user-balance {
    flex-direction: row;
    gap: 4px;
    min-width: auto;
  }

  .user-actions {
    flex: 1 1 100%;
    justify-content: flex-end;
  }
}

.roles-section {
  margin-bottom: 16px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--el-text-color-primary);
}

.no-roles {
  padding: 20px 0;
}

.roles-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
</style>