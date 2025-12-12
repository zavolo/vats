<template>
  <div class="companies-view">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>Управление компаниями</span>
          <el-space>
            <el-button type="primary" @click="loadCompanies" size="small">
              <el-icon><Refresh /></el-icon>
              Обновить
            </el-button>
            <el-button 
              type="success" 
              @click="showCreateDialog = true"
              size="small"
              v-if="permissionsStore.hasPermission('companies', 'create')"
            >
              <el-icon><Plus /></el-icon>
              Добавить
            </el-button>
          </el-space>
        </div>
      </template>

      <el-table
        :data="companies"
        v-loading="loading"
        style="width: 100%"
        stripe
        size="small"
      >
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="name" label="Название" width="150" show-overflow-tooltip />
        <el-table-column prop="legal_name" label="Юр. название" width="180" show-overflow-tooltip />
        <el-table-column prop="inn" label="ИНН" width="120" />
        <el-table-column prop="phone" label="Телефон" width="130" />
        <el-table-column prop="email" label="Email" width="160" show-overflow-tooltip />
        <el-table-column label="Статус" width="90">
          <template #default="{ row }">
            <el-tag :type="row.is_active ? 'success' : 'danger'" size="small">
              {{ row.is_active ? 'Акт.' : 'Неакт.' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Действия" width="200" fixed="right">
          <template #default="{ row }">
            <el-space :size="4">
              <el-button 
                size="small" 
                @click="openEditDialog(row)"
                v-if="permissionsStore.hasPermission('companies', 'update')"
              >
                Изменить
              </el-button>
              <el-button 
                size="small" 
                type="danger"
                @click="deleteCompany(row)"
                v-if="permissionsStore.hasPermission('companies', 'delete')"
              >
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
        @size-change="loadCompanies"
        @current-change="loadCompanies"
        style="margin-top: 16px; justify-content: center"
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

    <el-dialog v-model="showEditDialog" title="Редактировать компанию" width="700px">
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
          <el-input v-model="editForm.address" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="Активность">
          <el-switch v-model="editForm.is_active" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditDialog = false">Отмена</el-button>
        <el-button type="primary" @click="updateCompany" :loading="saving">Сохранить</el-button>
      </template>
    </el-dialog>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import { Refresh, Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import apiClient from '@/api/client'
import { usePermissionsStore } from '@/stores/permissions'

const permissionsStore = usePermissionsStore()

const companies = ref([])
const loading = ref(false)
const saving = ref(false)
const currentCompany = ref(null)

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

const editForm = ref({
  name: '',
  legal_name: '',
  inn: '',
  phone: '',
  email: '',
  address: '',
  is_active: true
})

const loadCompanies = async () => {
  try {
    loading.value = true
    const params = {
      skip: (pagination.value.page - 1) * pagination.value.limit,
      limit: pagination.value.limit
    }
    const response = await apiClient.get('/companies', { params })
    companies.value = response.data
    pagination.value.total = response.data.length
  } catch (error) {
    console.error('Ошибка загрузки компаний:', error)
    ElMessage.error('Не удалось загрузить компании')
  } finally {
    loading.value = false
  }
}

const createCompany = async () => {
  if (!createForm.value.name) {
    ElMessage.warning('Укажите название компании')
    return
  }
  try {
    saving.value = true
    await apiClient.post('/companies', createForm.value)
    ElMessage.success('Компания создана')
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
    ElMessage.error('Не удалось создать компанию')
  } finally {
    saving.value = false
  }
}

const openEditDialog = (company) => {
  currentCompany.value = company
  editForm.value = {
    name: company.name || '',
    legal_name: company.legal_name || '',
    inn: company.inn || '',
    phone: company.phone || '',
    email: company.email || '',
    address: company.address || '',
    is_active: company.is_active
  }
  showEditDialog.value = true
}

const updateCompany = async () => {
  try {
    saving.value = true
    await apiClient.put(`/companies/${currentCompany.value.id}`, editForm.value)
    ElMessage.success('Компания обновлена')
    showEditDialog.value = false
    await loadCompanies()
  } catch (error) {
    console.error('Ошибка обновления компании:', error)
    ElMessage.error('Не удалось обновить компанию')
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
    ElMessage.success('Компания удалена')
    await loadCompanies()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Ошибка удаления компании:', error)
      ElMessage.error('Не удалось удалить компанию')
    }
  }
}

onMounted(() => {
  loadCompanies()
})
</script>

<style scoped>
.companies-view {
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
  .companies-view {
    padding: 12px;
  }
}
</style>