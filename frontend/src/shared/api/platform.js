import { apiRequest } from "./http";

export const fetchCurrentUser = ({ apiBaseUrl, token }) =>
  apiRequest({
    apiBaseUrl,
    path: "/api/user",
    token,
  });

export const fetchProjects = ({ apiBaseUrl, token }) =>
  apiRequest({
    apiBaseUrl,
    path: "/api/projects",
    token,
  });

export const createProject = ({ apiBaseUrl, token, name, description }) =>
  apiRequest({
    apiBaseUrl,
    path: "/api/projects",
    method: "POST",
    token,
    body: {
      name,
      description: description || null,
    },
  });

export const fetchRooms = ({ apiBaseUrl, token }) =>
  apiRequest({
    apiBaseUrl,
    path: "/api/rooms",
    token,
  });

export const fetchRoom = ({ apiBaseUrl, token, roomId }) =>
  apiRequest({
    apiBaseUrl,
    path: `/api/rooms/${encodeURIComponent(roomId)}`,
    token,
  });

export const createRoom = ({
  apiBaseUrl,
  token,
  projectId,
  name,
  status,
}) =>
  apiRequest({
    apiBaseUrl,
    path: "/api/rooms",
    method: "POST",
    token,
    body: {
      project_id: Number(projectId),
      name,
      status,
    },
  });

export const fetchVideoToken = ({ apiBaseUrl, token, roomId }) =>
  apiRequest({
    apiBaseUrl,
    path: `/api/rooms/${encodeURIComponent(roomId)}/video-token`,
    token,
  });

export const chatWithRoomAi = ({ apiBaseUrl, token, roomId, prompt }) =>
  apiRequest({
    apiBaseUrl,
    path: `/api/rooms/${encodeURIComponent(roomId)}/ai/chat`,
    method: "POST",
    token,
    body: {
      prompt,
    },
  });

export const generateRoomMedia = ({
  apiBaseUrl,
  token,
  roomId,
  prompt,
  type,
  imageUrl,
}) =>
  apiRequest({
    apiBaseUrl,
    path: `/api/rooms/${encodeURIComponent(roomId)}/ai/generate`,
    method: "POST",
    token,
    body: {
      prompt,
      type,
      ...(imageUrl ? { image_url: imageUrl } : {}),
    },
  });

export const fetchGenerationStatus = ({
  apiBaseUrl,
  token,
  roomId,
  requestId,
}) =>
  apiRequest({
    apiBaseUrl,
    path: `/api/rooms/${encodeURIComponent(roomId)}/ai/status/${encodeURIComponent(
      requestId,
    )}`,
    token,
  });

export const joinRoomByUuid = ({ apiBaseUrl, token, shareUuid }) =>
  apiRequest({
    apiBaseUrl,
    path: `/api/rooms/join/${encodeURIComponent(shareUuid)}`,
    token,
  });