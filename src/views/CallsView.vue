<template>
  <div class="calls-view">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>История звонков</span>
          <el-button type="primary" @click="loadCalls" size="small">
            <el-icon><Refresh /></el-icon>
            Обновить
          </el-button>
        </div>
      </template>

      <el-form :inline="true" class="filter-form" size="small">
        <el-form-item label="Тип звонка">
          <el-select v-model="filters.callType" placeholder="Все типы" clearable @change="loadCalls" style="width: 150px">
            <el-option label="Все типы" value="" />
            <el-option label="Входящие" value="incoming" />
            <el-option label="Исходящие" value="outgoing" />
          </el-select>
        </el-form-item>
      </el-form>

      <el-table :data="calls" v-loading="loading" style="width: 100%" stripe size="small">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column label="Тип" width="100">
          <template #default="{ row }">
            <el-tag :type="row.call_type === 'incoming' ? 'success' : 'primary'" size="small">
              {{ row.call_type === 'incoming' ? 'Входящий' : 'Исходящий' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="caller_number" label="От кого" min-width="120" />
        <el-table-column prop="called_number" label="Кому" min-width="120" />
        <el-table-column prop="provider" label="Провайдер" min-width="100" />
        <el-table-column label="Длительность" width="100">
          <template #default="{ row }">
            {{ formatDuration(row.duration) }}
          </template>
        </el-table-column>
        <el-table-column label="Стоимость" width="100">
          <template #default="{ row }">
            {{ row.cost?.toFixed(2) || '0.00' }} ₽
          </template>
        </el-table-column>
        <el-table-column label="Статус" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Дата" width="140">
          <template #default="{ row }">
            {{ formatDate(row.started_at) }}
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.limit"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        @size-change="loadCalls"
        @current-change="loadCalls"
        style="margin-top: 16px; justify-content: center"
        small
      />
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import apiClient from '@/api/client'

const calls = ref([])
const loading = ref(false)
const filters = ref({ callType: '' })
const pagination = ref({ page: 1, limit: 20, total: 0 })

const loadCalls = async () => {
  try {
    loading.value = true
    const params = {
      skip: (pagination.value.page - 1) * pagination.value.limit,
      limit: pagination.value.limit
    }
    if (filters.value.callType) {
      params.call_type = filters.value.callType
    }
    const response = await apiClient.get('/calls', { params })
    calls.value = response.data
    pagination.value.total = response.data.length
  } catch (error) {
    console.error('Ошибка загрузки звонков:', error)
    ElMessage.error('Не удалось загрузить звонки')
  } finally {
    loading.value = false
  }
}

const formatDuration = (seconds) => {
  if (!seconds) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const getStatusType = (status) => {
  const types = { 'completed': 'success', 'ringing': 'warning', 'failed': 'danger' }
  return types[status] || 'info'
}

const getStatusLabel = (status) => {
  const labels = { 'completed': 'Завершён', 'ringing': 'Звонит', 'failed': 'Не удался' }
  return labels[status] || status
}

onMounted(() => {
  loadCalls()
})
</script>

<style scoped>
.calls-view {
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
  .calls-view {
    padding: 12px;
  }
}
</style>