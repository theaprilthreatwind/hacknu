/**
 * Higgsfield Media API — PRODUCTION MODE (no fallbacks)
 *
 * Phase 1: POST /rooms/{room_id}/ai/generate  → { request_id }
 * Phase 2: GET  /rooms/{room_id}/ai/status/{request_id} every 3 s
 *           until status === 'completed'
 *
 * Errors are thrown and propagated — nodes show 'error' state in UI.
 */

// ── Polling helper ────────────────────────────────────────────────────────────
const pollTaskStatus = (apiBaseUrl, token, roomId, requestId) => {
  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(
          `${apiBaseUrl}/rooms/${roomId}/ai/status/${requestId}`,
          { method: 'GET', headers: { Authorization: `Bearer ${token}` } }
        );

        if (!response.ok) throw new Error(`Polling failed: HTTP ${response.status}`);

        const data = await response.json();

        if (data.status === 'completed') {
          clearInterval(interval);
          resolve(data);
        } else if (data.status === 'failed' || data.status === 'nsfw') {
          clearInterval(interval);
          reject(new Error(`Generation failed with status: ${data.status}`));
        }
        // 'queued' | 'processing' → wait for next tick
      } catch (error) {
        clearInterval(interval);
        reject(error);
      }
    }, 3000);
  });
};

// ── Image Generation ──────────────────────────────────────────────────────────
export const generateHiggsfieldImage = async ({ apiBaseUrl, token, roomId, prompt }) => {
  try {
    const startResponse = await fetch(`${apiBaseUrl}/rooms/${roomId}/ai/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ prompt, type: 'image' }),
    });

    if (!startResponse.ok) {
      const err = await startResponse.json().catch(() => ({}));
      throw new Error(err.message || `HTTP ${startResponse.status}`);
    }

    const startData = await startResponse.json();
    if (!startData.request_id) throw new Error('No request_id in response');

    const resultData = await pollTaskStatus(apiBaseUrl, token, roomId, startData.request_id);

    // Извлекаем URL с учетом возможной обертки payload
    const finalImageUrl = resultData?.payload?.images?.[0]?.url || resultData?.images?.[0]?.url;

    if (!finalImageUrl) throw new Error('Completed but no image URL found in response');

    return { url: finalImageUrl };
  } catch (error) {
    console.error('❌ REAL IMAGE API FAILED:', error);
    throw error; // propagate → node renders 'error' state
  }
};

// ── Video Generation ──────────────────────────────────────────────────────────
export const generateHiggsfieldVideo = async ({ apiBaseUrl, token, roomId, prompt, imageUrl }) => {
  try {
    const startResponse = await fetch(`${apiBaseUrl}/rooms/${roomId}/ai/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ prompt, type: 'video', image_url: imageUrl }),
    });

    if (!startResponse.ok) {
      const err = await startResponse.json().catch(() => ({}));
      throw new Error(err.message || `HTTP ${startResponse.status}`);
    }

    const startData = await startResponse.json();
    if (!startData.request_id) throw new Error('No request_id in response');

    const resultData = await pollTaskStatus(apiBaseUrl, token, roomId, startData.request_id);

    // Извлекаем URL с учетом возможной обертки payload
    const finalVideoUrl = resultData?.payload?.video?.url || resultData?.video?.url;

    if (!finalVideoUrl) throw new Error('Completed but no video URL found in response');

    return { url: finalVideoUrl };
  } catch (error) {
    console.error('❌ REAL VIDEO API FAILED:', error);
    throw error; // propagate → node renders 'error' state
  }
};
