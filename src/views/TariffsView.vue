<template>
  <div class="tariffs-view">
    <el-card class="compact-card">
      <template #header>
        <div class="card-header">
          <span>Тарифные планы</span>
          <div class="header-actions">
            <el-button type="primary" @click="loadTariffs" size="small" :loading="loading" :icon="Refresh" />
            <el-button
              type="success"
              @click="showCreateDialog = true"
              size="small"
              :icon="Plus"
              v-if="permissionsStore.hasPermission('tariffs', 'create')"
            >
              Добавить
            </el-button>
          </div>
        </div>
      </template>

      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="5" animated />
      </div>

      <div v-else-if="tariffs.length === 0" class="empty-container">
        <el-empty description="Нет доступных тарифов" :image-size="60" />
      </div>

      <div v-else class="tariffs-list">
        <div
          v-for="tariff in tariffs"
          :key="tariff.id"
          class="tariff-row"
          :class="{ inactive: !tariff.is_active }"
        >
          <div class="tariff-index">#{{ tariff.id }}</div>

          <div class="tariff-status">
            <div class="status-indicator" :class="{ active: tariff.is_active }"></div>
          </div>

          <div class="tariff-main">
            <div class="tariff-header">
              <span class="tariff-name">{{ tariff.name }}</span>
              <el-tag :type="tariff.is_active ? 'success' : 'info'" size="small">
                {{ tariff.is_active ? 'Активен' : 'Неактивен' }}
              </el-tag>
            </div>
            <div class="tariff-description" v-if="tariff.description">
              {{ tariff.description }}
            </div>
            <div class="tariff-features">
              <span class="feature-item">
                <el-icon color="#67c23a"><CircleCheck /></el-icon>
                {{ tariff.included_users }} польз.
              </span>
              <span class="feature-item">
                <el-icon color="#67c23a"><CircleCheck /></el-icon>
                {{ tariff.included_numbers }} номеров
              </span>
              <span class="feature-item" v-if="tariff.features?.recording">
                <el-icon color="#67c23a"><CircleCheck /></el-icon>
                Запись
              </span>
              <span class="feature-item" v-if="tariff.features?.ivr">
                <el-icon color="#67c23a"><CircleCheck /></el-icon>
                IVR
              </span>
              <span class="feature-item" v-if="tariff.features?.sms">
                <el-icon color="#67c23a"><CircleCheck /></el-icon>
                SMS
              </span>
            </div>
          </div>

          <div class="tariff-price">
            <span class="price-value">{{ tariff.monthly_fee?.toFixed(2) || '0.00' }} ₽</span>
            <span class="price-period">/мес</span>
          </div>

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
              trigger="click"
              @command="(cmd) => handleCommand(cmd, tariff)"
              v-if="permissionsStore.hasPermission('tariffs', 'update') || permissionsStore.hasPermission('tariffs', 'delete')"
            >
              <el-button size="small" :icon="MoreFilled" />
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item
                    command="edit"
                    v-if="permissionsStore.hasPermission('tariffs', 'update')"
                  >
                    <el-icon><Edit /></el-icon>
                    Редактировать
                  </el-dropdown-item>
                  <el-dropdown-item
                    command="delete"
                    divided
                    v-if="permissionsStore.hasPermission('tariffs', 'delete')"
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
    </el-card>

    <el-dialog v-model="showCreateDialog" title="Добавить тариф" width="700px">
      <el-form :model="createForm" label-width="180px" size="default">
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
      <el-form :model="editForm" label-width="180px" size="default">
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
        <el-form-item label="Функции">
          <el-checkbox-group v-model="editFeaturesList">
            <el-checkbox label="recording">Запись звонков</el-checkbox>
            <el-checkbox label="ivr">Голосовое меню</el-checkbox>
            <el-checkbox label="sms">SMS уведомления</el-checkbox>
            <el-checkbox label="analytics">Аналитика</el-checkbox>
          </el-checkbox-group>
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
import { ref, onMounted, onActivated } from 'vue'
import { Refresh, Plus, CircleCheck, MoreFilled, Edit, Delete } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import { useNotifications } from '@/composables/useNotifications'
import apiClient from '@/api/client'
import { usePermissionsStore } from '@/stores/permissions'

