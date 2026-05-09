# Users API - Примеры использования

## Эндпоинты

### 1. Получить всех пользователей
```bash
GET /api/users
```

**Ответ:**
```json
[
  {
    "joomlaId": 1,
    "email": "user1@example.com",
    "username": "user1",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "lastSyncedAt": null,
    "settings": {}
  }
]
```

### 2. Получить пользователя по ID
```bash
GET /api/users/1
```

**Ответ:**
```json
{
  "joomlaId": 1,
  "email": "user1@example.com",
  "username": "user1",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "lastSyncedAt": null,
  "settings": {}
}
```

### 3. Создать пользователя
```bash
POST /api/users
Content-Type: application/json

{
  "joomlaId": 2,
  "email": "newuser@example.com",
  "username": "newuser",
  "settings": {
    "theme": "dark",
    "notifications": true
  }
}
```

**Ответ (201 Created):**
```json
{
  "joomlaId": 2,
  "email": "newuser@example.com",
  "username": "newuser",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "lastSyncedAt": null,
  "settings": {
    "theme": "dark",
    "notifications": true
  }
}
```

### 4. Обновить пользователя
```bash
PUT /api/users/2
Content-Type: application/json

{
  "email": "updated@example.com",
  "settings": {
    "theme": "light",
    "language": "en"
  }
}
```

**Ответ:**
```json
{
  "joomlaId": 2,
  "email": "updated@example.com",
  "username": "newuser",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-02T00:00:00.000Z",
  "lastSyncedAt": "2024-01-02T00:00:00.000Z",
  "settings": {
    "theme": "light",
    "language": "en"
  }
}
```

### 5. Удалить пользователя
```bash
DELETE /api/users/2
```

**Ответ:** 204 No Content

### 6. Поиск по email
```bash
GET /api/users/search/by-email?email=user@example.com
```

**Ответ:**
```json
[
  {
    "joomlaId": 1,
    "email": "user@example.com",
    "username": "user1",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "lastSyncedAt": null,
    "settings": {}
  }
]
```

### 7. Статистика
```bash
GET /api/users/stats/count
```

**Ответ:**
```json
{
  "count": 10
}
```

## Валидация

Контроллер использует `class-validator` для валидации входных данных:

### CreateUserDto
- `joomlaId`: число, минимум 1
- `email`: валидный email
- `username`: строка
- `settings`: необязательный объект

### UpdateUserDto
Все поля необязательные:
- `email`: валидный email (если указан)
- `username`: строка (если указана)
- `settings`: объект (если указан)

## Примеры cURL

### Создание пользователя:
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "joomlaId": 100,
    "email": "test@example.com",
    "username": "testuser"
  }'
```

### Получение пользователя:
```bash
curl http://localhost:3000/api/users/100
```

### Обновление пользователя:
```bash
curl -X PUT http://localhost:3000/api/users/100 \
  -H "Content-Type: application/json" \
  -d '{
    "email": "updated@example.com",
    "settings": {"theme": "dark"}
  }'
```

### Удаление пользователя:
```bash
curl -X DELETE http://localhost:3000/api/users/100
```

## Swagger документация

Документация доступна по адресу: `http://localhost:3000/api/docs`

## Обработка ошибок

- **404 Not Found**: Пользователь не найден
- **400 Bad Request**: Невалидные входные данные
- **500 Internal Server Error**: Ошибка сервера