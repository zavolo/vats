<template>
  <div class="tariffs-view">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>Тарифные планы</span>
          <el-button 
            type="success" 
            @click="showCreateDialog = true"
            v-if="permissionsStore.hasPermission('tariffs', 'create')"
          >
            <el-icon><Plus /></el-icon>
            Добавить тариф
          </el-button>
        </div>
      </template>

      <el-row :gutter="20" v-loading="loading">
        <el-col 
          :xs="24" 
          :sm="12" 
          :md="8" 
          v-for="tariff in tariffs" 
          :key="tariff.id"
          style="margin-bottom: 20px"
        >
          <el-card class="tariff-card" :class="{ 'tariff-inactive': !tariff.is_active }">
            <div class="tariff-header">
              <h3>{{ tariff.name }}</h3>
              <el-tag :type="tariff.is_active ? 'success' : 'info'" size="small">
                {{ tariff.is_active ? 'Активен' : 'Неактивен' }}
              </el-tag>
            </div>
            <p class="tariff-description">{{ tariff.description || 'Описание отсутствует' }}</p>
            <el-divider />
            <div class="tariff-price">
              <span class="price-value">{{ tariff.monthly_fee?.toFixed(2) || '0.00' }} ₽</span>
              <span class="price-period">/месяц</span>
            </div>
            <el-divider />
            <div class="tariff-features">
              <div class="feature-item">
                <el-icon color="#67c23a"><CircleCheck /></el-icon>
                <span>{{ tariff.included_users }} пользователей</span>
              </div>
              <div class="feature-item">
                <el-icon color="#67c23a"><CircleCheck /></el-icon>
                <span>{{ tariff.included_numbers }} номеров</span>
              </div>
              <div class="feature-item" v-if="tariff.features?.recording">
                <el-icon color="#67c23a"><CircleCheck /></el-icon>
                <span>Запись звонков</span>
              </div>
              <div class="feature-item" v-if="tariff.features?.ivr">
                <el-icon color="#67c23a"><CircleCheck /></el-icon>
                <span>Голосовое меню (IVR)</span>
              </div>
              <div class="feature-item" v-if="tariff.features?.sms">
                <el-icon color="#67c23a"><CircleCheck /></el-icon>
                <span>SMS уведомления</span>
              </div>
            </div>
            <el-divider />
            <div class="tariff-actions">
              <el-button 
                type="primary" 
                size="small"
                @click="selectTariff(tariff)"
                :disabled="!tariff.is_active"
              >
                Выбрать
              </el-button>
              <el-dropdown 
                @command="(cmd) => handleCommand(cmd, tariff)"
                v-if="permissionsStore.hasPermission('tariffs', 'update') || 
                      permissionsStore.hasPermission('tariffs', 'delete')"
              >
                <el-button size="small">
                  <el-icon><MoreFilled /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item 
                      command="edit"
                      v-if="permissionsStore.hasPermission('tariffs', 'update')"
                    >
                      Редактировать
                    </el-dropdown-item>
                    <el-dropdown-item 
                      command="delete"
                      divided
                      v-if="permissionsStore.hasPermission('tariffs', 'delete')"
                    >
                      Удалить
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <el-empty v-if="!loading && tariffs.length === 0" description="Нет доступных тарифов" />
    </el-card>

    <el-dialog v-model="showCreateDialog" title="Добавить тариф" width="700px">
      <el-form :model="createForm" label-width="180px">
        <el-form-item label="Название" required>
          <el-input v-model="createForm.name" />
        </el-form-item>
        <el-form-item label="Описание">
          <el-input v-model="createForm.description" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="Абонентская плата">
          <el-input-number v-model="createForm.monthly_fee" :precision="2" :min="0" />
        </el-form-item>
        <el-form-item label="Пользователей">
          <el-input-number v-model="createForm.included_users" :min="1" />
        </el-form-item>
        <el-form-item label="Номеров">
          <el-input-number v-model="createForm.included_numbers" :min="1" />
        </el-form-item>
        <el-form-item label="Функции">
          <el-checkbox-group v-model="featuresList">
            <el-checkbox label="recording">Запись звонков</el-checkbox>
            <el-checkbox label="ivr">Голосовое меню</el-checkbox>
            <el-checkbox label="sms">SMS уведомления</el-checkbox>
            <el-checkbox label="analytics">Аналитика</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">Отмена</el-button>
        <el-button type="primary" @click="createTariff" :loading="saving">Создать</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showEditDialog" title="Редактировать тариф" width="700px">
      <el-form :model="editForm" label-width="180px">
        <el-form-item label="Название">
          <el-input v-model="editForm.name" />
        </el-form-item>
        <el-form-item label="Описание">
          <el-input v-model="editForm.description" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="Абонентская плата">
          <el-input-number v-model="editForm.monthly_fee" :precision="2" :min="0" />
        </el-form-item>
        <el-form-item label="Пользователей">
          <el-input-number v-model="editForm.included_users" :min="1" />
        </el-form-item>
        <el-form-item label="Номеров">
          <el-input-number v-model="editForm.included_numbers" :min="1" />
        </el-form-item>
        <el-form-item label="Активность">
          <el-switch v-model="editForm.is_active" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditDialog = false">Отмена</el-button>
        <el-button type="primary" @click="updateTariff" :loading="saving">Сохранить</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Plus, CircleCheck, MoreFilled } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import apiClient from '@/api/client'
