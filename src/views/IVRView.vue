<template>
  <div class="ivr-view">
    <el-card class="compact-card">
      <template #header>
        <div class="card-header">
          <span>IVR & Маршрутизация</span>
          <el-button text size="small" @click="showHelpDialog = true" :icon="QuestionFilled">
            Справка
          </el-button>
        </div>
      </template>

      <el-tabs v-model="activeTab" class="compact-tabs">
        <!-- IVR Меню -->
        <el-tab-pane label="IVR Меню" name="menus">
          <div class="tab-actions">
            <el-button type="primary" @click="loadMenus" size="small" :loading="loading.menus" :icon="Refresh" />
            <el-button type="success" @click="showMenuCreateDialog = true" size="small" :icon="Plus">
              Добавить
            </el-button>
          </div>

          <div v-if="loading.menus" class="loading-container">
            <el-skeleton :rows="4" animated />
          </div>

          <div v-else-if="menus.length === 0" class="empty-container">
            <el-empty description="Нет IVR меню" :image-size="60" />
          </div>

          <div v-else class="items-list">
            <div v-for="menu in menus" :key="menu.id" class="item-row">
              <div class="item-status">
                <div class="status-indicator" :class="{ active: menu.is_active }"></div>
              </div>

              <div class="item-main">
                <div class="item-header">
                  <span class="item-name">{{ menu.name }}</span>
                  <el-tag :type="menu.is_active ? 'success' : 'info'" size="small">
                    {{ menu.is_active ? 'Активно' : 'Неактивно' }}
                  </el-tag>
                </div>
                <div class="item-details" v-if="menu.description">
                  <span class="item-description">{{ menu.description }}</span>
                </div>
                <div class="item-meta">
                  <span class="meta-item">
                    <span class="meta-label">Таймаут:</span>
                    <span class="meta-value">{{ menu.timeout }} сек</span>
                  </span>
                  <span class="meta-item">
                    <span class="meta-label">Попытки:</span>
                    <span class="meta-value">{{ menu.max_retries }}</span>
                  </span>
                  <span class="meta-item" v-if="menu.greeting_audio">
                    <span class="meta-label">Аудио:</span>
                    <span class="meta-value">{{ menu.greeting_audio }}</span>
                  </span>
                </div>
              </div>

              <div class="item-actions">
                <el-dropdown @command="(cmd) => handleMenuCommand(cmd, menu)" trigger="click">
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
        </el-tab-pane>

        <!-- Очереди -->
        <el-tab-pane label="Очереди" name="queues">
          <div class="tab-actions">
            <el-button type="primary" @click="loadQueues" size="small" :loading="loading.queues" :icon="Refresh" />
            <el-button type="success" @click="showQueueCreateDialog = true" size="small" :icon="Plus">
              Добавить
            </el-button>
          </div>

          <div v-if="loading.queues" class="loading-container">
            <el-skeleton :rows="4" animated />
          </div>

          <div v-else-if="queues.length === 0" class="empty-container">
            <el-empty description="Нет очередей" :image-size="60" />
          </div>

          <div v-else class="items-list">
            <div v-for="queue in queues" :key="queue.id" class="item-row">
              <div class="item-status">
                <div class="status-indicator" :class="{ active: queue.is_active }"></div>
              </div>

              <div class="item-main">
                <div class="item-header">
                  <span class="item-name">{{ queue.name }}</span>
                  <el-tag :type="queue.is_active ? 'success' : 'info'" size="small">
                    {{ queue.is_active ? 'Активна' : 'Неактивна' }}
                  </el-tag>
                </div>
                <div class="item-meta">
                  <span class="meta-item">
                    <span class="meta-label">Номер:</span>
                    <span class="meta-value code">{{ queue.extension }}</span>
                  </span>
                  <span class="meta-item">
                    <span class="meta-label">Стратегия:</span>
                    <span class="meta-value">{{ getStrategyLabel(queue.strategy) }}</span>
                  </span>
                  <span class="meta-item">
                    <span class="meta-label">Таймаут:</span>
                    <span class="meta-value">{{ queue.timeout }} сек</span>
                  </span>
                  <span class="meta-item">
                    <span class="meta-label">Макс. ожид.:</span>
                    <span class="meta-value">{{ queue.max_wait_time }} сек</span>
                  </span>
                </div>
              </div>

              <div class="item-actions">
                <el-dropdown @command="(cmd) => handleQueueCommand(cmd, queue)" trigger="click">
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
        </el-tab-pane>

        <!-- Маршруты -->
        <el-tab-pane label="Маршруты" name="routes">
          <div class="tab-actions">
            <el-button type="primary" @click="loadRoutes" size="small" :loading="loading.routes" :icon="Refresh" />
            <el-button type="success" @click="showRouteCreateDialog = true" size="small" :icon="Plus">
              Добавить
            </el-button>
          </div>

          <div v-if="loading.routes" class="loading-container">
            <el-skeleton :rows="4" animated />
          </div>

          <div v-else-if="routes.length === 0" class="empty-container">
            <el-empty description="Нет маршрутов" :image-size="60" />
          </div>

          <div v-else class="items-list">
            <div v-for="route in routes" :key="route.id" class="item-row">
              <div class="item-status">
                <div class="status-indicator" :class="{ active: route.is_active }"></div>
              </div>

              <div class="item-main">
                <div class="item-header">
                  <span class="item-name">{{ route.name }}</span>
                  <el-tag type="warning" size="small" v-if="route.priority > 0">
                    Приоритет: {{ route.priority }}
                  </el-tag>
                  <el-tag :type="route.is_active ? 'success' : 'info'" size="small">
                    {{ route.is_active ? 'Активен' : 'Неактивен' }}
                  </el-tag>
                </div>
                <div class="item-meta">
                  <span class="meta-item" v-if="route.match_pattern">
                    <span class="meta-label">Паттерн:</span>
                    <span class="meta-value code">{{ route.match_pattern }}</span>
                  </span>
                  <span class="meta-item" v-if="route.match_caller">
                    <span class="meta-label">Звонящий:</span>
                    <span class="meta-value code">{{ route.match_caller }}</span>
                  </span>
                  <span class="meta-item">
                    <span class="meta-label">Тип:</span>
                    <span class="meta-value">{{ getRouteTypeLabel(route.route_type) }}</span>
                  </span>
                  <span class="meta-item">
                    <span class="meta-label">Цель:</span>
                    <span class="meta-value code">{{ route.route_target }}</span>
                  </span>
                </div>
              </div>

              <div class="item-actions">
                <el-dropdown @command="(cmd) => handleRouteCommand(cmd, route)" trigger="click">
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
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- Диалог создания IVR меню -->
    <el-dialog v-model="showMenuCreateDialog" title="Создать IVR меню" width="500px">
      <el-form :model="menuForm" label-width="140px" size="default">
        <el-form-item label="Название" required>
          <el-tooltip content="Понятное название для IVR меню" placement="top">
            <el-input v-model="menuForm.name" placeholder="Главное меню" />
          </el-tooltip>
        </el-form-item>
        <el-form-item label="Описание">
          <el-input v-model="menuForm.description" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="Приветствие">
          <el-tooltip content="Мелодия, которая проигрывается при входе в IVR меню" placement="top">
            <el-select
              v-model="menuForm.greeting_audio"
              placeholder="Выберите мелодию"
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
          </el-tooltip>
        </el-form-item>
        <el-form-item label="Таймаут (сек)">
          <el-tooltip content="Время ожидания ввода цифры от звонящего" placement="top">
            <el-input-number v-model="menuForm.timeout" :min="1" :max="30" />
          </el-tooltip>
        </el-form-item>
        <el-form-item label="Макс. попыток">
          <el-tooltip content="Количество попыток ввода перед завершением" placement="top">
            <el-input-number v-model="menuForm.max_retries" :min="1" :max="10" />
          </el-tooltip>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showMenuCreateDialog = false">Отмена</el-button>
        <el-button type="primary" @click="createMenu" :loading="saving">Создать</el-button>
      </template>
    </el-dialog>

    <!-- Диалог редактирования IVR меню -->
    <el-dialog v-model="showMenuEditDialog" title="Редактировать IVR меню" width="500px">
      <el-form :model="menuEditForm" label-width="140px" size="default">
        <el-form-item label="Название">
          <el-input v-model="menuEditForm.name" />
        </el-form-item>
        <el-form-item label="Описание">
          <el-input v-model="menuEditForm.description" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="Приветствие">
          <el-select
            v-model="menuEditForm.greeting_audio"
            placeholder="Выберите мелодию"
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
        <el-form-item label="Таймаут (сек)">
          <el-input-number v-model="menuEditForm.timeout" :min="1" :max="30" />
        </el-form-item>
        <el-form-item label="Макс. попыток">
          <el-input-number v-model="menuEditForm.max_retries" :min="1" :max="10" />
        </el-form-item>
        <el-form-item label="Активность">
          <el-switch v-model="menuEditForm.is_active" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showMenuEditDialog = false">Отмена</el-button>
        <el-button type="primary" @click="updateMenu" :loading="saving">Сохранить</el-button>
      </template>
    </el-dialog>

    <!-- Диалог создания очереди -->
    <el-dialog v-model="showQueueCreateDialog" title="Создать очередь" width="500px">
      <el-form :model="queueForm" label-width="140px" size="default">
        <el-form-item label="Название" required>
          <el-tooltip content="Понятное название очереди" placement="top">
            <el-input v-model="queueForm.name" placeholder="Очередь продаж" />
          </el-tooltip>
        </el-form-item>
        <el-form-item label="Внутр. номер" required>
          <el-tooltip content="Номер для вызова очереди (например, 100)" placement="top">
            <el-input v-model="queueForm.extension" placeholder="100" />
          </el-tooltip>
        </el-form-item>
        <el-form-item label="Стратегия">
          <el-tooltip content="Способ распределения звонков между операторами" placement="top">
            <el-select v-model="queueForm.strategy" style="width: 100%">
              <el-option label="Всем сразу" value="ringall" />
              <el-option label="По очереди" value="rrmemory" />
              <el-option label="По приоритету" value="linear" />
              <el-option label="Случайно" value="random" />
              <el-option label="Наименее занятому" value="fewestcalls" />
            </el-select>
          </el-tooltip>
        </el-form-item>
        <el-form-item label="Таймаут (сек)">
          <el-tooltip content="Время ожидания ответа оператора" placement="top">
            <el-input-number v-model="queueForm.timeout" :min="5" :max="120" />
          </el-tooltip>
        </el-form-item>
        <el-form-item label="Макс. ожид. (сек)">
          <el-tooltip content="Максимальное время ожидания в очереди" placement="top">
            <el-input-number v-model="queueForm.max_wait_time" :min="30" :max="3600" />
          </el-tooltip>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showQueueCreateDialog = false">Отмена</el-button>
        <el-button type="primary" @click="createQueue" :loading="saving">Создать</el-button>
      </template>
    </el-dialog>

    <!-- Диалог редактирования очереди -->
    <el-dialog v-model="showQueueEditDialog" title="Редактировать очередь" width="500px">
      <el-form :model="queueEditForm" label-width="140px" size="default">
        <el-form-item label="Название">
          <el-input v-model="queueEditForm.name" />
        </el-form-item>
        <el-form-item label="Внутр. номер">
          <el-input v-model="queueEditForm.extension" />
        </el-form-item>
        <el-form-item label="Стратегия">
          <el-select v-model="queueEditForm.strategy" style="width: 100%">
            <el-option label="Всем сразу" value="ringall" />
            <el-option label="По очереди" value="rrmemory" />
            <el-option label="По приоритету" value="linear" />
            <el-option label="Случайно" value="random" />
            <el-option label="Наименее занятому" value="fewestcalls" />
          </el-select>
        </el-form-item>
        <el-form-item label="Таймаут (сек)">
          <el-input-number v-model="queueEditForm.timeout" :min="5" :max="120" />
        </el-form-item>
        <el-form-item label="Макс. ожид. (сек)">
          <el-input-number v-model="queueEditForm.max_wait_time" :min="30" :max="3600" />
        </el-form-item>
        <el-form-item label="Активность">
          <el-switch v-model="queueEditForm.is_active" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showQueueEditDialog = false">Отмена</el-button>
        <el-button type="primary" @click="updateQueue" :loading="saving">Сохранить</el-button>
      </template>
    </el-dialog>

    <!-- Диалог создания маршрута -->
    <el-dialog v-model="showRouteCreateDialog" title="Создать маршрут" width="500px">
      <el-form :model="routeForm" label-width="140px" size="default">
        <el-form-item label="Название" required>
          <el-tooltip content="Понятное название маршрута" placement="top">
            <el-input v-model="routeForm.name" placeholder="Маршрут для Москвы" />
          </el-tooltip>
        </el-form-item>
        <el-form-item label="Паттерн номера">
          <el-tooltip content="Регулярное выражение для номера, на который звонят. Пример: ^7495.* для всех московских номеров" placement="top">
            <el-input v-model="routeForm.match_pattern" placeholder="^7495.*" />
          </el-tooltip>
        </el-form-item>
        <el-form-item label="Паттерн звонящего">
          <el-tooltip content="Регулярное выражение для номера звонящего. Пример: ^79.* для всех мобильных" placement="top">
            <el-input v-model="routeForm.match_caller" placeholder="^79.*" />
          </el-tooltip>
        </el-form-item>
        <el-form-item label="Тип маршрута" required>
          <el-tooltip content="Куда направить звонок" placement="top">
            <el-select v-model="routeForm.route_type" style="width: 100%">
              <el-option label="SIP аккаунт" value="sip" />
              <el-option label="Очередь" value="queue" />
              <el-option label="IVR Меню" value="ivr" />
              <el-option label="Номер компании" value="dongle" />
              <el-option label="Внешний номер" value="external" />
            </el-select>
          </el-tooltip>
        </el-form-item>
        <el-form-item label="Цель" required>
          <!-- SIP аккаунт -->
          <el-select v-if="routeForm.route_type === 'sip'" v-model="routeForm.route_target" placeholder="Выберите SIP аккаунт" style="width: 100%">
            <el-option
              v-for="sip in sipAccounts"
              :key="sip.id"
              :label="`${sip.display_name || sip.username} (${sip.extension})`"
              :value="sip.extension"
            />
          </el-select>
          <!-- Очередь -->
          <el-select v-else-if="routeForm.route_type === 'queue'" v-model="routeForm.route_target" placeholder="Выберите очередь" style="width: 100%">
            <el-option
              v-for="queue in queues"
              :key="queue.id"
              :label="`${queue.name} (${queue.extension})`"
              :value="queue.extension"
            />
          </el-select>
          <!-- IVR меню -->
          <el-select v-else-if="routeForm.route_type === 'ivr'" v-model="routeForm.route_target" placeholder="Выберите IVR меню" style="width: 100%">
            <el-option
              v-for="menu in menus"
              :key="menu.id"
              :label="menu.name"
              :value="menu.name"
            />
          </el-select>
          <!-- Номер компании -->
          <el-select v-else-if="routeForm.route_type === 'dongle'" v-model="routeForm.route_target" placeholder="Выберите номер компании" style="width: 100%">
            <el-option
              v-for="dongle in dongles"
              :key="dongle.id"
              :label="`${dongle.phone_number} (${dongle.provider || 'неизвестно'})`"
              :value="dongle.phone_number"
            />
          </el-select>
          <!-- Внешний номер -->
          <el-input v-else v-model="routeForm.route_target" placeholder="+79991234567" />
        </el-form-item>
        <el-form-item label="Приоритет">
          <el-tooltip content="Чем выше число, тем выше приоритет. Маршруты с большим приоритетом обрабатываются первыми" placement="top">
            <el-input-number v-model="routeForm.priority" :min="0" :max="100" />
          </el-tooltip>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showRouteCreateDialog = false">Отмена</el-button>
        <el-button type="primary" @click="createRoute" :loading="saving">Создать</el-button>
      </template>
    </el-dialog>

    <!-- Диалог редактирования маршрута -->
    <el-dialog v-model="showRouteEditDialog" title="Редактировать маршрут" width="500px">
      <el-form :model="routeEditForm" label-width="140px" size="default">
        <el-form-item label="Название">
          <el-input v-model="routeEditForm.name" />
        </el-form-item>
        <el-form-item label="Паттерн номера">
          <el-input v-model="routeEditForm.match_pattern" />
        </el-form-item>
        <el-form-item label="Паттерн звонящего">
          <el-input v-model="routeEditForm.match_caller" />
        </el-form-item>
        <el-form-item label="Тип маршрута">
          <el-select v-model="routeEditForm.route_type" style="width: 100%">
            <el-option label="SIP аккаунт" value="sip" />
            <el-option label="Очередь" value="queue" />
            <el-option label="IVR Меню" value="ivr" />
            <el-option label="Номер компании" value="dongle" />
            <el-option label="Внешний номер" value="external" />
          </el-select>
        </el-form-item>
        <el-form-item label="Цель">
          <!-- SIP аккаунт -->
          <el-select v-if="routeEditForm.route_type === 'sip'" v-model="routeEditForm.route_target" placeholder="Выберите SIP аккаунт" style="width: 100%">
            <el-option
              v-for="sip in sipAccounts"
              :key="sip.id"
              :label="`${sip.display_name || sip.username} (${sip.extension})`"
              :value="sip.extension"
            />
          </el-select>
          <!-- Очередь -->
          <el-select v-else-if="routeEditForm.route_type === 'queue'" v-model="routeEditForm.route_target" placeholder="Выберите очередь" style="width: 100%">
            <el-option
              v-for="queue in queues"
              :key="queue.id"
              :label="`${queue.name} (${queue.extension})`"
              :value="queue.extension"
            />
          </el-select>
          <!-- IVR меню -->
          <el-select v-else-if="routeEditForm.route_type === 'ivr'" v-model="routeEditForm.route_target" placeholder="Выберите IVR меню" style="width: 100%">
            <el-option
              v-for="menu in menus"
              :key="menu.id"
              :label="menu.name"
              :value="menu.name"
            />
          </el-select>
          <!-- Номер компании -->
          <el-select v-else-if="routeEditForm.route_type === 'dongle'" v-model="routeEditForm.route_target" placeholder="Выберите номер компании" style="width: 100%">
            <el-option
              v-for="dongle in dongles"
              :key="dongle.id"
              :label="`${dongle.phone_number} (${dongle.provider || 'неизвестно'})`"
              :value="dongle.phone_number"
            />
          </el-select>
          <!-- Внешний номер -->
          <el-input v-else v-model="routeEditForm.route_target" placeholder="+79991234567" />
        </el-form-item>
        <el-form-item label="Приоритет">
          <el-input-number v-model="routeEditForm.priority" :min="0" :max="100" />
        </el-form-item>
        <el-form-item label="Активность">
          <el-switch v-model="routeEditForm.is_active" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showRouteEditDialog = false">Отмена</el-button>
        <el-button type="primary" @click="updateRoute" :loading="saving">Сохранить</el-button>
      </template>
    </el-dialog>

    <!-- Диалог справки -->
    <el-dialog v-model="showHelpDialog" title="Справка: IVR & Маршрутизация" width="700px">
      <div class="help-content">
        <el-collapse v-model="activeHelpSections" accordion>
          <el-collapse-item name="ivr">
            <template #title>
              <div class="help-title">
                <el-icon><Headset /></el-icon>
                <span>IVR Меню - голосовое меню</span>
              </div>
            </template>
            <div class="help-section">
              <p><strong>Что это?</strong></p>
              <p>IVR меню проигрывает звонящему голосовое приветствие и предлагает нажать цифры на телефоне для выбора действия.</p>

              <p><strong>Пример:</strong></p>
              <p class="help-example">
                "Добро пожаловать в компанию! Нажмите 1 для отдела продаж, 2 для техподдержки, 3 для бухгалтерии"
              </p>

              <p><strong>Как настроить:</strong></p>
              <ol>
                <li>Загрузите аудио-приветствие в разделе "Мелодии"</li>
                <li>Создайте IVR меню и выберите загруженную мелодию</li>
                <li>Настройте таймаут (сколько секунд ждать нажатия цифры)</li>
                <li>Создайте маршруты для каждой цифры (см. раздел "Маршруты")</li>
              </ol>
            </div>
          </el-collapse-item>

          <el-collapse-item name="queues">
            <template #title>
              <div class="help-title">
                <el-icon><UserFilled /></el-icon>
                <span>Очереди - распределение звонков</span>
              </div>
            </template>
            <div class="help-section">
              <p><strong>Что это?</strong></p>
              <p>Очередь позволяет распределять входящие звонки между несколькими операторами по заданной стратегии.</p>

              <p><strong>Стратегии распределения:</strong></p>
              <ul>
                <li><strong>Всем сразу</strong> - звонок поступает одновременно всем операторам</li>
                <li><strong>По очереди</strong> - звонки распределяются по кругу между операторами</li>
                <li><strong>По приоритету</strong> - звонок идёт операторам по порядку (сначала первый, потом второй...)</li>
                <li><strong>Случайно</strong> - операторы выбираются случайным образом</li>
                <li><strong>Наименее занятому</strong> - звонок идёт оператору с наименьшим числом обработанных звонков</li>
              </ul>

              <p><strong>Пример использования:</strong></p>
              <p class="help-example">
                Очередь "Отдел продаж" с номером 100. В неё входят 3 оператора.
                Когда клиент звонит на 100, его звонок распределяется между операторами по выбранной стратегии.
              </p>
            </div>
          </el-collapse-item>

          <el-collapse-item name="routes">
            <template #title>
              <div class="help-title">
                <el-icon><Guide /></el-icon>
                <span>Маршруты - правила направления звонков</span>
              </div>
            </template>
            <div class="help-section">
              <p><strong>Что это?</strong></p>
              <p>Маршруты определяют куда направить входящий звонок на основе условий.</p>

              <p><strong>Входящий звонок - это:</strong></p>
              <div class="help-note-important">
                <div class="note-icon">
                  <el-icon><Phone /></el-icon>
                </div>
                <div class="note-text">
                  <strong>Звонок, который поступает на один из телефонных номеров вашей компании.</strong>
                  <br>
                  Когда клиент звонит на ваш номер, система автоматически проверяет маршруты по порядку приоритета
                  и направляет звонок согласно первому подходящему правилу.
                </div>
              </div>

              <p><strong>Паттерны (регулярные выражения):</strong></p>
              <div class="pattern-examples">
                <div class="pattern-item">
                  <code class="pattern-code">^7495.*</code>
                  <span class="pattern-desc">все номера начинающиеся с 7495 (московские)</span>
                </div>
                <div class="pattern-item">
                  <code class="pattern-code">^79.*</code>
                  <span class="pattern-desc">все мобильные номера России</span>
                </div>
                <div class="pattern-item">
                  <code class="pattern-code">^78.*</code>
                  <span class="pattern-desc">номера начинающиеся с 78</span>
                </div>
                <div class="pattern-item">
                  <code class="pattern-code">.*</code>
                  <span class="pattern-desc">любой номер (используйте для маршрута по умолчанию)</span>
                </div>
              </div>

              <p><strong>Типы маршрутов и цели:</strong></p>
              <ul>
                <li><strong>SIP аккаунт</strong> - переадресация на внутренний номер. Выберите нужный SIP аккаунт из списка</li>
                <li><strong>Очередь</strong> - направить звонок в очередь операторов. Выберите очередь из списка</li>
                <li><strong>IVR Меню</strong> - включить голосовое меню. Выберите IVR меню из списка</li>
                <li><strong>Номер компании</strong> - переадресация на номер компании. Выберите номер из списка доступных</li>
                <li><strong>Внешний номер</strong> - переадресация на внешний телефонный номер. Укажите полный номер вручную</li>
              </ul>

              <p><strong>Приоритет:</strong></p>
              <p>Чем выше число, тем раньше обрабатывается маршрут. Используйте для точной настройки порядка проверки условий.</p>

              <p><strong>Примеры маршрутов:</strong></p>
              <div class="help-example">
                <p><strong>1. Маршрут "Все звонки в главное меню":</strong></p>
                <ul>
                  <li>Паттерн номера: <code>.*</code></li>
                  <li>Тип маршрута: IVR Меню</li>
                  <li>Цель: выберите нужное IVR меню из списка</li>
                  <li>Приоритет: 0</li>
                </ul>

                <p><strong>2. Маршрут "VIP клиенты сразу к менеджеру":</strong></p>
                <ul>
                  <li>Паттерн звонящего: <code>^79991234567$</code></li>
                  <li>Тип маршрута: SIP аккаунт</li>
                  <li>Цель: выберите SIP аккаунт менеджера из списка (например, extension 100)</li>
                  <li>Приоритет: 100</li>
                </ul>
              </div>
            </div>
          </el-collapse-item>

          <el-collapse-item name="scenarios">
            <template #title>
              <div class="help-title">
                <el-icon><Promotion /></el-icon>
                <span>Типичные сценарии настройки</span>
              </div>
            </template>
            <div class="help-section">
              <p><strong>Сценарий 1: Простое голосовое меню</strong></p>
              <ol>
                <li>Создайте очередь "Продажи" (extension: 100)</li>
                <li>Создайте очередь "Поддержка" (extension: 200)</li>
                <li>Загрузите приветствие: "Нажмите 1 для продаж, 2 для поддержки"</li>
                <li>Создайте IVR меню с этим приветствием</li>
                <li>Создайте маршрут: все звонки → IVR меню</li>
              </ol>

              <p><strong>Сценарий 2: Распределение по времени</strong></p>
              <ol>
                <li>Создайте маршрут с высоким приоритетом для рабочих часов → очередь операторов</li>
                <li>Создайте маршрут с низким приоритетом для нерабочего времени → голосовая почта</li>
              </ol>

              <p><strong>Сценарий 3: Фильтрация по регионам</strong></p>
              <ol>
                <li>Маршрут 1: ^7495.* (Москва) → очередь московского офиса</li>
                <li>Маршрут 2: ^7812.* (СПб) → очередь питерского офиса</li>
                <li>Маршрут 3: .* (остальные) → главная очередь</li>
              </ol>
            </div>
          </el-collapse-item>
        </el-collapse>
      </div>
      <template #footer>
        <el-button type="primary" @click="showHelpDialog = false">Понятно</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, onActivated, watch } from 'vue'
