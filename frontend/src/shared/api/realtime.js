import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

export const createRoomConnection = ({
  apiBaseUrl,
  token,
  roomId,
  onReady,
  onPresenceSync,
  onUserJoined,
  onUserLeft,
  onCanvasUpdated,
  onCursorMoved,
}) => {
  // Настройка Echo с токеном авторизации
  const echo = new Echo({
    broadcaster: 'pusher',
    key: import.meta.env.VITE_REVERB_APP_KEY || 'app-key',
    cluster: import.meta.env.VITE_REVERB_APP_CLUSTER || 'mt1',
    wsHost: import.meta.env.VITE_REVERB_HOST || window.location.hostname,
    wsPort: import.meta.env.VITE_REVERB_PORT || 8080,
    wssPort: import.meta.env.VITE_REVERB_PORT || 8080,
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME || 'http') === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint: `${apiBaseUrl}/api/broadcasting/auth`,
    auth: {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    },
  });

  const channelName = `room.${roomId}`;
  const channel = echo.join(channelName);

  channel
    .here((users) => {
      onReady({ connected: true, message: "Connected to Reverb" });
      onPresenceSync(users);
    })
    .joining((user) => {
      if (onUserJoined) onUserJoined(user);
    })
    .leaving((user) => {
      if (onUserLeft) onUserLeft(user);
    })
    // Слушаем серверные события обновления холста
    .listen('.CanvasUpdated', (e) => {
      if (e.canvas_state) onCanvasUpdated(e.canvas_state);
    })
    // Слушаем клиентские "шепоты" (курсоры)
    .listenForWhisper('cursor-moved', (e) => {
      onCursorMoved(e);
    });

  return {
    channelName,
    echo,
    disconnect() {
      echo.leave(channelName);
      echo.disconnect();
    },
    // Отправка своих координат другим участникам
    broadcastCursor(payload) {
      channel.whisper('cursor-moved', payload);
    },
  };
};
