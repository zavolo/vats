<template>
  <div class="view">
    <el-card class="compact-card">
      <template #header>
        <div class="card-header">
          <span>AI Секретарь</span>
          <el-tag v-if="config.enabled" type="success" size="small">включён</el-tag>
          <el-tag v-else type="info" size="small">выключен</el-tag>
        </div>
      </template>

      <el-alert
        v-if="config.enabled && config.answer_all && currentAction === 'manual'"
        type="warning"
        :closable="false"
        show-icon
        style="margin-bottom: 12px"
        title="Секретарь заменит ручной приём звонков"
        description="Сейчас у вас включён ручной режим (звонок держится для оператора в «Прослушке»). Пока секретарь отвечает на все звонки, трубку на входящие берёт ИИ, а не оператор. Вмешаться в разговор можно из «Прослушки» — кнопки «Слушать» и «Перехватить»."
      />

      <el-tabs v-model="activeTab" type="border-card">
        <!-- ============================= НАСТРОЙКИ ============================= -->
        <el-tab-pane label="Настройки" name="settings">
          <el-form :model="config" label-width="190px" style="max-width: 760px" v-loading="loading">
            <el-form-item label="Секретарь включён">
              <el-switch v-model="config.enabled" />
            </el-form-item>

            <el-divider content-position="left">Персонаж</el-divider>
            <el-form-item label="Имя ассистента">
              <el-input v-model="config.persona_name" placeholder="Например: Алиса" maxlength="100" />
            </el-form-item>
            <el-form-item label="Голос">
              <div class="voice-row">
                <el-select v-model="config.voice" style="width: 330px">
                  <el-option v-for="v in meta.voices" :key="v.id" :label="v.label" :value="v.id" />
                </el-select>
                <el-button
                  v-if="meta.demo_available"
                  :loading="demoLoading" :icon="VideoPlay"
                  @click="playDemo"
                >
                  Прослушать
                </el-button>
              </div>
              <span v-if="!meta.demo_available" class="hint">
                добавьте рабочий AI-ключ, чтобы прослушать голоса
              </span>
            </el-form-item>
            <el-form-item label="Приветствие">
              <el-input v-model="config.greeting" type="textarea" :rows="2" />
              <span class="hint">чем секретарь начнёт разговор; пусто — представится сам</span>
            </el-form-item>
            <el-form-item label="Доп. инструкции">
              <el-input
                v-model="config.instructions" type="textarea" :rows="3"
                placeholder="Стиль общения, какие вопросы задавать, что отвечать по типовым темам…"
              />
            </el-form-item>

            <el-divider content-position="left">Когда отвечает секретарь</el-divider>
            <el-form-item label="Отвечать на все звонки">
              <el-switch v-model="config.answer_all" />
              <span class="hint">секретарь снимает трубку сразу, телефон не звонит</span>
            </el-form-item>
            <el-alert
              v-if="config.answer_all && currentAction === 'manual'"
              type="info" :closable="false" show-icon
              style="margin: 0 0 12px 190px; max-width: 560px"
              title="Секретарь будет отвечать вместо вас"
              description="Сейчас входящие вы принимаете вручную. Теперь на все звонки будет отвечать ассистент. Вы всегда сможете послушать разговор и подключиться к нему сами в разделе «Прослушка»."
            />
            <template v-if="!config.answer_all">
              <el-form-item label="Если долго не отвечаете">
                <el-switch v-model="config.on_no_answer" />
              </el-form-item>
              <el-form-item label="Если сбросили вызов">
                <el-switch v-model="config.on_busy" />
              </el-form-item>
              <el-form-item label="Если вне сети">
                <el-switch v-model="config.on_offline" />
              </el-form-item>
            </template>
            <el-divider content-position="left">Спам и мошенники</el-divider>
            <el-form-item label="Защита от спама">
              <el-switch v-model="config.antispam" />
              <span class="hint">секретарь распознаёт рекламу и мошенников и никогда не выдаёт ваши данные</span>
            </el-form-item>
            <el-form-item v-if="config.antispam" label="Как отвечать">
              <el-radio-group v-model="config.spam_tactic" class="spam-tactic">
                <el-radio value="polite">
                  <div class="tactic-title">Вежливо отшить</div>
                  <div class="tactic-hint">попросит больше не звонить и положит трубку</div>
                </el-radio>
                <el-radio value="troll">
                  <div class="tactic-title">Потянуть время</div>
                  <div class="tactic-hint">«алло… вас не слышно…» — пусть мошенник тратит время на робота, а не на людей</div>
                </el-radio>
              </el-radio-group>
            </el-form-item>

            <template v-if="isRoot">
              <el-divider content-position="left">Технические настройки</el-divider>
              <el-form-item label="Модель">
                <el-select v-model="config.model" style="width: 260px" allow-create filterable>
                  <el-option v-for="m in meta.models" :key="m" :label="m" :value="m" />
                </el-select>
              </el-form-item>
              <el-form-item label="Макс. длительность, сек">
                <el-input-number v-model="config.max_duration_sec" :min="30" :max="600" :step="30" />
              </el-form-item>
            </template>

            <el-form-item>
              <el-button type="primary" :loading="saving" @click="saveConfig">Сохранить</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- ============================== ДИАЛОГИ ============================== -->
        <el-tab-pane label="Диалоги" name="dialogs">
          <div class="dialogs-toolbar">
            <el-button :icon="Refresh" @click="loadDialogs" :loading="dialogsLoading">Обновить</el-button>
          </div>
          <el-skeleton v-if="dialogsLoading && !dialogs.length" :rows="4" animated />
          <el-empty
            v-else-if="!dialogs.length"
            description="Диалогов пока нет — секретарь ещё ни с кем не поговорил"
          />
          <el-table v-else :data="dialogs" style="width: 100%">
            <el-table-column label="Дата" width="150">
              <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
            </el-table-column>
            <el-table-column prop="caller_number" label="Номер" width="150" />
            <el-table-column label="Реплик" width="90" align="center" prop="messages" />
            <el-table-column label="Последняя фраза" min-width="200">
              <template #default="{ row }">
                <span class="preview">{{ row.preview || '—' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="Действия" width="230" align="right">
              <template #default="{ row }">
                <el-button size="small" type="primary" plain @click="openTranscript(row)">
                  Расшифровка
                </el-button>
                <el-button
                  v-if="row.has_recording" size="small" plain
                  :loading="loadingAudio[row.call_id]"
                  @click="playRecording(row)"
                >
                  Запись
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination
            v-if="dialogsTotal > pageSize"
            v-model:current-page="page"
            :page-size="pageSize"
            :total="dialogsTotal"
            layout="total, prev, pager, next"
            style="margin-top: 12px"
            @current-change="loadDialogs"
          />
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- Диалог с расшифровкой -->
    <el-dialog v-model="transcriptVisible" :title="`Разговор с ${currentTranscript?.caller_number || ''}`" width="620px">
      <div v-if="currentTranscript" class="chat">
        <div class="chat-meta">
          {{ formatDate(currentTranscript.created_at) }}
          <span v-if="currentTranscript.duration"> · {{ currentTranscript.duration }} сек</span>
        </div>
        <div
          v-for="(msg, i) in currentTranscript.dialog" :key="i"
          class="chat-msg" :class="msg.role"
        >
          <div class="chat-role">{{ msg.role === 'secretary' ? 'Секретарь' : 'Звонящий' }}</div>
          <div class="chat-text">{{ msg.text }}</div>
        </div>
        <div v-if="audioUrl" class="chat-audio">
          <audio :src="audioUrl" controls style="width: 100%" />
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onActivated, onBeforeUnmount } from 'vue'
import { Refresh, VideoPlay } from '@element-plus/icons-vue'
import apiClient from '@/api/client'
import { useNotifications } from '@/composables/useNotifications'
import { usePermissionsStore } from '@/stores/permissions'

const notifications = useNotifications()
const permissionsStore = usePermissionsStore()
const isRoot = computed(() => permissionsStore.isRoot)

const activeTab = ref('settings')
const loading = ref(false)
const saving = ref(false)
const currentAction = ref(null)  // текущий action_type компании (manual/forward/…)
const meta = ref({
  voices: [
    { id: 'marin', label: 'Марина — женский, спокойный и деловой' },
    { id: 'cedar', label: 'Кирилл — мужской, тёплый и уверенный' },
  ],
  models: ['gpt-realtime-mini', 'gpt-realtime'],
  demo_available: false,
})
const config = ref({
  enabled: false,
  persona_name: 'Ассистент',
  voice: 'marin',
  greeting: '',
  instructions: '',
  answer_all: false,
  on_no_answer: true,
  on_busy: true,
  on_offline: true,
  antispam: true,
  spam_tactic: 'polite',
  model: 'gpt-realtime-mini',
  max_duration_sec: 180,
})

const dialogs = ref([])
const dialogsLoading = ref(false)
const dialogsTotal = ref(0)
const page = ref(1)
const pageSize = 50
const transcriptVisible = ref(false)
const currentTranscript = ref(null)
const audioUrl = ref(null)
const audioBlobUrls = ref({})
const loadingAudio = ref({})

const loadMeta = async () => {
  try {
    const { data } = await apiClient.get('/secretary/meta')
    meta.value = data
  } catch { /* дефолты уже на месте */ }
}

// -------- демка голоса --------
const demoLoading = ref(false)
let demoAudio = null

const playDemo = async () => {
  demoLoading.value = true
  try {
    if (demoAudio) {
      demoAudio.pause()
      demoAudio = null
    }
    const response = await apiClient.post(
      '/secretary/voice-demo',
      { voice: config.value.voice, text: config.value.greeting || null },
      { responseType: 'blob', timeout: 45000 }
    )
    const url = URL.createObjectURL(new Blob([response.data], { type: 'audio/mpeg' }))
    demoAudio = new Audio(url)
    demoAudio.onended = () => URL.revokeObjectURL(url)
    await demoAudio.play()
  } catch (e) {
    const detail = e.response?.data?.detail
    if (e.response?.status === 409) {
      notifications.warning('Демо недоступно', detail || 'Добавьте рабочий AI-ключ в разделе «AI Ключи»')
    } else {
      notifications.error('Не удалось озвучить демо', detail || 'Попробуйте позже')
    }
  } finally {
    demoLoading.value = false
  }
}

const loadConfig = async () => {
  loading.value = true
  try {
    const { data } = await apiClient.get('/secretary/config')
    currentAction.value = data.current_action ?? null
    if (data.exists) {
      const { exists, id, company_id, current_action, ...rest } = data
      config.value = { ...config.value, ...rest }
    }
  } catch (e) {
    notifications.error('Ошибка', 'Не удалось загрузить настройки секретаря')
  } finally {
    loading.value = false
  }
}

const saveConfig = async () => {
  saving.value = true
  try {
    await apiClient.put('/secretary/config', config.value)
    notifications.success('Сохранено', 'Настройки секретаря применены')
  } catch (e) {
    notifications.error('Ошибка', 'Не удалось сохранить настройки')
  } finally {
    saving.value = false
  }
}

const loadDialogs = async () => {
  dialogsLoading.value = true
  try {
    const { data } = await apiClient.get('/secretary/dialogs', {
      params: { skip: (page.value - 1) * pageSize, limit: pageSize },
    })
    dialogs.value = data.items
    dialogsTotal.value = data.total
  } catch (e) {
    notifications.error('Ошибка', 'Не удалось загрузить диалоги')
  } finally {
    dialogsLoading.value = false
  }
}

const openTranscript = async (row) => {
  audioUrl.value = null
  try {
    const { data } = await apiClient.get(`/secretary/dialogs/${row.id}`)
    currentTranscript.value = data
    transcriptVisible.value = true
  } catch (e) {
    notifications.error('Ошибка', 'Не удалось загрузить расшифровку')
  }
}

const playRecording = async (row) => {
  loadingAudio.value[row.call_id] = true
  try {
    if (!audioBlobUrls.value[row.call_id]) {
      const response = await apiClient.get(`/calls/recording/${row.call_id}`, {
        responseType: 'blob',
      })
      const blob = new Blob([response.data], { type: 'audio/wav' })
      audioBlobUrls.value[row.call_id] = URL.createObjectURL(blob)
    }
    // открываем расшифровку с плеером внизу
    await openTranscript(row)
    audioUrl.value = audioBlobUrls.value[row.call_id]
  } catch (e) {
    if (e.response?.status === 404) {
      notifications.info('Запись недоступна', 'Аудио для этого звонка не сохранилось')
      row.has_recording = false
    } else {
      notifications.error('Ошибка', 'Не удалось загрузить запись')
    }
  } finally {
    loadingAudio.value[row.call_id] = false
  }
}

const formatDate = (iso) => {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return iso
  }
}