import { Refresh, Plus, Edit, Delete, MoreFilled, QuestionFilled, Headset, UserFilled, Guide, Promotion, Phone } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import { useNotifications } from '@/composables/useNotifications'
import apiClient from '@/api/client'

const notifications = useNotifications()

const activeTab = ref('menus')
const showHelpDialog = ref(false)
const activeHelpSections = ref('')

const menus = ref([])
const queues = ref([])
const routes = ref([])
const melodies = ref([])
const dongles = ref([])
const sipAccounts = ref([])
const loadingMelodies = ref(false)

const loading = ref({
  menus: false,
  queues: false,
  routes: false
})
const saving = ref(false)

const currentMenu = ref(null)
const currentQueue = ref(null)
const currentRoute = ref(null)

const showMenuCreateDialog = ref(false)
const showMenuEditDialog = ref(false)
const showQueueCreateDialog = ref(false)
const showQueueEditDialog = ref(false)
const showRouteCreateDialog = ref(false)
const showRouteEditDialog = ref(false)

const menuForm = ref({
  name: '',
  description: '',
  greeting_audio: '',
  timeout: 5,
  max_retries: 3
})

const menuEditForm = ref({
  name: '',
  description: '',
  greeting_audio: '',
  timeout: 5,
  max_retries: 3,
  is_active: true
})

