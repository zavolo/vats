<template>
  <div class="view">
    <el-card class="compact-card">
      <template #header>
        <div class="card-header">
          <span>AI Ключи (OpenAI)</span>
          <div class="header-actions">
            <el-button :icon="Refresh" circle @click="loadKeys" :loading="loading" />
            <el-button type="primary" :icon="Plus" @click="addDialogVisible = true">
              Добавить ключ
            </el-button>
          </div>
        </div>
      </template>

      <el-alert
        type="info"
        :closable="false"
        show-icon
        style="margin-bottom: 16px"
        title="Эти ключи дают голос AI-секретарю"
        description="Достаточно одного рабочего ключа. Если ключей несколько — используется тот, что выше по приоритету, а при сбое система сама переключится на запасной. Нерабочие ключи отключаются автоматически, перегруженные — отдыхают пару минут и пробуются снова."
      />

      <div class="proxy-box">
        <div class="proxy-title">Прокси для OpenAI</div>
        <div class="proxy-hint">
          OpenAI не работает с российских IP. Укажите HTTP-прокси, который выходит
          в интернет из другой страны — через него пойдут все запросы: звонки
          секретаря, проверка ключей и демо голосов.
        </div>
        <div class="proxy-row">
          <el-input
            v-model="proxyUrl" placeholder="http://192.168.3.4:8888"
            style="max-width: 360px" clearable
          />
          <el-button :loading="proxyTesting" @click="testProxy">Проверить</el-button>
          <el-button type="primary" :loading="proxySaving" @click="saveProxy">Сохранить</el-button>
        </div>
        <el-tag
          v-if="proxyResult" :type="proxyResult.ok ? 'success' : 'danger'"
          style="margin-top: 8px; height: auto; white-space: normal; padding: 4px 10px"
        >
          {{ proxyResult.message }}
        </el-tag>
      </div>

      <el-skeleton v-if="loading && !keys.length" :rows="4" animated />
      <el-empty v-else-if="!keys.length" description="Ключей пока нет — добавьте первый" />

      <el-table v-else :data="keys" style="width: 100%">
        <el-table-column label="Ключ" min-width="220">
          <template #default="{ row }">
            <div class="key-cell">
              <code>{{ revealed[row.id] || row.key_masked }}</code>
              <el-button
                text size="small" :icon="View"
                @click="toggleReveal(row)"
                :title="revealed[row.id] ? 'Скрыть' : 'Показать'"
              />
              <el-button
                text size="small" :icon="CopyDocument"
                @click="copyKey(row)" title="Скопировать"
              />
            </div>
          </template>
        </el-table-column>
        <el-table-column label="Метка" min-width="140">
          <template #default="{ row }">
            <span>{{ row.label || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="Приоритет" width="110" align="center">
          <template #default="{ row }">
            <el-input-number
              :model-value="row.priority" :min="0" :max="100" size="small"
              controls-position="right" style="width: 90px"
              @change="(v) => savePriority(row, v)"
            />
          </template>
        </el-table-column>
        <el-table-column label="Статус" min-width="170">
          <template #default="{ row }">
            <el-tag v-if="!row.enabled" type="danger" size="small">отключён</el-tag>
            <el-tag v-else-if="row.cooldown_left > 0" type="warning" size="small">
              недоступен ({{ fmtCooldown(row.cooldown_left) }})
            </el-tag>
            <el-tag v-else type="success" size="small">активен</el-tag>
            <div v-if="row.last_error" class="key-error">{{ row.last_error }}</div>
          </template>
        </el-table-column>
        <el-table-column label="Последний успех" width="150">
          <template #default="{ row }">
            {{ row.last_ok_at ? formatDate(row.last_ok_at) : '—' }}
          </template>
        </el-table-column>
        <el-table-column label="Действия" width="230" align="right">
          <template #default="{ row }">
            <el-button size="small" :loading="validating[row.id]" @click="validateKey(row)">
              Проверить
            </el-button>
            <el-switch
              :model-value="row.enabled" size="small" style="margin: 0 8px"
              @change="(v) => toggleEnabled(row, v)"
            />
            <el-button size="small" type="danger" :icon="Delete" @click="deleteKey(row)" />
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="addDialogVisible" title="Добавить OpenAI ключ" width="500px">
      <el-form :model="addForm" label-width="110px">
        <el-form-item label="API-ключ" required>
          <el-input
            v-model="addForm.key" placeholder="sk-..." type="password" show-password
          />
        </el-form-item>
        <el-form-item label="Метка">
          <el-input v-model="addForm.label" placeholder="Например: основной" />
        </el-form-item>
        <el-form-item label="Приоритет">
          <el-input-number v-model="addForm.priority" :min="0" :max="100" />
        </el-form-item>
        <el-form-item v-if="validateResult">
          <el-alert
            :type="validateResult.valid ? 'success' : 'error'"
            :title="validateResult.valid ? 'Ключ рабочий' : validateResult.reason"
            :closable="false"
            show-icon
            class="validate-alert"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addDialogVisible = false">Отмена</el-button>
        <el-button :loading="validatingNew" @click="validateNew">Проверить</el-button>
        <el-button type="primary" :loading="saving" :disabled="!addForm.key" @click="addKey">
          Добавить
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, onActivated, onBeforeUnmount } from 'vue'
import { Plus, Refresh, Delete, View, CopyDocument } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import apiClient from '@/api/client'
import { useNotifications } from '@/composables/useNotifications'

const notifications = useNotifications()

const keys = ref([])
const loading = ref(false)
const saving = ref(false)
const validating = ref({})
const validatingNew = ref(false)
const validateResult = ref(null)
const revealed = ref({})
const addDialogVisible = ref(false)
const addForm = ref({ key: '', label: '', priority: 0 })

// тикаем кулдауны раз в секунду, чтобы бейджи оживали без refresh
let cooldownTimer = null

// -------- прокси для OpenAI --------
const proxyUrl = ref('')
const proxySaving = ref(false)
const proxyTesting = ref(false)
const proxyResult = ref(null)

const loadProxy = async () => {
  try {
    const { data } = await apiClient.get('/ai-keys/settings')
    proxyUrl.value = data.proxy_url || ''
  } catch { /* не критично */ }
}

const saveProxy = async () => {
  proxySaving.value = true
  try {
    await apiClient.put('/ai-keys/settings', { proxy_url: proxyUrl.value })
    notifications.success('Сохранено', proxyUrl.value ? 'Прокси применён' : 'Прокси отключён')
    proxyResult.value = null
  } catch (e) {
    notifications.error('Ошибка', e.response?.data?.detail || 'Не удалось сохранить прокси')
  } finally {
    proxySaving.value = false
  }
}

const testProxy = async () => {
  proxyTesting.value = true
  proxyResult.value = null
  try {
    const { data } = await apiClient.post('/ai-keys/settings/test', { proxy_url: proxyUrl.value })
    proxyResult.value = data
  } catch (e) {
    if (e.response?.status === 401) {
      proxyResult.value = { ok: false, message: 'Сессия истекла — войдите заново и повторите проверку' }
    } else {
      proxyResult.value = { ok: false, message: e.response?.data?.detail || 'Не удалось выполнить проверку' }
    }
  } finally {
    proxyTesting.value = false
  }
}

const loadKeys = async () => {
  loading.value = true
  try {
    const { data } = await apiClient.get('/ai-keys/')
    keys.value = data
  } catch (e) {
    notifications.error('Ошибка', 'Не удалось загрузить ключи')
  } finally {
    loading.value = false
  }
}

const validateNew = async () => {
  if (!addForm.value.key) return
  validatingNew.value = true
  validateResult.value = null
  try {
    const { data } = await apiClient.post('/ai-keys/validate', { key: addForm.value.key })
    validateResult.value = data
  } catch (e) {
    notifications.error('Ошибка', 'Не удалось проверить ключ')
  } finally {
    validatingNew.value = false
  }
}

const addKey = async () => {
  saving.value = true
  try {
    await apiClient.post('/ai-keys/', addForm.value)
    notifications.success('Готово', 'Ключ добавлен')
    addDialogVisible.value = false
    addForm.value = { key: '', label: '', priority: 0 }
    validateResult.value = null
    await loadKeys()
  } catch (e) {
    notifications.error('Ошибка', 'Не удалось добавить ключ')
  } finally {
    saving.value = false
  }
}

const validateKey = async (row) => {
  validating.value[row.id] = true
  try {
    const { data } = await apiClient.post(`/ai-keys/${row.id}/validate`)
    if (data.valid) {
      notifications.success('Ключ рабочий', row.label || row.key_masked)
    } else {
      notifications.warning('Ключ не прошёл проверку', data.reason)
    }
    await loadKeys()
  } catch (e) {
    notifications.error('Ошибка', 'Не удалось проверить ключ')
  } finally {
    validating.value[row.id] = false
  }
}

const toggleReveal = async (row) => {
  if (revealed.value[row.id]) {
    delete revealed.value[row.id]
    return
  }
  try {
    const { data } = await apiClient.post(`/ai-keys/${row.id}/reveal`)
    revealed.value[row.id] = data.key
  } catch (e) {
    notifications.error('Ошибка', 'Не удалось получить ключ')
  }
}

const copyKey = async (row) => {
  try {
    let full = revealed.value[row.id]
    if (!full) {
      const { data } = await apiClient.post(`/ai-keys/${row.id}/reveal`)
      full = data.key
    }
    await navigator.clipboard.writeText(full)
    notifications.success('Скопировано', 'Ключ в буфере обмена')
  } catch (e) {
    notifications.error('Ошибка', 'Не удалось скопировать')
  }
}

const toggleEnabled = async (row, value) => {
  try {
    await apiClient.patch(`/ai-keys/${row.id}`, { enabled: value })
    await loadKeys()
  } catch (e) {
    notifications.error('Ошибка', 'Не удалось изменить статус')
  }
}

const savePriority = async (row, value) => {
  try {
    await apiClient.patch(`/ai-keys/${row.id}`, { priority: value })
    row.priority = value
  } catch (e) {
    notifications.error('Ошибка', 'Не удалось изменить приоритет')
  }
}

const deleteKey = async (row) => {
  try {
    await ElMessageBox.confirm(
      `Удалить ключ ${row.label || row.key_masked}?`,
      'Подтверждение',
      { type: 'warning', confirmButtonText: 'Удалить', cancelButtonText: 'Отмена' }
    )
  } catch {
    return
  }
  try {
    await apiClient.delete(`/ai-keys/${row.id}`)
    notifications.success('Готово', 'Ключ удалён')
    await loadKeys()
  } catch (e) {
    notifications.error('Ошибка', 'Не удалось удалить ключ')
  }
}

const fmtCooldown = (s) => (s >= 60 ? `${Math.ceil(s / 60)} мин` : `${s} с`)

const formatDate = (iso) => {
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    })
  } catch {
    return iso
  }
}

onMounted(() => {
  loadKeys()
  loadProxy()
  cooldownTimer = setInterval(() => {
    keys.value.forEach(k => {
      if (k.cooldown_left > 0) k.cooldown_left--
    })
  }, 1000)
})
onActivated(loadKeys)
onBeforeUnmount(() => clearInterval(cooldownTimer))
</script>

<style scoped>
.view {
  padding: 12px;
  max-width: 1200px;
  margin: 0 auto;
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
.proxy-box {
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  padding: 14px 16px;
  margin-bottom: 16px;
  background: var(--el-fill-color-lighter);
}
.proxy-title {
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 4px;
}
.proxy-hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 10px;
  line-height: 1.5;
}
.proxy-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.key-cell {
  display: flex;
  align-items: center;
  gap: 4px;
}
/* результат проверки ключа — на всю ширину формы, текст переносится */
.validate-alert {
  width: 100%;
}
.validate-alert :deep(.el-alert__title) {
  white-space: normal;
  word-break: break-word;
  line-height: 1.4;
}
.key-cell code {
  font-size: 12px;
  word-break: break-all;
}
.key-error {
  font-size: 11px;
  color: var(--el-color-danger);
  margin-top: 2px;
  word-break: break-word;
}
</style>
