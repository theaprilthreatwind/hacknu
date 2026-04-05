import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createProject,
  createRoom,
  fetchCurrentUser,
  fetchProjects,
  fetchRooms,
} from "../../../shared/api/platform";

const initialProjectForm = {
  name: "",
  description: "",
};

const initialRoomForm = {
  projectId: "",
  name: "",
  status: "active",
};

const ModalShell = ({ title, children, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
    <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#131313] shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
      <div className="flex items-center justify-between border-b border-white/10 px-7 py-7">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#7b7b7b]">
            Higgsfield
          </p>
          <h3 className="mt-2 text-xl font-semibold text-[#fefefe]">{title}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-[#fefefe] transition hover:border-[#d1fe17]/40 hover:bg-[#d1fe17]/10 hover:text-[#d1fe17]"
        >
          Close
        </button>
      </div>
      <div className="p-8">{children}</div>
    </div>
  </div>
);

export const ProjectHubPage = ({ sessionConfig, onResetSession }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [projectForm, setProjectForm] = useState(initialProjectForm);
  const [roomForm, setRoomForm] = useState(initialRoomForm);
  const [loading, setLoading] = useState(true);
  const [submittingProject, setSubmittingProject] = useState(false);
  const [submittingRoom, setSubmittingRoom] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadHubData = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const [userResult, projectsResult, roomsResult] = await Promise.all([
      fetchCurrentUser({
        apiBaseUrl: sessionConfig?.apiBaseUrl,
        token: sessionConfig?.token,
      }),
      fetchProjects({
        apiBaseUrl: sessionConfig?.apiBaseUrl,
        token: sessionConfig?.token,
      }),
      fetchRooms({
        apiBaseUrl: sessionConfig?.apiBaseUrl,
        token: sessionConfig?.token,
      }),
    ]);

    if (!userResult.ok) {
      setErrorMessage(userResult.message || "Failed to load current user.");
    }

    if (!projectsResult.ok) {
      setErrorMessage(projectsResult.message || "Failed to load projects.");
    }

    if (!roomsResult.ok) {
      setErrorMessage(roomsResult.message || "Failed to load rooms.");
    }

    const nextUser =
      userResult.payload?.data ||
      userResult.payload ||
      null;

    const nextProjects =
      projectsResult.payload?.data ||
      projectsResult.payload ||
      [];

    const nextRooms =
      roomsResult.payload?.data ||
      roomsResult.payload ||
      [];

    setUser(nextUser);
    setProjects(Array.isArray(nextProjects) ? nextProjects : []);
    setRooms(Array.isArray(nextRooms) ? nextRooms : []);

    if (Array.isArray(nextProjects) && nextProjects.length) {
      setSelectedProjectId((current) => {
        if (current && nextProjects.some((project) => String(project.id) === String(current))) {
          return current;
        }
        return String(nextProjects[0].id);
      });

      setRoomForm((current) => ({
        ...current,
        projectId:
          current.projectId && nextProjects.some((project) => String(project.id) === String(current.projectId))
            ? current.projectId
            : String(nextProjects[0].id),
      }));
    } else {
      setSelectedProjectId("");
      setRoomForm((current) => ({ ...current, projectId: "" }));
    }

    setLoading(false);
  }, [sessionConfig?.apiBaseUrl, sessionConfig?.token]);

  useEffect(() => {
    if (!sessionConfig?.token) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void loadHubData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [sessionConfig?.token, loadHubData]);

  const selectedProject = useMemo(
    () => projects.find((project) => String(project.id) === String(selectedProjectId)) || null,
    [projects, selectedProjectId],
  );

  const selectedProjectRooms = useMemo(
    () => rooms.filter((room) => String(room.project_id) === String(selectedProjectId)),
    [rooms, selectedProjectId],
  );

  const openProjectModal = () => {
    setProjectForm(initialProjectForm);
    setIsProjectModalOpen(true);
  };

  const openRoomModal = () => {
    setRoomForm((current) => ({
      ...current,
      projectId: current.projectId || selectedProjectId || "",
    }));
    setIsRoomModalOpen(true);
  };

  const handleCreateProject = async (event) => {
    event.preventDefault();

    if (!projectForm.name.trim()) {
      setErrorMessage("Project name is required.");
      return;
    }

    setSubmittingProject(true);
    setErrorMessage("");

    const projectResult = await createProject({
      apiBaseUrl: sessionConfig?.apiBaseUrl,
      token: sessionConfig?.token,
      name: projectForm.name.trim(),
      description: projectForm.description.trim(),
    });

    if (!projectResult.ok) {
      setSubmittingProject(false);
      setErrorMessage(projectResult.message || "Failed to create project.");
      return;
    }

    const createdProject =
      projectResult.payload?.data ||
      projectResult.payload;

    const starterRoomResult = await createRoom({
      apiBaseUrl: sessionConfig?.apiBaseUrl,
      token: sessionConfig?.token,
      projectId: createdProject?.id,
      name: `${projectForm.name.trim()} Room`,
      status: "active",
    });

    setSubmittingProject(false);

    if (!starterRoomResult.ok) {
      setErrorMessage(starterRoomResult.message || "Project created, but room creation failed.");
      await loadHubData();
      setIsProjectModalOpen(false);
      return;
    }

    const createdRoom =
      starterRoomResult.payload?.data ||
      starterRoomResult.payload;

    setIsProjectModalOpen(false);
    navigate(`/workspace/${createdRoom.id}`);
  };

  const handleCreateRoom = async (event) => {
    event.preventDefault();

    if (!roomForm.projectId || !roomForm.name.trim()) {
      setErrorMessage("Choose a project and enter a room name.");
      return;
    }

    setSubmittingRoom(true);
    setErrorMessage("");

    const roomResult = await createRoom({
      apiBaseUrl: sessionConfig?.apiBaseUrl,
      token: sessionConfig?.token,
      projectId: roomForm.projectId,
      name: roomForm.name.trim(),
      status: roomForm.status,
    });

    setSubmittingRoom(false);

    if (!roomResult.ok) {
      setErrorMessage(roomResult.message || "Failed to create room.");
      return;
    }

    const createdRoom =
      roomResult.payload?.data ||
      roomResult.payload;

    setIsRoomModalOpen(false);
    navigate(`/workspace/${createdRoom.id}`);
  };

  return (
    <div className="min-h-screen bg-[#131313] text-[#fefefe]">
      <header className="border-b border-white/10 bg-[#131313]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#d1fe17] text-[#131313] shadow-[0_0_24px_rgba(209,254,23,0.2)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#7b7b7b]">
                Higgsfield
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#fefefe]">
                Workspace Hub
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={onResetSession}
            className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-[#fefefe] transition hover:-translate-y-0.5 hover:border-[#d1fe17]/40 hover:bg-[#d1fe17]/10 hover:text-[#d1fe17] hover:shadow-[0_0_24px_rgba(209,254,23,0.18)]"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-6">
        {errorMessage ? (
          <div className="rounded-2xl border border-[#d1fe17]/20 bg-[#1a1a1a] px-5 py-4 text-sm text-[#fefefe]">
            {errorMessage}
          </div>
        ) : null}

        <section className="rounded-[28px] border border-white/10 bg-[#1a1a1a] px-6 py-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#7b7b7b]">
            Profile
          </p>
          <div className="mt-4 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d1fe17] text-lg font-semibold text-[#131313]">
              {user?.name?.slice(0, 1)?.toUpperCase() || "U"}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[#fefefe]">
                {user?.name || "Workspace user"}
              </h2>
              <p className="mt-1 text-sm text-[#7b7b7b]">
                {user?.email || "Connected to backend"}
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="rounded-[28px] border border-white/10 bg-[#1a1a1a] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#7b7b7b]">
                  Projects
                </p>
                <h3 className="mt-2 text-lg font-semibold text-[#fefefe]">Your spaces</h3>
              </div>
              <button
                type="button"
                onClick={openProjectModal}
                className="rounded-2xl bg-[#d1fe17] px-4 py-2 text-sm font-semibold text-[#131313] transition hover:-translate-y-0.5 hover:shadow-[0_0_24px_rgba(209,254,23,0.28)]"
              >
                Create project
              </button>
            </div>

            <div className="space-y-3">
              {loading ? (
                <div className="rounded-2xl border border-white/10 bg-[#131313] px-4 py-5 text-sm text-[#7b7b7b]">
                  Loading projects...
                </div>
              ) : projects.length ? (
                projects.map((project) => {
                  const isActive = String(project.id) === String(selectedProjectId);
                  return (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => {
                        setSelectedProjectId(String(project.id));
                        setRoomForm((current) => ({ ...current, projectId: String(project.id) }));
                      }}
                      className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                        isActive
                          ? "border-[#d1fe17]/30 bg-[#d1fe17]/10 shadow-[0_0_20px_rgba(209,254,23,0.14)]"
                          : "border-white/10 bg-[#131313] hover:border-[#d1fe17]/20 hover:bg-[#d1fe17]/5"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-[#fefefe]">{project.name}</h4>
                        <span className="text-[10px] uppercase tracking-[0.24em] text-[#7b7b7b]">
                          #{project.id}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-[#7b7b7b]">
                        {project.description || "No description yet"}
                      </p>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-[#131313] px-4 py-5 text-sm text-[#7b7b7b]">
                  No projects yet. Start with your first project.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#1a1a1a] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#7b7b7b]">
                  Rooms
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-[#fefefe]">
                  {selectedProject?.name || "Choose a project"}
                </h3>
              </div>

              <button
                type="button"
                onClick={openRoomModal}
                disabled={!projects.length}
                className="rounded-2xl bg-[#d1fe17] px-5 py-3 text-sm font-semibold text-[#131313] transition hover:-translate-y-0.5 hover:shadow-[0_0_24px_rgba(209,254,23,0.28)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Create room
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {loading ? (
                <div className="rounded-2xl border border-white/10 bg-[#131313] px-4 py-5 text-sm text-[#7b7b7b]">
                  Loading rooms...
                </div>
              ) : selectedProjectRooms.length ? (
                selectedProjectRooms.map((room) => (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => navigate(`/workspace/${room.id}`)}
                    className="rounded-[24px] border border-white/10 bg-[#131313] p-5 text-left transition hover:-translate-y-1 hover:border-[#d1fe17]/25 hover:bg-[#1a1a1a] hover:shadow-[0_24px_50px_rgba(0,0,0,0.35)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-lg font-semibold text-[#fefefe]">{room.name}</h4>
                        <p className="mt-2 text-sm text-[#7b7b7b]">
                          Room ready for live brainstorming and AI collaboration.
                        </p>
                      </div>
                      <span className="rounded-full border border-[#d1fe17]/20 bg-[#d1fe17]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#d1fe17]">
                        {room.status || "active"}
                      </span>
                    </div>
                    <div className="mt-5 flex items-center justify-between">
                      <span className="text-xs text-[#7b7b7b]">Room #{room.id}</span>
                      <span className="text-sm font-medium text-[#d1fe17]">Open workspace</span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-[24px] border border-dashed border-white/10 bg-[#131313] px-5 py-8 text-sm text-[#7b7b7b]">
                  {selectedProject
                    ? "No rooms yet. Create one to jump straight into the workspace."
                    : "Choose a project to see its rooms."}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {isProjectModalOpen ? (
        <ModalShell title="Create Project" onClose={() => setIsProjectModalOpen(false)}>
          <form className="space-y-5" onSubmit={handleCreateProject}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[#fefefe]">Name</span>
              <input
                type="text"
                value={projectForm.name}
                onChange={(event) =>
                  setProjectForm((current) => ({ ...current, name: event.target.value }))
                }
                className="w-full rounded-2xl border border-white/10 bg-[#1a1a1a] px-4 py-3 text-[#fefefe] outline-none transition focus:border-[#d1fe17]/40 focus:bg-[#131313]"
                placeholder="HackNU demo"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[#fefefe]">Description</span>
              <textarea
                rows={4}
                value={projectForm.description}
                onChange={(event) =>
                  setProjectForm((current) => ({ ...current, description: event.target.value }))
                }
                className="w-full rounded-2xl border border-white/10 bg-[#1a1a1a] px-4 py-3 text-[#fefefe] outline-none transition focus:border-[#d1fe17]/40 focus:bg-[#131313]"
                placeholder="What are you building in this workspace?"
              />
            </label>

            <button
              type="submit"
              disabled={submittingProject}
              className="w-full rounded-2xl bg-[#d1fe17] px-5 py-3 text-sm font-semibold text-[#131313] transition hover:-translate-y-0.5 hover:shadow-[0_0_24px_rgba(209,254,23,0.28)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submittingProject ? "Creating..." : "Create project"}
            </button>
          </form>
        </ModalShell>
      ) : null}

      {isRoomModalOpen ? (
        <ModalShell title="Create Room" onClose={() => setIsRoomModalOpen(false)}>
          <form className="space-y-5" onSubmit={handleCreateRoom}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[#fefefe]">Project</span>
              <select
                value={roomForm.projectId}
                onChange={(event) =>
                  setRoomForm((current) => ({ ...current, projectId: event.target.value }))
                }
                className="w-full rounded-2xl border border-white/10 bg-[#1a1a1a] px-4 py-3 text-[#fefefe] outline-none transition focus:border-[#d1fe17]/40 focus:bg-[#131313]"
              >
                <option value="">Choose project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[#fefefe]">Room name</span>
              <input
                type="text"
                value={roomForm.name}
                onChange={(event) =>
                  setRoomForm((current) => ({ ...current, name: event.target.value }))
                }
                className="w-full rounded-2xl border border-white/10 bg-[#1a1a1a] px-4 py-3 text-[#fefefe] outline-none transition focus:border-[#d1fe17]/40 focus:bg-[#131313]"
                placeholder="Main board"
              />
            </label>

            <button
              type="submit"
              disabled={submittingRoom}
              className="w-full rounded-2xl bg-[#d1fe17] px-5 py-3 text-sm font-semibold text-[#131313] transition hover:-translate-y-0.5 hover:shadow-[0_0_24px_rgba(209,254,23,0.28)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submittingRoom ? "Creating..." : "Create room"}
            </button>
          </form>
        </ModalShell>
      ) : null}
    </div>
  );
};
