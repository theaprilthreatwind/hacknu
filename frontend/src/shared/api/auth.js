const getValueByPath = (payload, path) => {
  if (!path) {
    return "";
  }

  return path
    .split(".")
    .reduce((current, key) => current?.[key], payload);
};

const buildRequestUrl = (apiBaseUrl, path) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const trimmedBaseUrl = (apiBaseUrl || "").trim().replace(/\/+$/, "");

  return trimmedBaseUrl ? `${trimmedBaseUrl}${normalizedPath}` : normalizedPath;
};

const requestAuth = async ({
  apiBaseUrl,
  path,
  body,
  tokenPath,
  userNamePath,
  fallbackErrorLabel,
}) => {
  try {
    const requestUrl = buildRequestUrl(apiBaseUrl, path);

    const response = await fetch(requestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        ok: false,
        message:
          payload?.message ||
          payload?.error ||
          `${fallbackErrorLabel} failed with status ${response.status}.`,
      };
    }

    const token =
      getValueByPath(payload, tokenPath) ||
      getValueByPath(payload, "access_token") ||
      getValueByPath(payload, "data.access_token") ||
      getValueByPath(payload, "data.token");

    if (!token) {
      return {
        ok: false,
        message:
          "Backend responded without a token. Check the login response format.",
      };
    }

    return {
      ok: true,
      token,
      name:
        getValueByPath(payload, userNamePath) ||
        getValueByPath(payload, "user.name") ||
        getValueByPath(payload, "name"),
      message: "Login succeeded.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        `${fallbackErrorLabel} request failed. ` +
        `Check that the backend is reachable and CORS is configured. ` +
        `${error.message}`,
    };
  }
};

export const loginWithCredentials = async ({
  apiBaseUrl,
  authPath,
  identifierField,
  passwordField,
  tokenPath,
  userNamePath,
  login,
  password,
}) =>
  requestAuth({
    apiBaseUrl,
    path: authPath,
    tokenPath,
    userNamePath,
    fallbackErrorLabel: "Login",
    body: {
      [identifierField]: login,
      [passwordField]: password,
    },
  });

export const registerWithCredentials = async ({
  apiBaseUrl,
  registerPath,
  identifierField,
  passwordField,
  nameField,
  tokenPath,
  userNamePath,
  login,
  password,
  name,
}) =>
  requestAuth({
    apiBaseUrl,
    path: registerPath,
    tokenPath,
    userNamePath,
    fallbackErrorLabel: "Registration",
    body: {
      [nameField]: name,
      [identifierField]: login,
      [passwordField]: password,
      password_confirmation: password,
    },
  });
