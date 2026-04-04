const buildMember = (member) => ({
  id: member?.id,
  name: member?.name || member?.user_info?.name || member?.email,
  raw: member,
});

export const createRoomConnection = ({
  roomId,
  onReady,
  onPresenceSync,
  onCanvasUpdated,
  onCursorMoved,
}) => {
  onReady({
    connected: false,
    message:
      "Realtime adapter is in stub mode. Next step is laravel-echo + pusher-js with Presence channel room.{roomId}.",
  });

  onPresenceSync([].map(buildMember));

  return {
    channelName: `room.${roomId}`,
    disconnect() {},
    simulateCanvasUpdated(payload) {
      onCanvasUpdated(payload);
    },
    simulateCursorMoved(payload) {
      onCursorMoved(payload);
    },
  };
};
