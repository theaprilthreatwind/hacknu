import { useState } from "react";
import { defaultSessionConfig } from "../../../entities/session";
import {
  loginWithCredentials,
  registerWithCredentials,
} from "../../../shared/api/auth";

export const SessionConfigForm = ({ initialConfig, onSubmit }) => {
  const [form, setForm] = useState({
    ...defaultSessionConfig,
    ...initialConfig,
    authMode: initialConfig.authMode || "login",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
    setError("");
    setInfo("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.login.trim() || !form.password.trim()) {
      setError("Email and password are required.");
      return;
    }

    if (form.authMode === "register") {
      if (!form.name.trim()) {
        setError("Name is required.");
        return;
      }

      if (form.password !== form.confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    setIsLoading(true);
    setInfo(form.authMode === "register" ? "Creating account..." : "Signing in...");

    const result =
      form.authMode === "register"
        ? await registerWithCredentials({
            apiBaseUrl: form.apiBaseUrl.trim(),
            registerPath: form.registerPath.trim() || "/api/register",
            identifierField: form.authIdentifierField.trim() || "email",
            passwordField: form.authPasswordField.trim() || "password",
            nameField: form.authNameField.trim() || "name",
            tokenPath: form.authTokenPath.trim() || "token",
            userNamePath: form.authUserNamePath.trim() || "user.name",
            login: form.login.trim(),
            password: form.password,
            name: form.name.trim(),
          })
        : await loginWithCredentials({
            apiBaseUrl: form.apiBaseUrl.trim(),
            authPath: form.authPath.trim() || "/api/login",
            identifierField: form.authIdentifierField.trim() || "email",
            passwordField: form.authPasswordField.trim() || "password",
            tokenPath: form.authTokenPath.trim() || "token",
            userNamePath: form.authUserNamePath.trim() || "user.name",
            login: form.login.trim(),
            password: form.password,
          });

    setIsLoading(false);

    if (!result.ok) {
      setError(result.message);
      setInfo("");
      return;
    }

    setInfo(form.authMode === "register" ? "Account created." : "Login successful.");

    onSubmit({
      ...form,
      apiBaseUrl: form.apiBaseUrl.trim(),
      authPath: (form.authPath.trim() || "/api/login").replace(/\/+$/, "") || "/api/login",
      registerPath:
        (form.registerPath.trim() || "/api/register").replace(/\/+$/, "") ||
        "/api/register",
      authIdentifierField: form.authIdentifierField.trim() || "email",
      authPasswordField: form.authPasswordField.trim() || "password",
      authNameField: form.authNameField.trim() || "name",
      authTokenPath: form.authTokenPath.trim() || "token",
      authUserNamePath: form.authUserNamePath.trim() || "user.name",
      login: form.login.trim(),
      token: result.token,
      roomId: form.roomId.trim() || defaultSessionConfig.roomId,
      name: form.name.trim() || result.name || form.login.trim(),
      sessionGoal: form.sessionGoal.trim() || defaultSessionConfig.sessionGoal,
      password: "",
      confirmPassword: "",
    });
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.24em] text-[rgb(209,254,23)]">
          Higgsfield
        </p>
        <h2 className="text-3xl font-semibold tracking-tight text-white">
          {form.authMode === "register" ? "Register" : "Log in"}
        </h2>
        <p className="text-sm text-white/60">
          Continue into the workspace with your account.
        </p>
      </div>

      <div
        className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-zinc-950 p-1"
        role="tablist"
        aria-label="Authentication mode"
      >
        <button
          className={
            form.authMode === "register"
              ? "rounded-xl bg-[rgb(209,254,23)] px-4 py-2 text-sm font-medium text-black shadow-[0_0_24px_rgba(209,254,23,0.22)] transition duration-200 hover:scale-[1.02] hover:shadow-[0_0_28px_rgba(209,254,23,0.3)] active:scale-[0.98]"
              : "rounded-xl px-4 py-2 text-sm font-medium text-white/70 transition duration-200 hover:scale-[1.01] hover:bg-white/5 hover:text-white active:scale-[0.98]"
          }
          type="button"
          onClick={() =>
            setForm((current) => ({
              ...current,
              authMode: "register",
            }))
          }
        >
          Register
        </button>
        <button
          className={
            form.authMode === "login"
              ? "rounded-xl bg-[rgb(209,254,23)] px-4 py-2 text-sm font-medium text-black shadow-[0_0_24px_rgba(209,254,23,0.22)] transition duration-200 hover:scale-[1.02] hover:shadow-[0_0_28px_rgba(209,254,23,0.3)] active:scale-[0.98]"
              : "rounded-xl px-4 py-2 text-sm font-medium text-white/70 transition duration-200 hover:scale-[1.01] hover:bg-white/5 hover:text-white active:scale-[0.98]"
          }
          type="button"
          onClick={() =>
            setForm((current) => ({
              ...current,
              authMode: "login",
            }))
          }
        >
          Log in
        </button>
      </div>

      {form.authMode === "register" ? (
        <label className="block space-y-2">
          <span className="text-sm text-white/75">Name</span>
          <input
            className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-white placeholder:text-white/30 outline-none transition duration-200 focus:border-[rgb(209,254,23)] focus:ring-2 focus:ring-[rgb(209,254,23)]/20"
            name="name"
            type="text"
            placeholder="Your name"
            value={form.name}
            onChange={handleChange}
          />
        </label>
      ) : null}

      <label className="block space-y-2">
        <span className="text-sm text-white/75">Email</span>
        <input
          className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-white placeholder:text-white/30 outline-none transition duration-200 focus:border-[rgb(209,254,23)] focus:ring-2 focus:ring-[rgb(209,254,23)]/20"
          name="login"
          type="email"
          placeholder="name@example.com"
          value={form.login}
          onChange={handleChange}
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm text-white/75">Password</span>
        <input
          className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-white placeholder:text-white/30 outline-none transition duration-200 focus:border-[rgb(209,254,23)] focus:ring-2 focus:ring-[rgb(209,254,23)]/20"
          name="password"
          type="password"
          placeholder="Enter password"
          value={form.password}
          onChange={handleChange}
        />
      </label>

      {form.authMode === "register" ? (
        <label className="block space-y-2">
          <span className="text-sm text-white/75">Repeat password</span>
          <input
            className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-white placeholder:text-white/30 outline-none transition duration-200 focus:border-[rgb(209,254,23)] focus:ring-2 focus:ring-[rgb(209,254,23)]/20"
            name="confirmPassword"
            type="password"
            placeholder="Repeat password"
            value={form.confirmPassword}
            onChange={handleChange}
          />
        </label>
      ) : null}

      {info ? <p className="text-sm text-white/60">{info}</p> : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <button
        className="w-full rounded-xl bg-[rgb(209,254,23)] px-4 py-3 font-medium text-black shadow-[0_0_30px_rgba(209,254,23,0.18)] transition duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-[0_10px_40px_rgba(209,254,23,0.24)] active:translate-y-0 active:scale-[0.985] disabled:opacity-60"
        type="submit"
        disabled={isLoading}
      >
        {isLoading
          ? form.authMode === "register"
            ? "Creating account..."
            : "Signing in..."
          : form.authMode === "register"
            ? "Create account"
            : "Log in"}
      </button>
    </form>
  );
};
