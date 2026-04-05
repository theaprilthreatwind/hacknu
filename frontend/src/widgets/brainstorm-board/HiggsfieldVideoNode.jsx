import React, { useEffect, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { generateHiggsfieldVideo } from '../../shared/api/media';

/**
 * HiggsfieldVideoNode — Smart Node
 *
 * Lifecycle states:
 *   'waiting'  → spawned, shows "Connect an image node" prompt
 *   'loading'  → triggered by onConnect in WorkspacePage, fires API
 *   'done'     → video ready, plays inline
 *
 * Status transitions:
 *   waiting ──(edge connected)──► loading ──(API resolves)──► done | error
 */
export function HiggsfieldVideoNode({ id, data, selected }) {
  const { setNodes } = useReactFlow();
  const { status = 'waiting', prompt, url, videoUrl } = data;
  const resolvedUrl = url || videoUrl;
  const [stylePrompt, setStylePrompt] = useState(data.prompt || '');
  const apiBaseUrl = data.apiBaseUrl || 'http://127.0.0.1:8000/api';
  const token = data.token || '';
  const roomId = data.roomId || 1;
  const finalPrompt = data.finalPrompt || data.prompt || 'Cinematic B-roll';
  const imageUrl = data.imageUrl || null;

  // ── Fire generation only when status flips to 'loading' ──────────
  useEffect(() => {
    if (status !== 'loading') return;

    let isMounted = true;

    const fetchVideo = async () => {
      try {
        const result = await generateHiggsfieldVideo({
          apiBaseUrl,
          token,
          roomId,
          prompt: finalPrompt,
          imageUrl,
        });

        if (isMounted) {
          setNodes((nds) =>
            nds.map((node) =>
              node.id === id
                ? { ...node, data: { ...node.data, status: 'done', url: result.url } }
                : node
            )
          );
        }
      } catch {
        if (isMounted) {
          setNodes((nds) =>
            nds.map((node) =>
              node.id === id
                ? { ...node, data: { ...node.data, status: 'error' } }
                : node
            )
          );
        }
      }
    };

    fetchVideo();
    return () => { isMounted = false; };
  }, [status, id, setNodes, apiBaseUrl, token, roomId, finalPrompt, imageUrl]); // only re-runs if status changes to 'loading'

  return (
    <div
      className={[
        'relative min-w-[240px] rounded-2xl overflow-hidden border transition-all duration-300 group',
        'bg-h_bg_card shadow-[0_0_30px_rgba(0,0,0,0.7)]',
        selected
          ? 'border-h_accent shadow-[0_0_20px_rgba(209,254,23,0.3)]'
          : 'border-[#2a2a2a] hover:border-h_accent/50 hover:shadow-[0_0_20px_rgba(209,254,23,0.15)]',
      ].join(' ')}
    >
      {/* ── Header bar ── */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a2a2a]">
        <div className="flex items-center gap-2">
          {/* Status dot */}
          <span
            className={[
              'w-2 h-2 rounded-full flex-shrink-0 transition-all duration-500',
              status === 'loading'
                ? 'bg-h_accent animate-pulse shadow-[0_0_8px_rgba(209,254,23,0.8)]'
                : status === 'done'
                ? 'bg-h_accent shadow-[0_0_6px_rgba(209,254,23,0.5)]'
                : status === 'error'
                ? 'bg-[#7b7b7b]'
                : 'bg-[#3a3a3a]', // waiting
            ].join(' ')}
          />
          <span className="text-[10px] font-mono uppercase tracking-widest text-h_text_secondary">
            {status === 'waiting'  && 'Waiting for input'}
            {status === 'loading'  && 'Generating…'}
            {status === 'done'     && 'Ready'}
            {status === 'error'    && 'Error'}
          </span>
        </div>
        {/* Higgsfield spark icon */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-h_accent opacity-70">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor"/>
        </svg>
      </div>

      {/* ── Video / preview area ── */}
      <div className="relative aspect-video bg-h_black flex items-center justify-center overflow-hidden">

        {/* WAITING: connect an image node */}
        {status === 'waiting' && (
          <div className="flex flex-col items-center gap-3 px-4 text-center">
            <div className="w-10 h-10 rounded-full border border-[#3a3a3a] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-h_text_secondary">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
            </div>
            <div className="space-y-1">
              <span className="block text-[10px] uppercase tracking-widest border border-h_text_secondary/20 px-2 py-0.5 rounded text-h_text_secondary">
                Waiting for input
              </span>
              <span className="block text-xs text-h_text_secondary/60">
                Connect an image node ↑
              </span>
            </div>
          </div>
        )}

        {/* LOADING: spinner + pulsing rings */}
        {status === 'loading' && (
          <div className="flex flex-col items-center gap-3">
            {/* Outer accent rings */}
            <div className="relative flex items-center justify-center">
              <div className="absolute w-14 h-14 rounded-full border border-h_accent/20 animate-ping" />
              <div className="absolute w-9 h-9  rounded-full border border-h_accent/40 animate-ping [animation-delay:0.25s]" />
              {/* Spinner */}
              <div className="w-8 h-8 border-2 border-h_accent/30 border-t-h_accent rounded-full animate-spin relative z-10" />
            </div>
            <span className="text-xs text-h_accent animate-pulse font-medium tracking-wide">
              Generating video…
            </span>
          </div>
        )}

        {/* DONE: autoplay video */}
        {status === 'done' && resolvedUrl && (
          <video
            src={resolvedUrl}
            autoPlay
            loop
            muted
            playsInline
            controls
            className="w-full h-full object-cover"
          />
        )}

        {status === 'done' && !resolvedUrl && (
          <div className="text-h_text_secondary text-xs">No preview</div>
        )}

        {/* ERROR */}
        {status === 'error' && (
          <div className="flex flex-col items-center gap-2 text-h_text_secondary text-xs">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#7b7b7b]">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            Generation failed
          </div>
        )}
      </div>

      {/* ── Animation style input ── */}
      <div className="px-3 py-2.5 border-t border-[#2a2a2a]">
        <input
          type="text"
          placeholder="Animation style…"
          value={stylePrompt}
          disabled={status === 'loading' || status === 'done'}
          onChange={(e) => {
            setStylePrompt(e.target.value);
            setNodes((nds) =>
              nds.map((node) =>
                node.id === id
                  ? { ...node, data: { ...node.data, prompt: e.target.value } }
                  : node
              )
            );
          }}
          className="w-full bg-[#131313] border border-[#2a2a2a] focus:border-[#d1fe17]/50 outline-none rounded-lg px-3 py-2 text-[11px] text-[#fefefe] placeholder-[#7b7b7b] transition-colors disabled:opacity-40"
        />
        {prompt && status !== 'waiting' && (
          <p className="mt-1 text-[10px] text-[#7b7b7b] line-clamp-1">{prompt}</p>
        )}
      </div>

      {/* ── Connection handles ── */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-[#131313] !border-2 !border-[#d1fe17] opacity-0 group-hover:opacity-100 transition-opacity"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-[#131313] !border-2 !border-[#d1fe17] opacity-0 group-hover:opacity-100 transition-opacity"
      />
    </div>
  );
}
