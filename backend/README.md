# 🚀 HackNU Backend API Documentation

Добро пожаловать в документацию API для нашего проекта! Здесь собраны все доступные эндпоинты, форматы запросов и инструкции по интеграции фронтенда.

---

## 1. Базовая информация

- **Базовый URL**: `http://127.0.0.1:8000/api` (или ваш рабочий хост).
- **Авторизация**: Для всех запросов, кроме аутентификации (`/register`, `/login`), необходимо передавать токен доступа в заголовке `Authorization`.
  ```http
  Authorization: Bearer <ваш_токен>
  ```
- **Формат запросов**: Все запросы и ответы строятся на базе JSON. Заголовки:
  ```http
  Content-Type: application/json
  Accept: application/json
  ```

---

## 2. Core API (Базовые роуты)

### 🔐 Аутентификация

- **Регистрация** (`POST /register`)
  **Body:** `{"name": "User", "email": "user@example.com", "password": "password", "password_confirmation": "password"}`
  **Ответ (201):** Возвращает объект пользователя и `token`.

- **Логин** (`POST /login`)
  **Body:** `{"email": "user@example.com", "password": "password"}`
  **Ответ (200):** Возвращает `token`.

- **Текущий пользователь** (`GET /user`)
  **Ответ (200):** Данные авторизованного пользователя.

- **Логаут** (`POST /logout`)
  **Ответ (200):** Завершает сессию и аннулирует токен.

---

### 📂 Проекты (`/projects`) - *Resource Controller*

| Метод | Эндпоинт | Описание | Body (JSON) |
|---|---|---|---|
| GET | `/projects` | Список проектов текущего пользователя | |
| POST | `/projects` | Создать проект | `{"name": "New Project", "description": "..."}` |
| GET | `/projects/{project}` | Просмотр отдельного проекта (+ вложенные `rooms` с их `share_uuid`) | |
| PUT/PATCH | `/projects/{project}` | Редактировать проект | `{"name": "Updated"}` |
| DELETE | `/projects/{project}` | Удалить проект | |

---

### 🗂 Комнаты / Переговорки (`/rooms`) - *Resource Controller*

| Метод | Эндпоинт | Описание | Body (JSON) |
|---|---|---|---|
| GET | `/rooms` | Список всех комнат текущего пользователя | |
| POST | `/rooms` | Создать комнату | `{"name": "Room 1", "project_id": 1}` |
| GET | `/rooms/{room}` | Просмотр отдельной комнаты | |
| PUT/PATCH | `/rooms/{room}` | Обновить комнату | `{"name": "Updated", "status": "active"}` |
| DELETE | `/rooms/{room}` | Удалить комнату | |

---

### 🔗 Гостевое подключение по ссылке (Коллаборация)

- **Вход по уникальной ссылке**
  `GET /rooms/join/{share_uuid}`
  **Описание:** Позволяет любому авторизованному пользователю получить данные комнаты по её `share_uuid`. Идеально для ссылок: `https://.../room/{share_uuid}`.
  **Ответ:** Возвращает объект комнаты `{ "data": { "id": 1, "share_uuid": "...", ... } }`.

---

## 3. Интерактивная веб-доска (Canvas) и Сокеты

### Сохранение объекта холста
`POST /rooms/{room}/canvas_state`
**Описание:** Сохраняет состояние доски, чтобы объекты оставались после перезагрузки страницы. Настройте фронтенд сохранять доску автоматически раз в пару минут или при выходе.
**Body:**
```json
{
  "canvas_state": [
    { "type": "rect", "left": 100, "top": 50, "fill": "red" }
  ]
}
```

### Подключение к сокетам (Laravel Echo + Reverb)
Синхронизация курсоров и графики "на лету":
1. Установите `laravel-echo` и `pusher-js`.
2. Подключитесь к комнате: `Echo.join('room.${roomId}')`
3. **Слушайте события:**
   - Для доски: `.listen('CanvasUpdated', (e) => { /* рисование e.canvasData */ })`
   - Для мыши: `.listen('.cursor.moved', (e) => { /* движение e.userId */ })`

---

## 4. Видеозвонки (Google Meet клон)

`GET /rooms/{room}/video-token`

Генерирует Access-параметры для подключения к инфраструктуре **LiveKit**.
**Успешный ответ:**
```json
{
  "token": "eyJhbGciOiJIUzI1...",
  "livekit_url": "wss://ваш-проект.livekit.cloud"
}
```
> Фронтендеру: Передайте полученные параметры (`token` и `livekit_url`) прямо в React/Vue компонент `LiveKit` для старта сеанса видеосвязи.

---

## 5. AI Assistant (Текстовый бот - Gemini 3)

Встроенный умный помощник, который анализирует доску и генерирует идеи.

`POST /rooms/{room}/ai/chat`
**Body:**
```json
{
  "prompt": "Как лучше разместить кнопки на этом макете?"
}
```
> 🧠 **Важно:** Бэкенд автоматически берёт текущий `canvas_state` из БД и передает его ИИ в качестве системного контекста. От вас требуется отправлять **только текст**, который ввёл пользователь!

**Ответ:**
```json
{
  "reply": "Ответ от модели Gemini..."
}
```

---

## 6. Generative AI (Генерация медиа - Higgsfield)

Асинхронный процесс генерации картинок (Text-to-Image) и видео (Image-to-Video). Процесс разделен на два шага.

### Шаг 1. Запуск генерации

`POST /rooms/{room}/ai/generate`

**Для КАРТИНОК (`Text-to-Image`):**
```json
{
  "prompt": "Киберпанк город с неоновыми вывесками",
  "type": "image"
}
```

**Для ВИДЕО (`Image-to-Video`):** *(Ссылка на картинку `image_url` обязательна!)*
```json
{
  "prompt": "Заставь машину с фотографии поехать вперед",
  "type": "video",
  "image_url": "https://example.com/source-image.png"
}
```

**Ответ:** Возвращается Task ID состояния.
```json
{
  "request_id": "a1b2c3d4-e5f6-g7h8",
  "status": "queued"
}
```

### Шаг 2. Polling (Проверка статуса)

`GET /rooms/{room}/ai/status/{request_id}`

Генерация занимает время. Настройте таймер (`setInterval`) на фронтенде каждые **3-5 секунд**, передавая в этот роут `request_id`, и ожидайте статус `completed`, `failed` или `nsfw`.

**Пример успешного финиша:**
```json
{
  "request_id": "a1b2c3d4-e...",
  "status": "completed",
  "images": [ { "url": "https://cdn.higgsfield.ai/completed_image.png" } ],
  "video": { "url": "https://cdn.higgsfield.ai/completed_video.mp4" }
}
```
> Ссылки на медиа: `response.images[0].url` (для картинок) или `response.video.url` (для видео).
