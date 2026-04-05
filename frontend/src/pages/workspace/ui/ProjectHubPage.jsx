import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchProjects,
  createProject,
  fetchRooms,
  createRoom,
} from '../../../shared/api/platform';

// ── Small helpers ─────────────────────────────────────────────────────────────
const initials = (name) =>
  (name || 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

// ── Spinner ───────────────────────────────────────────────────────────────────
const Spinner = () => (
  <svg
    className="animate-spin"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

// ── ProjectCard ───────────────────────────────────────────────────────────────
const ProjectCard = ({ project, isActive, onClick }) => (
  <div
    onClick={onClick}
    className={[
      'px-4 py-3 rounded-xl border cursor-pointer transition-all duration-150 select-none',
      isActive
        ? 'border-[#d1fe17] bg-[#d1fe17]/5 shadow-[0_0_12px_rgba(209,254,23,0.12)]'
        : 'border-[#2a2a2a] bg-[#1a1a1a] hover:border-[#3a3a3a]',
    ].join(' ')}
  >
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p
          className={`text-sm font-semibold truncate ${
            isActive ? 'text-[#d1fe17]' : 'text-[#fefefe]'
          }`}
        >
          {project.name}
        </p>
        {project.description && (
          <p className="text-[11px] text-[#7b7b7b] mt-0.5 truncate">
            {project.description}
          </p>
        )}
      </div>
      <span className="text-[10px] font-mono text-[#3a3a3a] flex-shrink-0 mt-0.5">
        #{project.id}
      </span>
    </div>
  </div>
);

// ── RoomCard ──────────────────────────────────────────────────────────────────
const RoomCard = ({ room, onOpen }) => (
  <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5 flex flex-col gap-3 hover:border-[#3a3a3a] transition-all group">
    <div className="flex items-start justify-between gap-2">
      <h3 className="text-sm font-semibold text-[#fefefe] truncate">
        {room.name}
      </h3>
      <span className="flex-shrink-0 text-[9px] font-mono uppercase tracking-widest text-[#d1fe17] border border-[#d1fe17]/40 px-2 py-0.5 rounded-full">
        {room.status === 'active' ? 'ACTIVE' : room.status?.toUpperCase() ?? 'OPEN'}
      </span>
    </div>

    <p className="text-[11px] text-[#7b7b7b] leading-relaxed flex-1">
      Room ready for live brainstorming and AI collaboration.
    </p>

    <div className="flex items-center justify-between pt-2 border-t border-[#2a2a2a]">
      <span className="text-[10px] font-mono text-[#3a3a3a]">Room #{room.id}</span>
      <button
        onClick={() => onOpen(room)}
        className="text-[11px] font-semibold text-[#d1fe17] hover:underline group-hover:translate-x-0.5 transition-transform"
      >
        Open workspace →
      </button>
    </div>
  </div>
);

// ── Modal: Create Project ─────────────────────────────────────────────────────
const CreateProjectModal = ({ onClose, onCreate, loading }) => {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate({ name: name.trim(), description: desc.trim() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-base font-bold text-[#fefefe] mb-4">New Project</h2>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-[#7b7b7b] mb-1 block">
              Project name *
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Hackathon 2026"
              className="w-full bg-[#131313] border border-[#2a2a2a] focus:border-[#d1fe17]/50 outline-none rounded-xl px-3 py-2.5 text-sm text-[#fefefe] placeholder-[#3a3a3a] transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-[#7b7b7b] mb-1 block">
              Description
            </label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="What's this project about?"
              rows={3}
              className="w-full bg-[#131313] border border-[#2a2a2a] focus:border-[#d1fe17]/50 outline-none rounded-xl px-3 py-2.5 text-sm text-[#fefefe] placeholder-[#3a3a3a] transition-colors resize-none"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-[#2a2a2a] text-sm text-[#7b7b7b] hover:text-[#fefefe] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 py-2.5 rounded-xl bg-[#d1fe17] hover:brightness-110 text-[#131313] text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Spinner /> : null}
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Modal: Create Room ─────────────────────────────────────────────────────────
const CreateRoomModal = ({ onClose, onCreate, loading }) => {
  const [name, setName] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate({ name: name.trim(), status: 'active' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-base font-bold text-[#fefefe] mb-4">New Room</h2>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-[#7b7b7b] mb-1 block">
              Room name *
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Main board"
              className="w-full bg-[#131313] border border-[#2a2a2a] focus:border-[#d1fe17]/50 outline-none rounded-xl px-3 py-2.5 text-sm text-[#fefefe] placeholder-[#3a3a3a] transition-colors"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-[#2a2a2a] text-sm text-[#7b7b7b] hover:text-[#fefefe] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 py-2.5 rounded-xl bg-[#d1fe17] hover:brightness-110 text-[#131313] text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Spinner /> : null}
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export const ProjectHubPage = ({ sessionConfig, onResetSession }) => {
  const navigate = useNavigate();

  const { token, apiBaseUrl, name: userName, login: userEmail } = sessionConfig ?? {};

  // ── State ──────────────────────────────────────────────────────────
  const [projects, setProjects]             = useState([]);
  const [rooms, setRooms]                   = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingRooms, setLoadingRooms]     = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateRoom, setShowCreateRoom]   = useState(false);
  const [savingProject, setSavingProject]   = useState(false);
  const [savingRoom, setSavingRoom]         = useState(false);
  const [error, setError]                   = useState('');

  // ── Load projects ──────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    setLoadingProjects(true);
    setError('');
    fetchProjects({ apiBaseUrl, token })
      .then((res) => {
        const list =
          res?.payload?.data ?? res?.payload ?? res?.data?.data ?? res?.data ?? res ?? [];
        const arr = Array.isArray(list) ? list : [];
        setProjects(arr);
        if (arr.length > 0) setSelectedProjectId(arr[0].id);
      })
      .catch((err) => setError(`Failed to load projects: ${err.message}`))
      .finally(() => setLoadingProjects(false));
  }, [token, apiBaseUrl]);

  // ── Load rooms when selected project changes ───────────────────────
  useEffect(() => {
    if (!token || !selectedProjectId) return;
    setLoadingRooms(true);
    fetchRooms({ apiBaseUrl, token })
      .then((res) => {
        const list =
          res?.payload?.data ?? res?.payload ?? res?.data?.data ?? res?.data ?? res ?? [];
        const arr = Array.isArray(list) ? list : [];
        setRooms(arr.filter((r) => r.project_id === selectedProjectId));
      })
      .catch(console.error)
      .finally(() => setLoadingRooms(false));
  }, [token, apiBaseUrl, selectedProjectId]);

  // ── Handlers ───────────────────────────────────────────────────────
  const handleCreateProject = useCallback(
    async ({ name, description }) => {
      setSavingProject(true);
      try {
        const res = await createProject({ apiBaseUrl, token, name, description });
        const newProject =
          res?.payload?.data ?? res?.payload ?? res?.data?.data ?? res?.data ?? res;
        setProjects((prev) => [...prev, newProject]);
        setSelectedProjectId(newProject.id);
        setShowCreateProject(false);
      } catch (err) {
        alert(`Error: ${err.message}`);
      } finally {
        setSavingProject(false);
      }
    },
    [apiBaseUrl, token]
  );

  const handleCreateRoom = useCallback(
    async ({ name, status }) => {
      if (!selectedProjectId) return;
      setSavingRoom(true);
      try {
        const res = await createRoom({
          apiBaseUrl,
          token,
          projectId: selectedProjectId,
          name,
          status,
        });
        const newRoom =
          res?.payload?.data ?? res?.payload ?? res?.data?.data ?? res?.data ?? res;
        setRooms((prev) => [...prev, newRoom]);
        setShowCreateRoom(false);
      } catch (err) {
        alert(`Error: ${err.message}`);
      } finally {
        setSavingRoom(false);
      }
    },
    [apiBaseUrl, token, selectedProjectId]
  );

  const handleOpenRoom = useCallback(
    (room) => {
      // Prefer share_uuid, fallback to id
      const dest = room.share_uuid ? `/room/${room.share_uuid}` : `/room/${room.id}`;
      navigate(dest);
    },
    [navigate]
  );

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0c0c0c] flex flex-col font-sans text-[#fefefe]">

      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-8 py-4 bg-[#131313]/80 border-b border-[#1e1e1e] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#d1fe17] flex items-center justify-center flex-shrink-0 shadow-[0_0_16px_rgba(209,254,23,0.3)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#131313" />
            </svg>
          </div>
          <div>
            <p className="text-[9px] font-semibold text-[#7b7b7b] uppercase tracking-[0.2em] leading-none">
              HIGGSFIELD
            </p>
            <p className="text-base font-bold text-[#fefefe] leading-tight tracking-tight">
              Workspace Hub
            </p>
          </div>
        </div>

        <button
          onClick={onResetSession}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-neutral-800 hover:border-neutral-600 text-sm text-neutral-400 hover:text-white transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sign out
        </button>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-8 py-8 flex flex-col gap-6">

        {/* ── HERO HEADER ────────────────────────────────────────────── */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#d1fe17] rounded-full flex items-center justify-center">
              <span className="text-black font-bold text-xl">⚡</span>
            </div>
            <div>
              <div className="text-[10px] tracking-widest text-[#d1fe17] font-bold uppercase">Higgsfield</div>
              <h1 className="text-2xl text-white font-semibold">Workspace Hub</h1>
            </div>
          </div>
          <button
            onClick={onResetSession}
            className="px-5 py-2 text-sm font-medium text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-600 rounded-xl transition-all duration-300 hover:bg-neutral-800/50"
          >
            Sign out
          </button>
        </div>

        {/* ── PROFILE CARD ───────────────────────────────────────────── */}
        <section>
          <p className="text-[9px] font-semibold text-[#3a3a3a] uppercase tracking-[0.2em] mb-3">
            PROFILE
          </p>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl px-6 py-4 flex items-center gap-4">
            {/* Avatar */}
            <div className="w-12 h-12 rounded-full bg-[#d1fe17] flex items-center justify-center flex-shrink-0 shadow-[0_0_12px_rgba(209,254,23,0.25)]">
              <span className="text-[#131313] font-bold text-sm leading-none">
                {initials(userName)}
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#fefefe]">
                {userName || 'User'}
              </p>
              <p className="text-xs text-[#7b7b7b]">{userEmail || '—'}</p>
            </div>
          </div>
        </section>

        {/* ── ERROR BANNER ───────────────────────────────────────────── */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {/* ── MAIN GRID ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6 flex-1">

          {/* LEFT: PROJECTS ─────────────────────────────────────────── */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-semibold text-[#3a3a3a] uppercase tracking-[0.2em]">
                PROJECTS
              </p>
              <button
                onClick={() => setShowCreateProject(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#d1fe17] hover:brightness-110 text-[#131313] text-[11px] font-bold rounded-lg transition-all shadow-[0_0_10px_rgba(209,254,23,0.2)]"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Create project
              </button>
            </div>

            <p className="text-xs font-medium text-[#7b7b7b] -mt-2">Your spaces</p>

            <div className="flex flex-col gap-2 overflow-y-auto max-h-[calc(100vh-22rem)]">
              {loadingProjects ? (
                <div className="flex items-center justify-center py-8 text-[#7b7b7b]">
                  <Spinner />
                </div>
              ) : projects.length === 0 ? (
                <p className="text-xs text-[#3a3a3a] px-2 py-4 text-center">
                  No projects yet. Create one!
                </p>
              ) : (
                projects.map((p) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    isActive={p.id === selectedProjectId}
                    onClick={() => setSelectedProjectId(p.id)}
                  />
                ))
              )}
            </div>
          </section>

          {/* RIGHT: ROOMS ───────────────────────────────────────────── */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-semibold text-[#3a3a3a] uppercase tracking-[0.2em]">
                  ROOMS
                </p>
                <p className="text-xs font-medium text-[#7b7b7b] mt-0.5">
                  {selectedProject ? selectedProject.name : 'Select a project'}
                </p>
              </div>
              {selectedProjectId && (
                <button
                  onClick={() => setShowCreateRoom(true)}
                  disabled={!selectedProjectId}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#d1fe17] hover:brightness-110 text-[#131313] text-[11px] font-bold rounded-lg transition-all shadow-[0_0_10px_rgba(209,254,23,0.2)] disabled:opacity-40"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Create room
                </button>
              )}
            </div>

            {loadingRooms ? (
              <div className="flex items-center justify-center py-12 text-[#7b7b7b]">
                <Spinner />
              </div>
            ) : !selectedProjectId ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
                <div className="w-12 h-12 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center mb-2">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3a3a3a" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
                  </svg>
                </div>
                <p className="text-xs text-[#3a3a3a]">Pick a project to see its rooms</p>
              </div>
            ) : rooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
                <p className="text-xs text-[#3a3a3a]">No rooms in this project yet.</p>
                <button
                  onClick={() => setShowCreateRoom(true)}
                  className="text-[11px] text-[#d1fe17] hover:underline"
                >
                  Create the first room →
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 overflow-y-auto max-h-[calc(100vh-22rem)] pr-1">
                {rooms.map((room) => (
                  <RoomCard key={room.id} room={room} onOpen={handleOpenRoom} />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* ── MODALS ─────────────────────────────────────────────────── */}
      {showCreateProject && (
        <CreateProjectModal
          loading={savingProject}
          onClose={() => setShowCreateProject(false)}
          onCreate={handleCreateProject}
        />
      )}
      {showCreateRoom && (
        <CreateRoomModal
          loading={savingRoom}
          onClose={() => setShowCreateRoom(false)}
          onCreate={handleCreateRoom}
        />
      )}
    </div>
  );
};