const permissionsStore = usePermissionsStore()
const notifications = useNotifications()

const tariffs = ref([])
const loading = ref(false)
const saving = ref(false)
const currentTariff = ref(null)
const featuresList = ref([])
const editFeaturesList = ref([])

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
    const response = await apiClient.get('/tariffs', {
      params: { _t: Date.now() },
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
    tariffs.value = response.data
  } catch (error) {
    console.error('Ошибка загрузки тарифов:', error)
    notifications.error('Ошибка загрузки', 'Не удалось загрузить тарифы')
  } finally {
    loading.value = false
  }
}

const createTariff = async () => {
  if (!createForm.value.name) {
    notifications.warning('Предупреждение', 'Укажите название тарифа')
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
    notifications.success('Успешно', 'Тариф создан')
    showCreateDialog.value = false
    createForm.value = {
      name: '',
      description: '',
      monthly_fee: 0,
      included_users: 1,
      included_numbers: 1
    }
    featuresList.value = []
    await loadTariffs()
  } catch (error) {
    console.error('Ошибка создания тарифа:', error)
    notifications.error('Ошибка создания', 'Не удалось создать тариф')
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

  // Загружаем features в чекбоксы
  editFeaturesList.value = []
  if (tariff.features) {
    Object.keys(tariff.features).forEach(feature => {
      if (tariff.features[feature]) {
        editFeaturesList.value.push(feature)
      }
    })
  }

  showEditDialog.value = true
}

const updateTariff = async () => {
  try {
    saving.value = true

    // Формируем объект features из чекбоксов
    const features = {}
    editFeaturesList.value.forEach(feature => {
      features[feature] = true
    })

    const data = {
      ...editForm.value,
      features
    }

    await apiClient.put(`/tariffs/${currentTariff.value.id}`, data)
    notifications.success('Успешно', 'Тариф обновлен')
    showEditDialog.value = false
    editFeaturesList.value = []
    await loadTariffs()
  } catch (error) {
    console.error('Ошибка обновления тарифа:', error)
    notifications.error('Ошибка обновления', 'Не удалось обновить тариф')
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
    notifications.success('Успешно', 'Тариф удален')
    await loadTariffs()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Ошибка удаления тарифа:', error)
      notifications.error('Ошибка удаления', 'Не удалось удалить тариф')
    }
  }
}

const selectTariff = (tariff) => {
  notifications.info('Информация', `Выбран тариф: ${tariff.name}. Функционал подключения в разработке.`)
}

onMounted(() => {
  loadTariffs()
})

onActivated(() => {
  loadTariffs()
})
</script>

<style scoped>
.tariffs-view {
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

.tariffs-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tariff-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 6px;
  transition: background-color 0.15s;
}

.tariff-row:hover {
  background: var(--el-fill-color-light);
}

.tariff-row.inactive {
  opacity: 0.6;
}

.tariff-index {
  min-width: 32px;
  text-align: center;
  font-size: 11px;
  color: var(--el-text-color-placeholder);
  font-family: 'SF Mono', Monaco, 'Courier New', monospace;
  flex-shrink: 0;
}

.tariff-status {
  flex-shrink: 0;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--el-color-info);
}

.status-indicator.active {
  background: var(--el-color-success);
  box-shadow: 0 0 6px var(--el-color-success);
}

.tariff-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tariff-header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.tariff-name {
  font-weight: 600;
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.tariff-description {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.4;
}

.tariff-features {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 12px;
  margin-top: 2px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--el-text-color-regular);
}

.feature-item .el-icon {
  font-size: 14px;
}

.tariff-price {
  flex-shrink: 0;
  text-align: right;
  min-width: 100px;
}

.price-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--el-color-primary);
}

.price-period {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.tariff-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .tariffs-view {
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

  .tariff-row {
    flex-wrap: wrap;
    gap: 8px;
  }

  .tariff-main {
    flex: 1 1 calc(100% - 60px);
  }

  .tariff-price {
    order: 10;
    flex: 0 0 auto;
  }

  .tariff-actions {
    order: 11;
  }
}
</style>