const queueForm = ref({
  name: '',
  extension: '',
  strategy: 'ringall',
  timeout: 30,
  max_wait_time: 300
})

const queueEditForm = ref({
  name: '',
  extension: '',
  strategy: 'ringall',
  timeout: 30,
  max_wait_time: 300,
  is_active: true
})

const routeForm = ref({
  name: '',
  match_pattern: '',
  match_caller: '',
  route_type: 'sip',
  route_target: '',
  priority: 0
})

const routeEditForm = ref({
  name: '',
  match_pattern: '',
  match_caller: '',
  route_type: 'sip',
  route_target: '',
  priority: 0,
  is_active: true
})

const getStrategyLabel = (strategy) => {
  const labels = {
    'ringall': 'Всем сразу',
    'rrmemory': 'По очереди',
    'linear': 'По приоритету',
    'random': 'Случайно',
    'fewestcalls': 'Наименее занятому'
  }
  return labels[strategy] || strategy
}

const getRouteTypeLabel = (type) => {
  const labels = {
    'sip': 'SIP',
    'queue': 'Очередь',
    'ivr': 'IVR',
    'dongle': 'Номер компании',
    'external': 'Внешний'
  }
  return labels[type] || type
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

const loadDongles = async () => {
  try {
    const response = await apiClient.get('/dongles', {
      params: {
        is_active: true,
        _t: Date.now()
      },
      headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
    })
    dongles.value = response.data.filter(d => d.phone_number)
  } catch (error) {
    console.error('Ошибка загрузки донглов:', error)
  }
}

const loadSIPAccounts = async () => {
  try {
    const response = await apiClient.get('/sip-endpoints', {
      params: {
        is_active: true,
        _t: Date.now()
      },
      headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
    })
    sipAccounts.value = response.data
  } catch (error) {
    console.error('Ошибка загрузки SIP аккаунтов:', error)
  }
}

// Command handlers
const handleMenuCommand = (cmd, menu) => {
  if (cmd === 'edit') openMenuEditDialog(menu)
  else if (cmd === 'delete') deleteMenu(menu)
}

const handleQueueCommand = (cmd, queue) => {
  if (cmd === 'edit') openQueueEditDialog(queue)
  else if (cmd === 'delete') deleteQueue(queue)
}

const handleRouteCommand = (cmd, route) => {
  if (cmd === 'edit') openRouteEditDialog(route)
  else if (cmd === 'delete') deleteRoute(route)
}

// IVR Menus
const loadMenus = async () => {
  try {
    loading.value.menus = true
    const response = await apiClient.get('/ivr/menus', {
      params: { _t: Date.now() },
      headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
    })
    menus.value = response.data
  } catch (error) {
    console.error('Ошибка загрузки IVR меню:', error)
    notifications.error('Ошибка загрузки', 'Не удалось загрузить IVR меню')
  } finally {
    loading.value.menus = false
  }
}

const createMenu = async () => {
  if (!menuForm.value.name) {
    notifications.warning('Предупреждение', 'Укажите название меню')
    return
  }
  try {
    saving.value = true
    await apiClient.post('/ivr/menus', menuForm.value)
    notifications.success('Успешно', 'IVR меню создано')
    showMenuCreateDialog.value = false
    menuForm.value = { name: '', description: '', greeting_audio: '', timeout: 5, max_retries: 3 }
    await loadMenus()
  } catch (error) {
    console.error('Ошибка создания меню:', error)
    notifications.error('Ошибка создания', error.response?.data?.detail || 'Не удалось создать меню')
  } finally {
    saving.value = false
  }
}

const openMenuEditDialog = (menu) => {
  currentMenu.value = menu
  menuEditForm.value = {
    name: menu.name || '',
    description: menu.description || '',
    greeting_audio: menu.greeting_audio || '',
    timeout: menu.timeout || 5,
    max_retries: menu.max_retries || 3,
    is_active: menu.is_active
  }
  showMenuEditDialog.value = true
}

const updateMenu = async () => {
  try {
    saving.value = true
    await apiClient.put(`/ivr/menus/${currentMenu.value.id}`, menuEditForm.value)
    notifications.success('Успешно', 'IVR меню обновлено')
    showMenuEditDialog.value = false
    await loadMenus()
  } catch (error) {
    console.error('Ошибка обновления меню:', error)
    notifications.error('Ошибка обновления', error.response?.data?.detail || 'Не удалось обновить меню')
  } finally {
    saving.value = false
  }
}

const deleteMenu = async (menu) => {
  try {
    await ElMessageBox.confirm(`Удалить IVR меню "${menu.name}"?`, 'Подтверждение', {
      confirmButtonText: 'Удалить',
      cancelButtonText: 'Отмена',
      type: 'warning'
    })
    await apiClient.delete(`/ivr/menus/${menu.id}`)
    notifications.success('Успешно', 'IVR меню удалено')
    await loadMenus()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Ошибка удаления меню:', error)
      notifications.error('Ошибка удаления', 'Не удалось удалить меню')
    }
  }
}

