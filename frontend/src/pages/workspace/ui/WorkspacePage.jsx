import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createProject,
  createRoom,
  fetchCurrentUser,
  fetchProjects,
  fetchRooms,
} from "../../../shared/api/platform";

const initialProjectDraft = {
  name: "",
  description: "",
};

const initialRoomDraft = {
  name: "",
  description: "",
  projectId: "",
};

export const ProjectHubPage = ({ sessionConfig, onResetSession }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [projectDraft, setProjectDraft] = useState(initialProjectDraft);
  const [roomDraft, setRoomDraft] = useState(initialRoomDraft);
  const [projectStatus, setProjectStatus] = useState("");
  const [roomStatus, setRoomStatus] = useState("");
  const [isProjectSaving, setIsProjectSaving] = useState(false);
  const [isRoomSaving, setIsRoomSaving] = useState(false);
  const [hubStatus, setHubStatus] = useState("Loading data...");

  const profileName = user?.name || sessionConfig.name || "Higgsfield User";
  const profileEmail = user?.email || sessionConfig.login || "No email";
  const avatarLetter = profileName.trim().charAt(0).toUpperCase() || "H";

  const projectOptions = useMemo(
    () =>
      projects.map((project) => ({
        id: String(project.id),
        name: project.name,
      })),
    [projects],
  );

  const roomsByProjectId = useMemo(() => {
    const grouped = new Map();

    projects.forEach((project) => grouped.set(project.id, []));
    rooms.forEach((room) => {
      const current = grouped.get(room.project_id) || [];
      grouped.set(room.project_id, [...current, room]);
    });

    return grouped;
  }, [projects, rooms]);

  const loadHub = useCallback(async () => {
    setHubStatus("Loading data...");

    const [userResult, projectsResult, roomsResult] = await Promise.all([
      fetchCurrentUser({
        apiBaseUrl: sessionConfig.apiBaseUrl,
        token: sessionConfig.token,
      }),
      fetchProjects({
        apiBaseUrl: sessionConfig.apiBaseUrl,
        token: sessionConfig.token,
      }),
      fetchRooms({
        apiBaseUrl: sessionConfig.apiBaseUrl,
        token: sessionConfig.token,
      }),
    ]);

    if (!userResult.ok || !projectsResult.ok || !roomsResult.ok) {
      setHubStatus(
        userResult.message ||
          projectsResult.message ||
          roomsResult.message ||
          "Failed to load backend data.",
      );
      return;
    }

    const projectList = Array.isArray(projectsResult.payload?.data)
      ? projectsResult.payload.data
      : [];
    const roomList = Array.isArray(roomsResult.payload?.data)
      ? roomsResult.payload.data
      : [];

    setUser(userResult.payload);
    setProjects(projectList);
    setRooms(roomList);
    setRoomDraft((current) => ({
      ...current,
      projectId: current.projectId || projectList[0]?.id?.toString() || "",
    }));
    setHubStatus("Synced with backend.");
  }, [sessionConfig.apiBaseUrl, sessionConfig.token]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadHub();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadHub]);

  const handleProjectSubmit = async (event) => {
    event.preventDefault();

    if (!projectDraft.name.trim()) {
      setProjectStatus("Project name is required.");
      return;
    }

    setIsProjectSaving(true);
    setProjectStatus("");

    console.log("createProject", projectDraft);

    const result = await createProject({
      apiBaseUrl: sessionConfig.apiBaseUrl,
      token: sessionConfig.token,
      name: projectDraft.name.trim(),
      description: projectDraft.description.trim(),
    });

    setIsProjectSaving(false);

    if (!result.ok) {
      setProjectStatus(result.message);
      return;
    }

    setProjectDraft(initialProjectDraft);
    setProjectStatus("Project created.");
    await loadHub();
    navigate("/workspace", {
      replace: true,
      state: {
        type: "project",
        id: result.payload?.data?.id || result.payload?.id || null,
        name: result.payload?.data?.name || result.payload?.name || projectDraft.name.trim(),
      },
    });
  };

  const handleRoomSubmit = async (event) => {
    event.preventDefault();

    if (!projects.length) {
      setRoomStatus("Create a project first.");
      return;
    }

    if (!roomDraft.name.trim()) {
      setRoomStatus("Room name is required.");
      return;
    }

    const fallbackProjectId = projects[0]?.id?.toString() || "";
    const projectId = roomDraft.projectId || fallbackProjectId;

    if (!projectId) {
      setRoomStatus("Project is required.");
      return;
    }

    setIsRoomSaving(true);
    setRoomStatus("");

    console.log("createRoom", roomDraft);

    const result = await createRoom({
      apiBaseUrl: sessionConfig.apiBaseUrl,
      token: sessionConfig.token,
      projectId,
      name: roomDraft.name.trim(),
      status: "active",
    });

    setIsRoomSaving(false);

    if (!result.ok) {
      setRoomStatus(result.message);
      return;
    }

    setRoomDraft({
      ...initialRoomDraft,
      projectId,
    });
    setRoomStatus("Room created.");
    await loadHub();
    navigate("/workspace", {
      replace: true,
      state: {
        type: "room",
        id: result.payload?.data?.id || result.payload?.id || null,
        name: result.payload?.data?.name || result.payload?.name || roomDraft.name.trim(),
      },
    });
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between rounded-2xl border border-white/10 bg-zinc-950/80 px-5 py-4 shadow-md shadow-black/40 backdrop-blur">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[rgb(209,254,23)]">
              Higgsfield
            </p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Higgsfield Workspace
            </h1>
          </div>

          <button
            className="rounded-xl border border-[rgb(209,254,23)]/20 bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-[0_0_0_rgba(209,254,23,0)] transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-[rgb(209,254,23)]/45 hover:bg-[rgb(209,254,23)]/8 hover:text-white hover:shadow-[0_0_28px_rgba(209,254,23,0.18)] active:translate-y-0 active:scale-[0.98]"
            type="button"
            onClick={onResetSession}
          >
            Sign out
          </button>
        </header>

        <section className="rounded-2xl border border-white/10 bg-zinc-950/80 p-6 shadow-md shadow-black/40">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[rgb(209,254,23)] text-2xl font-semibold text-black">
              {avatarLetter}
            </div>

            <div className="space-y-2">
              <p className="text-sm uppercase tracking-[0.22em] text-[rgb(209,254,23)]">
                Name
              </p>
              <h2 className="text-2xl font-semibold tracking-tight">
                {profileName}
              </h2>
              <p className="text-sm text-white/60">{profileEmail}</p>
              <p className="text-sm text-white/45">{hubStatus}</p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <article className="rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-md shadow-black/40">
            <div className="mb-6 space-y-2">
              <h2 className="text-xl font-semibold tracking-tight">
                Create Project
              </h2>
              <p className="text-sm text-white/55">
                Creates a project through the API contract from the backend
                documentation.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleProjectSubmit}>
              <label className="block space-y-2">
                <span className="text-sm text-white/75">Name</span>
                <input
                  className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-white outline-none transition focus:border-[rgb(209,254,23)] focus:ring-2 focus:ring-[rgb(209,254,23)]/20"
                  type="text"
                  value={projectDraft.name}
                  placeholder="Project name"
                  onChange={(event) =>
                    setProjectDraft((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm text-white/75">Description</span>
                <textarea
                  className="min-h-28 w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-white outline-none transition focus:border-[rgb(209,254,23)] focus:ring-2 focus:ring-[rgb(209,254,23)]/20"
                  value={projectDraft.description}
                  placeholder="Short project description"
                  onChange={(event) =>
                    setProjectDraft((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
              </label>

              <button
                className="w-full rounded-xl bg-[rgb(209,254,23)] px-4 py-2.5 font-medium text-black shadow-[0_0_20px_rgba(209,254,23,0.14)] transition duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-[0_12px_36px_rgba(209,254,23,0.22)] active:translate-y-0 active:scale-[0.985]"
                type="submit"
                disabled={isProjectSaving}
              >
                {isProjectSaving ? "Creating..." : "Create Project"}
              </button>
            </form>

            {projectStatus ? (
              <p className="mt-4 text-sm text-white/65">{projectStatus}</p>
            ) : null}
          </article>

          <article className="rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-md shadow-black/40">
            <div className="mb-6 space-y-2">
              <h2 className="text-xl font-semibold tracking-tight">
                Create Room
              </h2>
              <p className="text-sm text-white/55">
                Uses the project list from the API and creates an active room.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleRoomSubmit}>
              <label className="block space-y-2">
                <span className="text-sm text-white/75">Name</span>
                <input
                  className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-white outline-none transition focus:border-[rgb(209,254,23)] focus:ring-2 focus:ring-[rgb(209,254,23)]/20"
                  type="text"
                  value={roomDraft.name}
                  placeholder="Room name"
                  onChange={(event) =>
                    setRoomDraft((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm text-white/75">Description</span>
                <textarea
                  className="min-h-28 w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-white outline-none transition focus:border-[rgb(209,254,23)] focus:ring-2 focus:ring-[rgb(209,254,23)]/20"
                  value={roomDraft.description}
                  placeholder="Room description"
                  onChange={(event) =>
                    setRoomDraft((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm text-white/75">Project</span>
                <select
                  className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-white outline-none transition focus:border-[rgb(209,254,23)] focus:ring-2 focus:ring-[rgb(209,254,23)]/20"
                  value={roomDraft.projectId}
                  onChange={(event) =>
                    setRoomDraft((current) => ({
                      ...current,
                      projectId: event.target.value,
                    }))
                  }
                >
                  <option value="">Select project</option>
                  {projectOptions.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>

              <button
                className="w-full rounded-xl bg-[rgb(209,254,23)] px-4 py-2.5 font-medium text-black shadow-[0_0_20px_rgba(209,254,23,0.14)] transition duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-[0_12px_36px_rgba(209,254,23,0.22)] active:translate-y-0 active:scale-[0.985]"
                type="submit"
                disabled={isRoomSaving}
              >
                {isRoomSaving ? "Creating..." : "Create Room"}
              </button>
            </form>

            {roomStatus ? (
              <p className="mt-4 text-sm text-white/65">{roomStatus}</p>
            ) : null}
          </article>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-md shadow-black/40">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">
                  Projects from backend
                </h2>
                <p className="text-sm text-white/55">
                  Live data from `GET /api/projects`
                </p>
              </div>
              <span className="rounded-full border border-white/10 bg-black px-3 py-1 text-sm text-white/70">
                {projects.length}
              </span>
            </div>

            <div className="space-y-3">
              {projects.length ? (
                projects.map((project) => (
                  <div
                    key={project.id}
                    className="rounded-xl border border-white/10 bg-black/70 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-medium text-white">{project.name}</h3>
                        <p className="mt-1 text-sm text-white/55">
                          {project.description || "No description"}
                        </p>
                      </div>
                      <span className="rounded-full border border-[rgb(209,254,23)]/20 bg-[rgb(209,254,23)]/8 px-2.5 py-1 text-xs text-[rgb(209,254,23)]">
                        #{project.id}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-white/55">No projects from backend yet.</p>
              )}
            </div>
          </article>

          <article className="rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-md shadow-black/40">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">
                  Rooms from backend
                </h2>
                <p className="text-sm text-white/55">
                  Live data from `GET /api/rooms`
                </p>
              </div>
              <span className="rounded-full border border-white/10 bg-black px-3 py-1 text-sm text-white/70">
                {rooms.length}
              </span>
            </div>

            <div className="space-y-3">
              {projects.length ? (
                projects.map((project) => {
                  const projectRooms = roomsByProjectId.get(project.id) || [];

                  return (
                    <div
                      key={project.id}
                      className="rounded-xl border border-white/10 bg-black/70 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h3 className="font-medium text-white">{project.name}</h3>
                        <span className="text-sm text-white/45">
                          {projectRooms.length} rooms
                        </span>
                      </div>

                      {projectRooms.length ? (
                        <div className="space-y-2">
                          {projectRooms.map((room) => (
                            <div
                              key={room.id}
                              className="rounded-lg border border-white/10 bg-zinc-950 px-3 py-2"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-medium text-white">
                                    {room.name}
                                  </p>
                                  <p className="text-xs text-white/45">
                                    Status: {room.status || "unknown"}
                                  </p>
                                </div>
                                <span className="rounded-full border border-[rgb(209,254,23)]/20 bg-[rgb(209,254,23)]/8 px-2.5 py-1 text-[11px] text-[rgb(209,254,23)]">
                                  #{room.id}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-white/45">
                          No rooms for this project.
                        </p>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-white/55">No rooms from backend yet.</p>
              )}
            </div>
          </article>
        </section>

      </div>
    </main>
  );
};
