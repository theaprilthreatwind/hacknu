import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';

// ── Error message helper ──────────────────────────────────────────────────────
function getUserMediaErrorMessage(error) {
  if (!error) return 'Unknown media error.';
  switch (error.name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'Camera/mic access denied. Allow access in browser settings and retry.';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'No camera or microphone found. Connect a device and retry.';
    case 'NotReadableError':
    case 'TrackStartError':
      return 'Camera/microphone is already in use by another app.';
    case 'OverconstrainedError':
      return 'Camera constraints could not be satisfied.';
    default:
      return `Media error: ${error.message}`;
  }
}

// ── Inline icons ──────────────────────────────────────────────────────────────
const IconMicOn  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>;
const IconMicOff = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>;
const IconCamOn  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>;
const IconCamOff = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
const IconLeave  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.42 19.42 0 0 1 4.43 9.88a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.34 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.32 8.9a16 16 0 0 0 3.36 4.41z"/></svg>;

// ── Status dot ────────────────────────────────────────────────────────────────
const StatusDot = ({ status }) => {
  const cls = {
    idle:       'bg-[#3a3a3a]',
    connecting: 'bg-yellow-400 animate-pulse shadow-[0_0_6px_rgba(234,179,8,0.8)]',
    connected:  'bg-[#d1fe17] shadow-[0_0_6px_rgba(209,254,23,0.8)]',
    error:      'bg-red-500',
  }[status] ?? 'bg-[#3a3a3a]';
  return <div className={`w-2 h-2 rounded-full flex-shrink-0 transition-all duration-500 ${cls}`} />;
};

// ── Video tile ────────────────────────────────────────────────────────────────
const VideoTile = ({ label, videoRef, showPlaceholder, placeholderText, tall }) => (
  <div
    className="relative flex-1 bg-[#0d0d0d] rounded-lg overflow-hidden flex items-center justify-center"
    style={{ height: tall ? '180px' : '80px' }}
  >
    <video
      ref={videoRef}
      autoPlay
      muted
      playsInline
      className="w-full h-full object-cover rounded-lg"
    />
    {showPlaceholder && (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 select-none pointer-events-none px-2 text-center">
        <div className="w-9 h-9 rounded-full bg-[#2a2a2a] flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7b7b7b" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
        <span className="text-[9px] text-[#7b7b7b] leading-tight">{placeholderText}</span>
      </div>
    )}
    <span className="absolute bottom-1.5 left-2 text-[9px] font-mono text-[#7b7b7b] z-20 bg-black/50 px-1 rounded">
      {label}
    </span>
  </div>
);

