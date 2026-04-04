import { apiRequest } from "./http";

export const saveCanvasState = async ({
  apiBaseUrl,
  roomId,
  token,
  canvasState,
}) => {
  try {
    const result = await apiRequest({
      apiBaseUrl,
      path: `/api/rooms/${encodeURIComponent(roomId)}/canvas_state`,
      method: "POST",
      token,
      body: {
        canvas_state: canvasState,
      },
    });

    if (!result.ok) {
      return {
        ok: false,
        message: result.message,
      };
    }

    return {
      ok: true,
      message: "Canvas state saved successfully.",
    };
  } catch (error) {
    return {
      ok: false,
      message: `Request failed: ${error.message}`,
    };
  }
};