// Queues
const loadQueues = async () => {
  try {
    loading.value.queues = true
    const response = await apiClient.get('/ivr/queues', {
      params: { _t: Date.now() },
      headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
    })
    queues.value = response.data
  } catch (error) {
    console.error('Ошибка загрузки очередей:', error)
    notifications.error('Ошибка загрузки', 'Не удалось загрузить очереди')
  } finally {
    loading.value.queues = false
  }
}

const createQueue = async () => {
  if (!queueForm.value.name || !queueForm.value.extension) {
    notifications.warning('Предупреждение', 'Заполните обязательные поля')
    return
  }
  try {
    saving.value = true
    await apiClient.post('/ivr/queues', queueForm.value)
    notifications.success('Успешно', 'Очередь создана')
    showQueueCreateDialog.value = false
    queueForm.value = { name: '', extension: '', strategy: 'ringall', timeout: 30, max_wait_time: 300 }
    await loadQueues()
  } catch (error) {
    console.error('Ошибка создания очереди:', error)
    notifications.error('Ошибка создания', error.response?.data?.detail || 'Не удалось создать очередь')
  } finally {
    saving.value = false
  }
}

const openQueueEditDialog = (queue) => {
  currentQueue.value = queue
  queueEditForm.value = {
    name: queue.name || '',
    extension: queue.extension || '',
    strategy: queue.strategy || 'ringall',
    timeout: queue.timeout || 30,
    max_wait_time: queue.max_wait_time || 300,
    is_active: queue.is_active
  }
  showQueueEditDialog.value = true
}

