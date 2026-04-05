const noop = () => {};

export const createRoomConnection = ({
  roomId,
  onReady = noop,
  onPresenceSync = noop,
}) => {
  onReady({
    connected: false,
    message: "Realtime packages are not installed yet. Canvas sync is running in fallback mode.",
  });
  onPresenceSync([]);

  return {
    channelName: `room.${roomId}`,
    echo: null,
    disconnect() {},
    broadcastCursor() {},
  };
};
