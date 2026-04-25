# Техническое задание: Модуль реального времени (WebSocket) для отображения прогресса зарядки

**Версия документа:** 1.0  
**Дата:** 2026-04-25  
**Статус:** ✅ Утверждено к реализации  
**Область:** Real-time streaming от внешнего источника → NestJS → Frontend (Joomla)

---

## 📋 Содержание

1. [Обзор и цели](#-обзор-и-цели)
2. [Архитектурное решение](#-архитектурное-решение)
3. [Поток данных (Data Flow)](#-поток-данных-data-flow)
4. [Компоненты NestJS](#-компоненты-nestjs)
5. [Интеграция с Joomla (Frontend)](#-интеграция-с-joomla-frontend)
6. [Безопасность и авторизация](#-безопасность-и-авторизация)
7. [Бюджет задержек и производительность](#-бюджет-задержек-и-производительность)
8. [План реализации](#-план-реализации)
9. [Критерии приёмки](#-критерии-приёмки)

---

## 🎯 Обзор и цели

### Цель
Реализовать подсистему реального времени для отображения прогресса зарядки электромобиля конечным пользователям:

| ✅ Входит в область | ❌ Не входит в область |
|---------------------|------------------------|
| Приём стрима от внешнего сервера (имитатор/OCPP) в NestJS | Управление зарядной станцией (команды старт/стоп) |
| Обработка, валидация и расчёт метрик (стоимость, ETA) | Операторский интерфейс (Citrine Operator UI) |
| Трансляция данных в браузер пользователя через WebSocket | Прямое соединение внешний-сервер → Joomla |
| Отображение прогресс-бара и метрик в Joomla-странице | Хранение сырых OCPP-логов (только агрегированные данные) |

### Нефункциональные требования
| Параметр | Значение |
|----------|----------|
| Задержка от события до отображения (end-to-end) | ≤ 100 мс (95-й перцентиль) |
| Частота обновления UI | 1–5 секунд (настраивается) |
| Поддержка одновременных сессий | ≥ 1000 подключений на узел NestJS |
| Доступность стриминга | ≥ 99.9% (с авто-реконнектом) |

---

## 🏗 Архитектурное решение

### Ответ на ключевой вопрос: Внешний сервер → Joomla напрямую или через NestJS?

**Рекомендация: Только через NestJS** ✅

| Критерий | Прямое подключение к Joomla | Через NestJS (рекомендуется) |
|----------|----------------------------|------------------------------|
| **Задержка** | ~10-30 мс (на 1 хоп меньше) | ~15-35 мс (+1-5 мс на обработку) |
| **Масштабируемость** | ❌ PHP/FCGI не предназначен для долгоживущих WS-соединений | ✅ NestJS + Socket.IO/WS оптимизирован для real-time |
| **Бизнес-логика** | ❌ Дублирование расчётов (стоимость, ETA) в PHP | ✅ Единая точка расчётов в NestJS |
| **Безопасность** | ❌ Joomla должна принимать соединения от внешнего сервера (расширяет поверхность атаки) | ✅ NestJS валидирует и фильтрует данные перед трансляцией |
| **Гибкость** | ❌ Сложно добавить мобильное приложение или админ-панель позже | ✅ Единый источник данных для любых клиентов |
| **Отказоустойчивость** | ❌ Сбой Joomla = потеря стрима для пользователя | ✅ Кэширование в Redis, буферизация, реплей при реконнекте |

> 📌 **Вывод**: Дополнительные 1–5 мс задержки при использовании NestJS **незаметны для пользователя** (прогресс-бар обновляется раз в 1–5 секунд), но дают критические преимущества в надёжности, безопасности и поддерживаемости.

### Схема архитектуры

```mermaid
graph LR
    subgraph External["🔌 Внешняя инфраструктура"]
        SIM[Симулятор зарядки / OCPP Backend]
    end
    
    subgraph Platform["🟢 Платформа (NestJS)"]
        direction TB
        
        Ingest[📥 Ingest Gateway<br/>(WebSocket/HTTP)]
        Process[⚙️ Processing Service<br/>Validator + Calculator]
        Cache[(🗄️ Redis Cache<br/>real-time state)]
        Broadcast[📡 Broadcast Gateway<br/>(WebSocket to Browser)]
        Persister[💾 Async Persister<br/>(PostgreSQL)]
        
        Ingest --> Process
        Process --> Cache
        Process --> Persister
        Cache --> Broadcast
    end
    
    subgraph Frontend["🟡 Пользовательский интерфейс"]
        Joomla[Joomla CMS Page]
        Widget[JS Widget in Browser]
        User[👤 End User]
    end
    
    SIM -->|OCPP/JSON Stream| Ingest
    Broadcast -->|WebSocket: charging:progress| Widget
    Joomla -.->|Embeds widget + JWT| Widget
    Widget -->|Renders DOM| User
    
    style Ingest fill:#88ee88,stroke:#333
    style Broadcast fill:#88ee88,stroke:#333
    style Cache fill:#ffcc88,stroke:#333
```

---

## 🔄 Поток данных (Data Flow)

### 1. Ingest: Приём данных от внешнего источника

**Входной формат (пример, на основе симулятора):**
```json
{
  "sessionId": "charge_abc123",
  "connectorId": 1,
  "meterValue": 45.2,
  "power": 7.4,
  "voltage": 230,
  "current": 32,
  "timestamp": "2026-04-25T10:30:00Z",
  "status": "Charging"
}
```

**Требования к Ingest Gateway:**
- [ ] Поддержка WebSocket и/или HTTP POST (для гибкости интеграции)
- [ ] Аутентификация внешнего источника:
  - API-ключ в заголовке `X-External-Api-Key`
  - Или IP-белый список (если у источника статический IP)
- [ ] Валидация схемы (Zod/class-validator): отклонение некорректных сообщений
- [ ] Идемпотентность: повторные сообщения с тем же `timestamp` + `sessionId` игнорируются

### 2. Processing: Обработка и обогащение данных

**Расчёт пользовательских метрик:**
```ts
// Пример расчёта в ChargingProcessingService
calculateUserMetrics(raw: ChargingRawInput, userTariff: Tariff): ChargingUserOutput {
  const progress = Math.min(100, (raw.meterValue / TARGET_KWH) * 100);
  const cost = raw.meterValue * userTariff.pricePerKwh;
  const etaMinutes = raw.power > 0 
    ? Math.ceil((TARGET_KWH - raw.meterValue) / raw.power * 60)
    : null;
  
  return {
    sessionId: raw.sessionId,
    progress: Math.round(progress),
    kWh: raw.meterValue,
    cost: Number(cost.toFixed(2)),
    currency: userTariff.currency,
    etaMinutes,
    status: this.mapStatus(raw.status), // "charging" | "finished" | "error"
    updatedAt: new Date()
  };
}
```

**Требования:**
- [ ] Валидация: отбрасывать сообщения с аномальными значениями (отрицательная мощность и т.п.)
- [ ] Расчёт стоимости на основе тарифа пользователя (загрузка из БД/кэша)
- [ ] Расчёт оставшегося времени (ETA) на основе текущей мощности и целевой ёмкости
- [ ] Маппинг технических статусов в пользовательские строки (с поддержкой i18n)

### 3. Cache & Broadcast: Реальное время для фронтенда

**Структура данных в Redis:**
```
Key: charging:session:{sessionId}
Value: JSON.stringify(ChargingUserOutput)
TTL: 24h (или до завершения сессии + буфер)

Pub/Sub Channel: charging:updates
Payload: ChargingUserOutput + { eventType: 'progress' | 'finished' | 'error' }
```

**Требования к Broadcast Gateway:**
- [ ] Поддержка комнат (rooms): `charging:{sessionId}` для публичных сессий, `user:{joomlaUserId}` для приватных
- [ ] Авто-отписка при дисконнекте клиента
- [ ] Поддержка реконнекта с получением последнего известного состояния (из Redis)
- [ ] Rate limiting: не чаще 1 сообщения в 500 мс на одно подключение (защита от шторма обновлений)

### 4. Persistence: Асинхронное сохранение в БД

**Важно**: Не блокировать real-time поток ожиданием записи в БД!

```ts
// В Processing Service
async processAndBroadcast(raw: ChargingRawInput) {
  const userOutput = this.calculateUserMetrics(raw);
  
  // 1. Быстро: обновить кэш и отправить в стрим
  await this.redis.setex(`charging:session:${raw.sessionId}`, 86400, JSON.stringify(userOutput));
  this.eventBus.publish('charging:updates', userOutput);
  
  // 2. Асинхронно: сохранить в БД для истории (не ждём завершения!)
  this.persistenceQueue.add('save-charging-record', { ...userOutput, raw });
}
```

**Требования:**
- [ ] Асинхронная очередь (Bull + Redis) для записи в PostgreSQL
- [ ] Retry-логика при временных сбоях БД
- [ ] Идемпотентная запись (UPSERT по `sessionId` + `timestamp`)

---

## 🧩 Компоненты NestJS

### 1. `ChargingIngestGateway` (приём от внешнего источника)

```ts
// src/modules/charging/gateways/charging-ingest.gateway.ts
@WebSocketGateway({ namespace: 'ingest', cors: true })
export class ChargingIngestGateway implements OnGatewayConnection {
  constructor(
    private readonly processingService: ChargingProcessingService,
    private readonly authGuard: ExternalApiAuthGuard
  ) {}

  @UseGuards(ExternalApiAuthGuard)
  @SubscribeMessage('charging:event')
  async handleEvent(client: Socket, payload: ChargingRawInputDto) {
    // Валидация уже выполнена в DTO + guard
    await this.processingService.processAndBroadcast(payload);
    return { status: 'ok' };
  }
}
```

### 2. `ChargingProcessingService` (бизнес-логика)

```ts
// src/modules/charging/services/charging.processing.service.ts
@Injectable()
export class ChargingProcessingService {
  constructor(
    private readonly redis: Redis,
    private readonly eventBus: EventBus,
    private readonly tariffService: TariffService,
    @InjectQueue('charging-persistence') private readonly persistenceQueue: Queue
  ) {}

  async processAndBroadcast(raw: ChargingRawInput): Promise<void> {
    // 1. Загрузка тарифа пользователя (кэшируется)
    const tariff = await this.tariffService.getUserTariff(raw.userId);
    
    // 2. Расчёт метрик
    const userOutput = this.calculateUserMetrics(raw, tariff);
    
    // 3. Обновление кэша (быстро)
    await this.redis.setex(
      `charging:session:${raw.sessionId}`,
      86400,
      JSON.stringify(userOutput)
    );
    
    // 4. Публикация в стрим (мгновенно)
    this.eventBus.publish('charging:updates', {
      ...userOutput,
      eventType: this.determineEventType(raw.status)
    });
    
    // 5. Асинхронная запись в БД (не блокирует)
    await this.persistenceQueue.add('save-charging-record', {
      ...userOutput,
      raw,
      processedAt: new Date()
    });
  }
}
```

### 3. `ChargingBroadcastGateway` (трансляция в браузер)

```ts
// src/modules/charging/gateways/charging-broadcast.gateway.ts
@WebSocketGateway({ namespace: 'stream', cors: true })
export class ChargingBroadcastGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  async handleConnection(client: Socket) {
    // Валидация JWT от Joomla (см. раздел безопасности)
    const { sessionId, userId } = await this.validateFrontendToken(client.handshake.auth.token);
    
    // Подписка на комнату сессии
    client.join(`charging:${sessionId}`);
    client.data = { sessionId, userId };
    
    // Отправка последнего известного состояния при подключении
    const lastState = await this.redis.get(`charging:session:${sessionId}`);
    if (lastState) {
      client.emit('charging:state', JSON.parse(lastState));
    }
  }

  @SubscribeMessage('charging:subscribe')
  handleSubscribe(client: Socket, sessionId: string) {
    // Дополнительная проверка прав: пользователь имеет доступ к этой сессии
    if (!this.authService.hasAccess(client.data.userId, sessionId)) {
      client.emit('error', { code: 'FORBIDDEN', message: 'Access denied' });
      return;
    }
    client.join(`charging:${sessionId}`);
  }
}
```

---

## 🟡 Интеграция с Joomla (Frontend)

### Роль Joomla: только рендеринг страницы и внедрение виджета

**Не делать в Joomla:**
- ❌ Обработку WebSocket-соединений
- ❌ Расчёт стоимости или бизнес-логики
- ❌ Валидацию данных от внешнего источника

**Делать в Joomla:**
- ✅ Аутентификация пользователя (штатная система Joomla)
- ✅ Генерация короткоживущего JWT для подключения к NestJS (через отдельный плагин `plg_system_userconnect_ws`)
- ✅ Внедрение JS-виджета в шаблон страницы
- ✅ Передача конфигурации виджету (sessionId, wsUrl, token)

### JS-виджет: спецификация

```js
// charging-widget.js — лёгкий модуль без зависимостей
class ChargingWidget {
  constructor({ sessionId, wsUrl, token, onUpdate, onFinished, onError }) {
    this.sessionId = sessionId;
    this.wsUrl = wsUrl;
    this.token = token;
    this.callbacks = { onUpdate, onFinished, onError };
    this.socket = null;
    this.reconnectAttempts = 0;
  }

  connect() {
    this.socket = io(this.wsUrl, {
      path: '/stream',
      auth: { token: this.token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    this.socket.on('connect', () => {
      this.reconnectAttempts = 0;
      this.socket.emit('charging:subscribe', this.sessionId);
    });

    this.socket.on('charging:state', (data) => this._handleUpdate(data));
    this.socket.on('charging:progress', (data) => this._handleUpdate(data));
    this.socket.on('charging:finished', (data) => {
      this._handleUpdate(data);
      this.callbacks.onFinished?.(data);
    });
    this.socket.on('error', (err) => this.callbacks.onError?.(err));
    this.socket.on('connect_error', () => this._handleReconnect());
  }

  _handleUpdate(data) {
    // Обновление прогресс-бара и метрик в DOM
    const progressEl = document.getElementById(`charging-progress-${this.sessionId}`);
    const costEl = document.getElementById(`charging-cost-${this.sessionId}`);
    const etaEl = document.getElementById(`charging-eta-${this.sessionId}`);
    
    if (progressEl) progressEl.style.width = `${data.progress}%`;
    if (costEl) costEl.textContent = `${data.cost} ${data.currency}`;
    if (etaEl && data.etaMinutes !== null) etaEl.textContent = `~${data.etaMinutes} мин`;
    
    this.callbacks.onUpdate?.(data);
  }

  _handleReconnect() {
    if (this.reconnectAttempts < 5) {
      this.reconnectAttempts++;
      setTimeout(() => this.connect(), 1000 * this.reconnectAttempts);
    } else {
      this.callbacks.onError?.({ message: 'Не удалось подключиться к серверу' });
    }
  }

  disconnect() {
    if (this.socket) this.socket.disconnect();
  }
}

// Экспорт для использования в Joomla-шаблоне
window.ChargingWidget = ChargingWidget;
```

### Внедрение в Joomla-шаблон

```php
<?php
// tmpl/charging.php
defined('_JEXEC') or die;

use Joomla\CMS\Factory;
use Joomla\Plugin\System\UserConnectWs\Services\TokenService;

/** @var TokenService $wsTokenService */
/** @var string $chargingSessionId */
/** @var int $joomlaUserId */

$token = $wsTokenService->generateChargingToken($joomlaUserId, $chargingSessionId);
$wsUrl = htmlspecialchars($this->params->get('ws_url', 'wss://api.example.com/stream'));
?>

<div class="charging-widget" data-session="<?= $chargingSessionId ?>">
  <div class="progress-container">
    <div class="progress-bar" id="charging-progress-<?= $chargingSessionId ?>" style="width: 0%"></div>
  </div>
  <div class="metrics">
    <span>Стоимость: <strong id="charging-cost-<?= $chargingSessionId ?>">0.00 EUR</strong></span>
    <span>Осталось: <strong id="charging-eta-<?= $chargingSessionId ?>">—</strong></span>
  </div>
</div>

<script src="/media/plg_userconnectws/charging-widget.min.js"></script>
<script>
document.addEventListener('DOMContentLoaded', function() {
  const widget = new ChargingWidget({
    sessionId: '<?= $chargingSessionId ?>',
    wsUrl: '<?= $wsUrl ?>',
    token: '<?= $token ?>',
    onUpdate: (data) => console.log('Progress:', data.progress + '%'),
    onFinished: (data) => {
      document.querySelector('.charging-widget').classList.add('finished');
      alert('Зарядка завершена! Итоговая стоимость: ' + data.cost + ' ' + data.currency);
    },
    onError: (err) => console.error('Widget error:', err)
  });
  
  widget.connect();
  
  // Очистка при уходе со страницы
  window.addEventListener('beforeunload', () => widget.disconnect());
});
</script>
```

---

## 🔐 Безопасность и авторизация

### 1. Аутентификация внешнего источника (Ingest)
```ts
// ExternalApiAuthGuard
canActivate(context: ExecutionContext): boolean {
  const request = context.switchToHttp().getRequest();
  const apiKey = request.headers['x-external-api-key'];
  
  // Проверка в БД/кэше
  const source = this.externalSources.find(s => s.apiKey === apiKey);
  if (!source || !source.isActive) return false;
  
  // Опционально: проверка IP
  if (source.allowedIps?.length && !source.allowedIps.includes(request.ip)) {
    return false;
  }
  
  request.externalSource = source; // для логирования
  return true;
}
```

### 2. Авторизация пользователя (Broadcast)
- Joomla генерирует JWT с claims:
  ```json
  {
    "sub": "joomlaUserId:123",
    "chargingSessionId": "charge_abc123",
    "aud": "charging-frontend",
    "iss": "joomla-userconnect-ws",
    "exp": 1714051500
  }
  ```
- NestJS проверяет:
  - Подпись токена (общий секрет)
  - Срок действия (`exp`)
  - Соответствие `chargingSessionId` правам пользователя (запрос в БД: принадлежит ли сессия этому пользователю?)

### 3. Изоляция данных
- Пользователь не может подписаться на чужую сессию: проверка `userId` ↔ `sessionId` при `charging:subscribe`
- Внешний источник не может отправить данные в несуществующую сессию: валидация `sessionId` в БД

### 4. Защита от злоупотреблений
- Rate limiting на ingest: ≤ 10 сообщений/сек на источник
- Rate limiting на broadcast: ≤ 2 сообщения/сек на подключение (debounce на стороне сервера)
- Валидация диапазона значений: `0 ≤ progress ≤ 100`, `power ≥ 0` и т.д.

---

## ⏱ Бюджет задержек и производительность

| Этап | Типичная задержка | Примечание |
|------|------------------|------------|
| Внешний источник → NestJS (сеть) | 1–10 мс | Зависит от размещения |
| Валидация + расчёт метрик | < 1 мс | В памяти, простые операции |
| Запись в Redis | < 1 мс | Локальный Redis или same-DC |
| Публикация в WebSocket | < 1 мс | Socket.IO оптимизирован |
| Доставка до браузера (сеть) | 1–10 мс | Зависит от пользователя |
| Обновление DOM в браузере | < 10 мс | Простая манипуляция стилями |
| **Итого (95-й перцентиль)** | **~15–35 мс** | **Незаметно для пользователя** |

> 📌 **Важно**: Прогресс-бар обновляется раз в 1–5 секунд, поэтому задержка < 100 мс считается "реальным временем" для данного сценария.

### Масштабирование
- **Горизонтальное масштабирование NestJS**: несколько инстансов + Redis Pub/Sub для синхронизации комнат между узлами
- **Redis кластер**: для кэша и очередей при >10k одновременных подключений
- **Load balancer**: распределение WebSocket-подключений с поддержкой sticky sessions (если не используется Redis adapter для Socket.IO)

---

## 🚀 План реализации

### Этап 1: Ingest + Processing (неделя 1-2)
- [ ] Создать `ChargingIngestGateway` с аутентификацией внешнего источника
- [ ] Реализовать DTO и валидацию входящих сообщений
- [ ] Создать `ChargingProcessingService` с расчётом метрик
- [ ] Настроить Redis для кэширования состояния сессий
- [ ] Протестировать с симулятором зарядки

### Этап 2: Broadcast + Frontend (неделя 3)
- [ ] Создать `ChargingBroadcastGateway` с комнатами и авторизацией
- [ ] Реализовать генерацию JWT в отдельном плагине `plg_system_userconnect_ws`
- [ ] Создать JS-виджет `charging-widget.js` (без зависимостей)
- [ ] Интегрировать виджет в Joomla-шаблон
- [ ] Протестировать end-to-end: симулятор → NestJS → браузер

### Этап 3: Устойчивость и мониторинг (неделя 4)
- [ ] Добавить асинхронную очередь для записи в БД (Bull)
- [ ] Реализовать реконнект-логику на клиенте и сервере
- [ ] Настроить метрики: количество подключений, задержка, ошибки (Prometheus)
- [ ] Нагрузочное тестирование: 100+ одновременных сессий
- [ ] Документация: API-контракты для внешнего источника, инструкция по внедрению виджета

### Этап 4: Подготовка к продакшену (неделя 5)
- [ ] Включить HTTPS/WSS для публичных эндпоинтов
- [ ] Настроить rate limiting и мониторинг аномалий
- [ ] Провести аудит безопасности (проверка токенов, изоляция сессий)
- [ ] Подготовить чеклист деплоя и отката

---

## ✅ Критерии приёмки

### Функциональные
- [ ] Данные от симулятора отображаются в браузере с задержкой ≤ 100 мс
- [ ] Прогресс-бар плавно обновляется, стоимость и ETA рассчитываются корректно
- [ ] При реконнекте браузера восстанавливается последнее известное состояние
- [ ] Пользователь не может получить доступ к чужой сессии зарядки

### Нефункциональные
- [ ] Система выдерживает 100 одновременных сессий без деградации задержки
- [ ] При сбое NestJS-узла подключения автоматически перераспределяются (при кластеризации)
- [ ] Все секреты (API-ключи, JWT-секреты) хранятся в переменных окружения, не в коде
- [ ] Логи содержат достаточно информации для отладки, но не чувствительные данные

### Безопасность
- [ ] Внешний источник не может отправить данные без валидного API-ключа
- [ ] Браузер не может подписаться на сессию без валидного JWT от Joomla
- [ ] JWT имеет TTL ≤ 5 минут и не содержит чувствительных данных
- [ ] Реализована защита от brute-force (rate limiting на аутентификацию)

---

## 📎 Приложения

### Приложение А: Контракт данных (TypeScript DTO)

```ts
// src/modules/charging/dtos/charging-raw.dto.ts
export class ChargingRawInputDto {
  @IsString() sessionId: string;
  @IsInt() @Min(1) connectorId: number;
  @IsNumber() @Min(0) meterValue: number; // kWh
  @IsNumber() @Min(0) power: number; // kW
  @IsISO8601() timestamp: string;
  @IsIn(['Preparing', 'Charging', 'Suspended', 'Finished', 'Error']) status: string;
  // ... остальные поля
}

// src/modules/charging/dtos/charging-user.dto.ts
export class ChargingUserOutput {
  sessionId: string;
  progress: number; // 0-100
  kWh: number;
  cost: number;
  currency: string;
  etaMinutes: number | null;
  status: 'charging' | 'finished' | 'error' | 'preparing';
  updatedAt: Date;
}
```

### Приложение Б: Пример конфигурации для внешнего источника

```yaml
# external-source-config.example.yaml
endpoint:
  url: "ws://joomla-api:3000/ingest"  # или https://api.example.com/ingest
  auth:
    type: "api_key"
    header: "X-External-Api-Key"
    value: "${EXTERNAL_API_KEY}"  # из env

stream:
  format: "json"
  event_name: "charging:event"
  retry:
    max_attempts: 5
    delay_ms: 1000

data:
  session_id_field: "sessionId"
  required_fields: ["sessionId", "meterValue", "power", "status"]
```

---

> 📌 **Примечание для разработчиков**:  
> Данный модуль **не дублирует** функционал оператора (Citrine Operator UI). Он предназначен исключительно для **конечных пользователей** и предоставляет только те данные, которые необходимы для понимания прогресса и стоимости зарядки.  
>   
> **Не добавляйте** в этот модуль: управление станцией, диагностику, настройки тарифов — это задачи других подсистем.

*Документ подготовлен для включения в репозиторий документации проекта.*