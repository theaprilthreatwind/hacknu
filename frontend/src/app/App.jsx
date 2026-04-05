import { useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { defaultSessionConfig } from "../entities/session";
import { AuthPage } from "../pages/auth";
import { WorkspacePage } from "../pages/workspace/ui/WorkspacePage";
import { ProjectHubPage } from "../pages/workspace/ui/ProjectHubPage";
import { getStoredSessionConfig, saveSessionConfig } from "../shared/lib/storage";

const App = () => {
  const [sessionConfig, setSessionConfig] = useState(() =>
    getStoredSessionConfig(defaultSessionConfig),
  );
  const navigate = useNavigate();

  const handleSessionSubmit = (nextConfig) => {
    const mergedConfig = { ...sessionConfig, ...nextConfig };
    setSessionConfig(mergedConfig);
    saveSessionConfig(mergedConfig);
    navigate("/hub", { replace: true });
  };

  const handleSessionReset = () => {
    const nextConfig = {
      ...sessionConfig,
      token: "",
    };

    setSessionConfig(nextConfig);
    saveSessionConfig(nextConfig);
    navigate("/", { replace: true });
  };

  return (
    <Routes>
      <Route
        path="/"
        element={
          <AuthPage
            initialConfig={sessionConfig}
            onSubmit={handleSessionSubmit}
          />
        }
      />
      <Route
        path="/auth"
        element={<Navigate to="/" replace />}
      />
      <Route
        path="/settings"
        element={
          sessionConfig.token ? (
            <AuthPage
              initialConfig={sessionConfig}
              onSubmit={handleSessionSubmit}
            />
          ) : (
            <Navigate to="/auth" replace />
          )
        }
      />
      <Route
        path="/hub"
        element={
          sessionConfig.token ? (
            <ProjectHubPage
              sessionConfig={sessionConfig}
              onResetSession={handleSessionReset}
            />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/workspace/:roomId"
        element={
          sessionConfig.token ? (
            <WorkspacePage sessionConfig={sessionConfig} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/room/:id"
        element={<Navigate to="/hub" replace />}
      />
      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  );
};

export default App;
