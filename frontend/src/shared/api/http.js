export const buildApiUrl = (apiBaseUrl, path) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const trimmedBaseUrl = (apiBaseUrl || "").trim().replace(/\/+$/, "");

  return trimmedBaseUrl ? `${trimmedBaseUrl}${normalizedPath}` : normalizedPath;
};

export const apiRequest = async ({
  apiBaseUrl,
  path,
  method = "GET",
  token,
  body,
}) => {
  const headers = {
    Accept: "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(buildApiUrl(apiBaseUrl, path), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      payload,
      message:
        payload?.message ||
        payload?.error ||
        `Request failed with status ${response.status}.`,
    };
  }

  return {
    ok: true,
    status: response.status,
    payload,
  };
};
