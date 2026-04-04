import { SessionConfigForm } from "../../../features/session-config";

export const AuthPage = ({ initialConfig, onSubmit }) => (
  <main className="min-h-screen bg-black text-white">
    <section className="mx-auto grid min-h-screen w-full max-w-6xl place-items-center px-4 py-8 sm:px-6 lg:px-8">
      <section className="relative w-full max-w-xl rounded-2xl border border-white/10 bg-black/90 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.55)] backdrop-blur sm:p-8">
        <div
          className="pointer-events-none absolute inset-x-10 top-0 h-32 rounded-full bg-[rgb(209,254,23)]/12 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-10 right-0 h-32 w-32 rounded-full bg-[rgb(209,254,23)]/8 blur-3xl"
          aria-hidden="true"
        />
        <SessionConfigForm initialConfig={initialConfig} onSubmit={onSubmit} />
      </section>
    </section>
  </main>
);