const updateQueue = async () => {
  try {
    saving.value = true
    await apiClient.put(`/ivr/queues/${currentQueue.value.id}`, queueEditForm.value)
    notifications.success('Успешно', 'Очередь обновлена')
    showQueueEditDialog.value = false
    await loadQueues()
  } catch (error) {
    console.error('Ошибка обновления очереди:', error)
    notifications.error('Ошибка обновления', error.response?.data?.detail || 'Не удалось обновить очередь')
  } finally {
    saving.value = false
  }
}

const deleteQueue = async (queue) => {
  try {
    await ElMessageBox.confirm(`Удалить очередь "${queue.name}"?`, 'Подтверждение', {
      confirmButtonText: 'Удалить',
      cancelButtonText: 'Отмена',
      type: 'warning'
    })
    await apiClient.delete(`/ivr/queues/${queue.id}`)
    notifications.success('Успешно', 'Очередь удалена')
    await loadQueues()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Ошибка удаления очереди:', error)
      notifications.error('Ошибка удаления', 'Не удалось удалить очередь')
    }
  }
}

// Routes
const loadRoutes = async () => {
  try {
    loading.value.routes = true
    const response = await apiClient.get('/ivr/routes', {
      params: { _t: Date.now() },
      headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
    })
    routes.value = response.data
  } catch (error) {
    console.error('Ошибка загрузки маршрутов:', error)
    notifications.error('Ошибка загрузки', 'Не удалось загрузить маршруты')
  } finally {
    loading.value.routes = false
  }
}

