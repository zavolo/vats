<template>
  <div class="users-view">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>Управление пользователями</span>
          <el-space>
            <el-button type="primary" @click="loadUsers" size="small">
              <el-icon><Refresh /></el-icon>
              Обновить
            </el-button>
            <el-button type="success" @click="showCreateDialog = true" size="small" v-if="permissionsStore.hasPermission('users', 'create')">
              <el-icon><Plus /></el-icon>
              Добавить
            </el-button>
          </el-space>
        </div>
      </template>

      <el-table :data="users" v-loading="loading" style="width: 100%" stripe size="small">
        <el-table-column type="index" label="#" width="60" :index="getIndex" />
        <el-table-column prop="username" label="Имя" width="130" />
        <el-table-column prop="email" label="Email" min-width="180" show-overflow-tooltip />
        <el-table-column prop="phone" label="Телефон" width="130" />
        <el-table-column label="Баланс" width="100">
          <template #default="{ row }">
            {{ row.balance?.toFixed(2) || '0.00' }} ₽
          </template>
        </el-table-column>
        <el-table-column label="Статус" width="90">
          <template #default="{ row }">
            <el-tag :type="row.is_active ? 'success' : 'danger'" size="small">
              {{ row.is_active ? 'Активен' : 'Неакт.' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Действия" width="180" fixed="right">
          <template #default="{ row }">
            <el-space :size="4">
              <el-button size="small" @click="openEditDialog(row)" v-if="permissionsStore.hasPermission('users', 'update')">
                Изменить
              </el-button>
              <el-dropdown @command="(cmd) => handleCommand(cmd, row)" trigger="click">
                <el-button size="small">
                  <el-icon><MoreFilled /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="balance" v-if="permissionsStore.hasPermission('users', 'update_balance')">
                      Баланс
                    </el-dropdown-item>
                    <el-dropdown-item command="login_as" v-if="permissionsStore.hasPermission('users', 'login_as')">
                      Войти как
                    </el-dropdown-item>
                    <el-dropdown-item command="delete" divided v-if="permissionsStore.hasPermission('users', 'delete')">
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
        @size-change="loadUsers"
        @current-change="loadUsers"
        style="margin-top: 16px; justify-content: center"
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
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">Отмена</el-button>
        <el-button type="primary" @click="createUser" :loading="saving">Создать</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showEditDialog" title="Редактировать" width="500px">
      <el-form :model="editForm" label-width="120px" size="default">
        <el-form-item label="Email">
          <el-input v-model="editForm.email" />
        </el-form-item>
        <el-form-item label="Телефон">
          <el-input v-model="editForm.phone" />
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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Refresh, Plus, MoreFilled } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import apiClient from '@/api/client'
import { usePermissionsStore } from '@/stores/permissions'
import { useAuthStore } from '@/stores/auth'

const permissionsStore = usePermissionsStore()
const authStore = useAuthStore()

const users = ref([])
const loading = ref(false)
const saving = ref(false)
const currentUser = ref(null)
const pagination = ref({ page: 1, limit: 20, total: 0 })

const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const showBalanceDialog = ref(false)

const createForm = ref({ username: '', email: '', password: '', phone: '' })
const editForm = ref({ email: '', phone: '', is_active: true })
const balanceForm = ref({ amount: 0 })

const getIndex = (index) => {
  return (pagination.value.page - 1) * pagination.value.limit + index + 1
}

const loadUsers = async () => {
  try {
    loading.value = true
    const params = { skip: (pagination.value.page - 1) * pagination.value.limit, limit: pagination.value.limit }
    const response = await apiClient.get('/users', { params })
    users.value = response.data
    pagination.value.total = response.data.length
  } catch (error) {
    console.error('Ошибка загрузки пользователей:', error)
    ElMessage.error('Не удалось загрузить пользователей')
  } finally {
    loading.value = false
  }
}

const createUser = async () => {
  if (!createForm.value.username || !createForm.value.email || !createForm.value.password) {
    ElMessage.warning('Заполните обязательные поля')
    return
  }
  try {
    saving.value = true
    await apiClient.post('/users', createForm.value)
    ElMessage.success('Пользователь создан')
    showCreateDialog.value = false
    loadUsers()
    createForm.value = { username: '', email: '', password: '', phone: '' }
  } catch (error) {
    console.error('Ошибка создания пользователя:', error)
    ElMessage.error(error.response?.data?.detail || 'Не удалось создать пользователя')
  } finally {
    saving.value = false
  }
}

const openEditDialog = (user) => {
  currentUser.value = user
  editForm.value = { email: user.email || '', phone: user.phone || '', is_active: user.is_active }
  showEditDialog.value = true
}

const updateUser = async () => {
  try {
    saving.value = true
    await apiClient.put(`/users/${currentUser.value.id}`, editForm.value)
    ElMessage.success('Пользователь обновлен')
    showEditDialog.value = false
    loadUsers()
  } catch (error) {
    console.error('Ошибка обновления пользователя:', error)
    ElMessage.error('Не удалось обновить пользователя')
  } finally {
    saving.value = false
  }
}

const handleCommand = async (command, user) => {
  currentUser.value = user
  switch (command) {
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

const updateBalance = async () => {
  try {
    saving.value = true
    await apiClient.post(`/users/${currentUser.value.id}/balance`, balanceForm.value)
    ElMessage.success('Баланс изменен')
    showBalanceDialog.value = false
    loadUsers()
  } catch (error) {
    console.error('Ошибка изменения баланса:', error)
    ElMessage.error('Не удалось изменить баланс')
  } finally {
    saving.value = false
  }
}

const loginAsUser = async (user) => {
  try {
    await ElMessageBox.confirm(`Вы уверены, что хотите войти от имени пользователя "${user.username}"?`, 'Подтверждение', {
      confirmButtonText: 'Войти',
      cancelButtonText: 'Отмена',
      type: 'warning'
    })
    const response = await apiClient.post(`/users/${user.id}/login-as`)
    localStorage.setItem('token', response.data.access_token)
    authStore.token = response.data.access_token
    await authStore.fetchUser()
    ElMessage.success(`Вы вошли как ${user.username}`)
    location.reload()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Ошибка входа:', error)
      ElMessage.error('Не удалось войти от имени пользователя')
    }
  }
}

const deleteUser = async (user) => {
  try {
    await ElMessageBox.confirm(`Вы уверены, что хотите удалить пользователя "${user.username}"?`, 'Подтверждение', {
      confirmButtonText: 'Удалить',
      cancelButtonText: 'Отмена',
      type: 'warning'
    })
    await apiClient.delete(`/users/${user.id}`)
    ElMessage.success('Пользователь удален')
    loadUsers()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Ошибка удаления пользователя:', error)
      ElMessage.error('Не удалось удалить пользователя')
    }
  }
}

onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
.users-view {
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
  .users-view {
    padding: 12px;
  }
}
</style>