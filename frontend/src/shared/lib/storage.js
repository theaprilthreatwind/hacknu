const SESSION_KEY = "hacknu-ai-brainstorm-session";
const TOKEN_KEY = "hacknu-ai-brainstorm-token";

const buildPersistedConfig = (config) => {
  const nextConfig = { ...config };
  delete nextConfig.token;
  return nextConfig;
};

export const getStoredSessionConfig = (fallbackConfig) => {
  try {
    const value = window.localStorage.getItem(SESSION_KEY);
    const token = window.sessionStorage.getItem(TOKEN_KEY) || "";

    if (!value) {
      return {
        ...fallbackConfig,
        token,
      };
    }

    return {
      ...fallbackConfig,
      ...JSON.parse(value),
      token,
    };
  } catch {
    return fallbackConfig;
  }
};

export const saveSessionConfig = (config) => {
  window.localStorage.setItem(
    SESSION_KEY,
    JSON.stringify(buildPersistedConfig(config)),
  );

  if (config.token) {
    window.sessionStorage.setItem(TOKEN_KEY, config.token);
    return;
  }

  window.sessionStorage.removeItem(TOKEN_KEY);
};