const createRoute = async () => {
  if (!routeForm.value.name || !routeForm.value.route_type || !routeForm.value.route_target) {
    notifications.warning('Предупреждение', 'Заполните обязательные поля')
    return
  }
  try {
    saving.value = true
    await apiClient.post('/ivr/routes', routeForm.value)
    notifications.success('Успешно', 'Маршрут создан')
    showRouteCreateDialog.value = false
    routeForm.value = { name: '', match_pattern: '', match_caller: '', route_type: 'sip', route_target: '', priority: 0 }
    await loadRoutes()
  } catch (error) {
    console.error('Ошибка создания маршрута:', error)
    notifications.error('Ошибка создания', error.response?.data?.detail || 'Не удалось создать маршрут')
  } finally {
    saving.value = false
  }
}

const openRouteEditDialog = (route) => {
  currentRoute.value = route
  routeEditForm.value = {
    name: route.name || '',
    match_pattern: route.match_pattern || '',
    match_caller: route.match_caller || '',
    route_type: route.route_type || 'sip',
    route_target: route.route_target || '',
    priority: route.priority || 0,
    is_active: route.is_active
  }
  showRouteEditDialog.value = true
}

const updateRoute = async () => {
  try {
    saving.value = true
    await apiClient.put(`/ivr/routes/${currentRoute.value.id}`, routeEditForm.value)
    notifications.success('Успешно', 'Маршрут обновлён')
    showRouteEditDialog.value = false
    await loadRoutes()
  } catch (error) {
    console.error('Ошибка обновления маршрута:', error)
    notifications.error('Ошибка обновления', error.response?.data?.detail || 'Не удалось обновить маршрут')
  } finally {
    saving.value = false
  }
}