onMounted(() => {
  loadMeta()
  loadConfig()
  loadDialogs()
})
onActivated(() => {
  loadConfig()
  loadDialogs()
})
onBeforeUnmount(() => {
  if (demoAudio) demoAudio.pause()
})
</script>

<style scoped>
.view {
  padding: 12px;
  max-width: 1200px;
  margin: 0 auto;
}
.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 600;
}
.hint {
  margin-left: 10px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.voice-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.spam-tactic {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}
.spam-tactic :deep(.el-radio) {
  height: auto;
  align-items: flex-start;
  margin-right: 0;
  padding: 4px 0;
  white-space: normal;
}
.tactic-title {
  font-weight: 500;
  line-height: 1.3;
}
.tactic-hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.4;
}
.dialogs-toolbar {
  margin-bottom: 12px;
  display: flex;
  justify-content: flex-end;
}
.preview {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.chat {
  max-height: 60vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 4px 2px;
}
.chat-meta {
  align-self: center;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-light);
  padding: 3px 10px;
  border-radius: 10px;
  margin-bottom: 4px;
}
.chat-msg {
  max-width: 80%;
  padding: 10px 14px;
  border-radius: 14px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}
/* Секретарь — синий пузырь слева, белый текст (читаемо в любой теме) */
.chat-msg.secretary {
  align-self: flex-start;
  background: var(--el-color-primary);
  border-bottom-left-radius: 4px;
}
.chat-msg.secretary .chat-role {
  color: rgba(255, 255, 255, 0.85);
}
.chat-msg.secretary .chat-text {
  color: #fff;
}
/* Звонящий — нейтральный пузырь справа */
.chat-msg.caller {
  align-self: flex-end;
  background: var(--el-fill-color-darker);
  border-bottom-right-radius: 4px;
}
.chat-msg.caller .chat-role {
  color: var(--el-text-color-secondary);
}
.chat-msg.caller .chat-text {
  color: var(--el-text-color-primary);
}
.chat-role {
  font-size: 11px;
  font-weight: 600;
  margin-bottom: 3px;
  letter-spacing: 0.02em;
}
.chat-text {
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}
.chat-audio {
  margin-top: 12px;
  position: sticky;
  bottom: 0;
}
</style>