// ── Main widget ───────────────────────────────────────────────────────────────
export function LiveVoiceWidget({ roomId, apiBaseUrl, token }) {
  const [status, setStatus]       = useState('idle');
  const [errorMsg, setErrorMsg]   = useState('');
  const [micOn, setMicOn]         = useState(true);
  const [camOn, setCamOn]         = useState(true);
  const [hasRemote, setHasRemote] = useState(false);

  const localVideoRef  = useRef(null);
  const remoteVideoRef = useRef(null);
  const roomRef        = useRef(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => { leaveCall(); }, []);

  const leaveCall = useCallback(async () => {
    if (roomRef.current) {
      await roomRef.current.disconnect();
      roomRef.current = null;
    }
    if (localVideoRef.current)  localVideoRef.current.srcObject  = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setStatus('idle');
    setHasRemote(false);
    setMicOn(true);
    setCamOn(true);
  }, []);

  const joinCall = useCallback(async () => {
    setStatus('connecting');
    setErrorMsg('');

    // 1. Permissions
    try {
      await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch (err) {
      setErrorMsg(getUserMediaErrorMessage(err));
      setStatus('error');
      return;
    }

    // 2. Token from backend
    let livekitUrl, livekitToken;
    try {
      const res = await fetch(`${apiBaseUrl}/rooms/${roomId}/video-token`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      livekitUrl   = data.livekit_url || data.url;
      livekitToken = data.token       || data.livekit_token;
      if (!livekitUrl || !livekitToken) throw new Error('Missing livekit_url or token');
    } catch (err) {
      setErrorMsg(`Token error: ${err.message}`);
      setStatus('error');
      return;
    }

    // 3. Connect
    try {
      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;

      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === Track.Kind.Video && remoteVideoRef.current) {
          track.attach(remoteVideoRef.current);
          setHasRemote(true);
        }
      });
      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        if (track.kind === Track.Kind.Video) {
          track.detach();
          setHasRemote(false);
        }
      });
      room.on(RoomEvent.Disconnected, () => {
        setStatus('idle');
        setHasRemote(false);
      });

      await room.connect(livekitUrl, livekitToken);
      await room.localParticipant.setCameraEnabled(true);
      await room.localParticipant.setMicrophoneEnabled(true);

      const camPub = Array.from(room.localParticipant.videoTrackPublications.values()).find(p => p.track);
      if (camPub?.track && localVideoRef.current) camPub.track.attach(localVideoRef.current);

      setStatus('connected');
    } catch (err) {
      setErrorMsg(`Connection failed: ${err.message}`);
      setStatus('error');
      await leaveCall();
    }
  }, [roomId, apiBaseUrl, token, leaveCall]);

  const toggleMic = useCallback(async () => {
    if (!roomRef.current) return;
    const next = !micOn;
    await roomRef.current.localParticipant.setMicrophoneEnabled(next);
    setMicOn(next);
  }, [micOn]);

  const toggleCam = useCallback(async () => {
    if (!roomRef.current) return;
    const next = !camOn;
    await roomRef.current.localParticipant.setCameraEnabled(next);
    if (next) {
      const camPub = Array.from(roomRef.current.localParticipant.videoTrackPublications.values()).find(p => p.track);
      if (camPub?.track && localVideoRef.current) camPub.track.attach(localVideoRef.current);
    } else if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    setCamOn(next);
  }, [camOn]);

  const isConnected  = status === 'connected';
  const isConnecting = status === 'connecting';

  const statusLabel = {
    idle:       'Video call is not connected.',
    connecting: 'Connecting to Live Voice…',
    connected:  'Connected to Live Voice.',
    error:      errorMsg || 'Connection error.',
  }[status];

  return (
    // idle/connecting: w-72 | connected: w-[560px] × h grows via taller tiles
    <div
      className={`transition-all duration-300 bg-[#111]/95 backdrop-blur-md rounded-2xl border border-[#2a2a2a] overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.85)] ${
        isConnected ? 'w-[560px]' : 'w-72'
      }`}
    >
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-[#2a2a2a] flex items-center justify-between">
        <span className="text-[10px] font-semibold text-[#7b7b7b] uppercase tracking-widest">
          Live Voice
        </span>
        <StatusDot status={status} />
      </div>

      {/* Status line */}
      <div className="px-4 pt-2.5 pb-1">
        <p className={`text-[10px] transition-colors ${status === 'error' ? 'text-red-400' : 'text-[#7b7b7b]'}`}>
          {statusLabel}
        </p>
      </div>

      {/* Video tiles — tall (180px) when connected, compact (80px) otherwise */}
      <div className="px-4 pb-3 flex gap-2">
        <VideoTile
          label="You"
          videoRef={localVideoRef}
          showPlaceholder={!isConnected || !camOn}
          placeholderText="Camera off"
          tall={isConnected}
        />
        <VideoTile
          label="Remote"
          videoRef={remoteVideoRef}
          showPlaceholder={!hasRemote}
          placeholderText="Waiting for colleagues…"
          tall={isConnected}
        />
      </div>

      {/* Controls */}
      <div className="px-4 pb-4">
        {isConnected ? (
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMic}
              title={micOn ? 'Mute' : 'Unmute'}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-semibold transition-all border ${
                micOn
                  ? 'bg-[#1a1a1a] border-[#2a2a2a] text-[#fefefe] hover:border-[#d1fe17]/40'
                  : 'bg-[#d1fe17]/10 border-[#d1fe17]/30 text-[#d1fe17]'
              }`}
            >
              {micOn ? <IconMicOn /> : <IconMicOff />}
              <span>{micOn ? 'Mute' : 'Unmuted'}</span>
            </button>

            <button
              onClick={toggleCam}
              title={camOn ? 'Stop cam' : 'Start cam'}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-semibold transition-all border ${
                camOn
                  ? 'bg-[#1a1a1a] border-[#2a2a2a] text-[#fefefe] hover:border-[#d1fe17]/40'
                  : 'bg-[#d1fe17]/10 border-[#d1fe17]/30 text-[#d1fe17]'
              }`}
            >
              {camOn ? <IconCamOn /> : <IconCamOff />}
              <span>{camOn ? 'Cam' : 'Cam off'}</span>
            </button>

            <button
              onClick={leaveCall}
              title="Leave call"
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-semibold bg-red-600 hover:bg-red-500 text-white border border-red-500 transition-all"
            >
              <IconLeave />
              <span>Leave</span>
            </button>
          </div>
        ) : isConnecting ? (
          <button disabled className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 text-[11px] font-semibold cursor-not-allowed">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="animate-spin">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            Connecting…
          </button>
        ) : (
          <button
            onClick={joinCall}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#d1fe17] hover:brightness-110 text-[#131313] text-[11px] font-bold transition-all shadow-[0_0_16px_rgba(209,254,23,0.2)]"
          >
            <IconCamOn />
            {status === 'error' ? 'Retry' : 'Join video call'}
          </button>
        )}
      </div>
    </div>
  );
}