const deleteRoute = async (route) => {
  try {
    await ElMessageBox.confirm(`Удалить маршрут "${route.name}"?`, 'Подтверждение', {
      confirmButtonText: 'Удалить',
      cancelButtonText: 'Отмена',
      type: 'warning'
    })
    await apiClient.delete(`/ivr/routes/${route.id}`)
    notifications.success('Успешно', 'Маршрут удалён')
    await loadRoutes()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Ошибка удаления маршрута:', error)
      notifications.error('Ошибка удаления', 'Не удалось удалить маршрут')
    }
  }
}

watch(activeTab, (newTab) => {
  if (newTab === 'menus' && menus.value.length === 0) loadMenus()
  if (newTab === 'queues' && queues.value.length === 0) loadQueues()
  if (newTab === 'routes' && routes.value.length === 0) loadRoutes()
})

onMounted(() => {
  loadMenus()
  loadMelodies()
  loadDongles()
  loadSIPAccounts()
})

onActivated(() => {
  if (activeTab.value === 'menus') loadMenus()
  else if (activeTab.value === 'queues') loadQueues()
  else if (activeTab.value === 'routes') loadRoutes()
})
</script>

<style scoped>
.ivr-view {
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
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
}

.compact-tabs :deep(.el-tabs__header) {
  margin: 0;
  padding: 0 12px;
}