import { usePermissionsStore } from '@/stores/permissions'

const permissionsStore = usePermissionsStore()

const tariffs = ref([])
const loading = ref(false)
const saving = ref(false)
const currentTariff = ref(null)
const featuresList = ref([])

const showCreateDialog = ref(false)
const showEditDialog = ref(false)

const createForm = ref({
  name: '',
  description: '',
  monthly_fee: 0,
  included_users: 1,
  included_numbers: 1
})

const editForm = ref({
  name: '',
  description: '',
  monthly_fee: 0,
  included_users: 1,
  included_numbers: 1,
  is_active: true
})

const loadTariffs = async () => {
  try {
    loading.value = true
    const response = await apiClient.get('/tariffs')
    tariffs.value = response.data
  } catch (error) {
    console.error('Ошибка загрузки тарифов:', error)
    ElMessage.error('Не удалось загрузить тарифы')
  } finally {
    loading.value = false
  }
}

const createTariff = async () => {
  if (!createForm.value.name) {
    ElMessage.warning('Укажите название тарифа')
    return
  }
  try {
    saving.value = true
    const features = {}
    featuresList.value.forEach(feature => {
      features[feature] = true
    })
    const data = {
      ...createForm.value,
      features
    }
    await apiClient.post('/tariffs', data)
    ElMessage.success('Тариф создан')
    showCreateDialog.value = false
    loadTariffs()
    createForm.value = {
      name: '',
      description: '',
      monthly_fee: 0,
      included_users: 1,
      included_numbers: 1
    }
    featuresList.value = []
  } catch (error) {
    console.error('Ошибка создания тарифа:', error)
    ElMessage.error('Не удалось создать тариф')
  } finally {
    saving.value = false
  }
}

const handleCommand = (command, tariff) => {
  currentTariff.value = tariff
  
  switch (command) {
    case 'edit':
      openEditDialog(tariff)
      break
    case 'delete':
      deleteTariff(tariff)
      break
  }
}

const openEditDialog = (tariff) => {
  editForm.value = {
    name: tariff.name || '',
    description: tariff.description || '',
    monthly_fee: tariff.monthly_fee || 0,
    included_users: tariff.included_users || 1,
    included_numbers: tariff.included_numbers || 1,
    is_active: tariff.is_active
  }
  showEditDialog.value = true
}

const updateTariff = async () => {
  try {
    saving.value = true
    await apiClient.put(`/tariffs/${currentTariff.value.id}`, editForm.value)
    ElMessage.success('Тариф обновлен')
    showEditDialog.value = false
    loadTariffs()
  } catch (error) {
    console.error('Ошибка обновления тарифа:', error)
    ElMessage.error('Не удалось обновить тариф')
  } finally {
    saving.value = false
  }
}

const deleteTariff = async (tariff) => {
  try {
    await ElMessageBox.confirm(
      `Вы уверены, что хотите удалить тариф "${tariff.name}"?`,
      'Подтверждение',
      {
        confirmButtonText: 'Удалить',
        cancelButtonText: 'Отмена',
        type: 'warning'
      }
    )
    await apiClient.delete(`/tariffs/${tariff.id}`)
    ElMessage.success('Тариф удален')
    loadTariffs()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Ошибка удаления тарифа:', error)
      ElMessage.error('Не удалось удалить тариф')
    }
  }
}

const selectTariff = (tariff) => {
  ElMessage.info(`Выбран тариф: ${tariff.name}. Функционал подключения в разработке.`)
}

onMounted(() => {
  loadTariffs()
})
</script>

<style scoped>
.tariffs-view {
  max-width: 1400px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tariff-card {
  height: 100%;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.tariff-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 6px 16px rgba(45, 90, 61, 0.5);
  border-color: var(--el-color-primary);
}

.tariff-inactive {
  opacity: 0.7;
}

.tariff-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.tariff-header h3 {
  margin: 0;
  color: var(--el-text-color-primary);
  font-size: 20px;
}

.tariff-description {
  color: var(--el-text-color-secondary);
  min-height: 48px;
}

.tariff-price {
  text-align: center;
  padding: 20px 0;
}

.price-value {
  font-size: 36px;
  font-weight: 700;
  color: var(--el-color-primary);
}

.price-period {
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.tariff-features {
  margin: 15px 0;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  color: var(--el-text-color-regular);
}

.tariff-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.tariff-actions .el-button {
  flex: 1;
}

.tariff-actions .el-dropdown .el-button {
  flex: initial;
}
</style>