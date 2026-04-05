import { useLocation, useNavigate } from "react-router-dom";

export const WorkspacePlaceholderPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const createdEntity = location.state;

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="relative w-full rounded-2xl border border-white/10 bg-zinc-950/80 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur sm:p-10">
          <div
            className="pointer-events-none absolute inset-x-16 top-0 h-28 rounded-full bg-[rgb(209,254,23)]/10 blur-3xl"
            aria-hidden="true"
          />

          <div className="relative space-y-6">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.24em] text-[rgb(209,254,23)]">
                Workspace
              </p>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
                Workspace is coming next
              </h1>
              <p className="max-w-2xl text-base text-white/60">
                The handoff flow is already ready. After creating a project or
                room, you now land here automatically. Once the second
                developer shares the real workspace, we can plug it into this
                route directly.
              </p>
            </div>

            {createdEntity ? (
              <div className="rounded-2xl border border-[rgb(209,254,23)]/15 bg-black/60 p-5">
                <p className="text-sm uppercase tracking-[0.18em] text-[rgb(209,254,23)]">
                  Last created
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-white">
                  <span className="rounded-full border border-white/10 bg-zinc-900 px-3 py-1 text-sm">
                    {createdEntity.type}
                  </span>
                  {createdEntity.name ? (
                    <span className="rounded-full border border-white/10 bg-zinc-900 px-3 py-1 text-sm">
                      {createdEntity.name}
                    </span>
                  ) : null}
                  {createdEntity.id ? (
                    <span className="rounded-full border border-white/10 bg-zinc-900 px-3 py-1 text-sm">
                      #{createdEntity.id}
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                className="rounded-xl bg-[rgb(209,254,23)] px-5 py-3 font-medium text-black shadow-[0_0_24px_rgba(209,254,23,0.18)] transition duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-[0_14px_36px_rgba(209,254,23,0.24)] active:translate-y-0 active:scale-[0.985]"
                type="button"
                onClick={() => navigate("/hub")}
              >
                Back to hub
              </button>

              <button
                className="rounded-xl border border-[rgb(209,254,23)]/20 bg-zinc-900 px-5 py-3 font-medium text-white transition duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:border-[rgb(209,254,23)]/45 hover:bg-[rgb(209,254,23)]/8 hover:shadow-[0_0_24px_rgba(209,254,23,0.18)] active:translate-y-0 active:scale-[0.985]"
                type="button"
                onClick={() => navigate("/")}
              >
                Go to auth
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};
