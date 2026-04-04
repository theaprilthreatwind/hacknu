🚀 Hackathon API Documentation
Базовый URL: http://127.0.0.1:8000/api (или ваш локальный домен).
Авторизация: Для всех запросов, кроме регистрации и логина, обязательно передавать Header: Authorization: Bearer <ваш_токен>.
Формат данных: Content-Type: application/json.

1. Аутентификация

📌 Регистрация

POST /register
Body:

JSON
{
  "name": "User Name",
  "email": "user@example.com",
  "password": "password",
  "password_confirmation": "password"
}
Response (201): Возвращает объект пользователя и access_token.

📌 Логин

POST /login
Body:

JSON
{
  "email": "user@example.com",
  "password": "password"
}
Response (200): Возвращает access_token. Этот токен используйте для всех остальных запросов и подключения к WebSockets.

2. Проекты и Комнаты

📌 Создать проект

POST /projects
Body:

JSON
{
  "name": "Название проекта",
  "description": "Описание (необязательно)"
}
Response (201): Возвращает данные проекта (сохраните id).

📌 Создать комнату

POST /rooms
Body:

JSON
{
  "name": "Переговорка 1",
  "project_id": 1
}
Response (201): Возвращает данные комнаты (сохраните id для подключения к сокетам и холсту).

3. Интерактивный Холст (Figma)

📌 Сохранить состояние доски

POST /rooms/{room_id}/canvas_state
Отправляйте этот запрос периодически или по кнопке "Сохранить", чтобы холст не терялся при перезагрузке.
Body:

JSON
{
  "canvas_state": [
    { "type": "rect", "left": 100, "top": 50, "fill": "red" },
    ...ваши объекты из Fabric.js или Konva
  ]
}
Response (200): { "message": "Canvas state saved successfully" }

📡 WebSockets (Laravel Reverb)

Для синхронизации курсоров и объектов "на лету":

Установите laravel-echo и pusher-js.

При инициализации Echo передайте заголовок Authorization: Bearer <токен>.

Подключитесь к комнате: Echo.join('room.${roomId}')

Слушайте события:

Рисование: .listen('CanvasUpdated', (e) => { /* e.canvasData */ })

Движение мыши: .listen('.cursor.moved', (e) => { /* e.userId, e.coordinates */ })

4. Видеосвязь (Google Meet)

📌 Получить ключ доступа для видео (LiveKit Token)

GET /rooms/{room_id}/video-token
Запрашивайте этот токен перед инициализацией компонента LiveKit на фронтенде.
Body: Не требуется.
Response (200):

JSON
{
  "token": "eyJhbGciOiJIUzI1...",
  "livekit_url": "wss://ваш-проект.livekit.cloud"
}
Передайте эти token и livekit_url в LiveKit SDK для старта видеозвонка.