.compact-tabs :deep(.el-tabs__content) {
  padding: 12px;
}

.tab-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-bottom: 12px;
}

.loading-container, .empty-container {
  padding: 24px 0;
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  transition: background-color 0.15s;
}

.item-row:hover {
  background: var(--el-fill-color-light);
}

.item-status {
  flex-shrink: 0;
  padding-top: 4px;
}

.status-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--el-color-info-light-5);
}

.status-indicator.active {
  background: var(--el-color-success);
  box-shadow: 0 0 6px var(--el-color-success);
}

.item-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.item-name {
  font-weight: 600;
  font-size: 13px;
  color: var(--el-text-color-primary);
}

.item-details {
  margin-top: 2px;
}

.item-description {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  font-size: 12px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.meta-label {
  color: var(--el-text-color-secondary);
}

.meta-value {
  color: var(--el-text-color-regular);
}

.meta-value.code {
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  background: var(--el-fill-color-lighter);
  padding: 1px 6px;
  border-radius: 3px;
}

.item-actions {
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .ivr-view {
    padding: 8px;
  }

  .item-row {
    flex-wrap: wrap;
    gap: 8px;
  }

  .item-main {
    flex: 1 1 calc(100% - 30px);
  }

  .item-meta {
    gap: 8px;
  }

  .item-actions {
    flex: 1 1 100%;
    display: flex;
    justify-content: flex-end;
  }
}

.help-content {
  font-size: 14px;
  line-height: 1.6;
}

.help-section {
  padding: 4px 0;
}

.help-section p {
  margin: 8px 0;
}

.help-section ul,
.help-section ol {
  margin: 8px 0;
  padding-left: 24px;
}

.help-section li {
  margin: 4px 0;
}

.help-section code {
  background: var(--el-fill-color-lighter);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 13px;
  color: var(--el-color-primary);
}

.help-example {
  background: var(--el-fill-color-light);
  padding: 12px;
  border-radius: 6px;
  border-left: 3px solid var(--el-color-primary);
  margin: 8px 0;
}

.help-example code {
  background: var(--el-fill-color);
}

.help-content :deep(.el-collapse-item__header) {
  font-weight: 500;
  font-size: 14px;
}

.help-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.help-title .el-icon {
  font-size: 18px;
  color: var(--el-color-primary);
}

.help-note {
  background: var(--el-color-info-light-9);
  border-left: 3px solid var(--el-color-info);
  padding: 10px 12px;
  margin: 8px 0;
  border-radius: 4px;
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.help-note-important {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  background: #1a1a1a;
  border: 3px solid var(--el-color-primary);
  border-radius: 12px;
  padding: 20px;
  margin: 16px 0;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.note-icon {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--el-color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}

.note-icon .el-icon {
  font-size: 28px;
  color: #fff;
}

.note-text {
  flex: 1;
  font-size: 15px;
  line-height: 1.8;
  color: #ffffff;
}

.note-text strong {
  font-size: 16px;
  color: #ffffff;
  display: inline;
}

.pattern-examples {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 12px 0;
  padding: 12px;
  background: var(--el-fill-color-light);
  border-radius: 8px;
}

.pattern-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  background: var(--el-fill-color);
  border-radius: 8px;
  border-left: 4px solid var(--el-color-primary);
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  transition: all 0.2s;
}

.pattern-item:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
  transform: translateX(4px);
}

.pattern-code {
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #409eff 0%, #79bbff 100%);
  padding: 8px 16px;
  border-radius: 6px;
  min-width: 120px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.4);
  letter-spacing: 0.5px;
}

.pattern-desc {
  font-size: 14px;
  color: var(--el-text-color-regular);
  font-weight: 500;
  flex: 1;
}
</style>