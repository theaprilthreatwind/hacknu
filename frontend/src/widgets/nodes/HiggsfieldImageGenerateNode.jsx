import React, { useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { generateHiggsfieldImage } from '../../shared/api/media';

/**
 * HiggsfieldImageGenerateNode
 * States: idle | generating | done
 * - Real call to generateHiggsfieldImage (Pollinations fallback on error)
 * - Passes data.url + data.prompt downstream for Image-to-Video pipeline
 */
export function HiggsfieldImageGenerateNode({ id, data, selected }) {
  const { setNodes } = useReactFlow();
  const [localPrompt, setLocalPrompt] = useState(data.prompt || '');
  const [status, setStatus] = useState(data.status || 'idle'); // idle | generating | done

  const handleGenerate = async () => {
    if (!localPrompt.trim() || status === 'generating') return;

    // 1. Immediately flip to generating so spinner shows
    setStatus('generating');
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id
          ? { ...n, data: { ...n.data, status: 'generating', prompt: localPrompt } }
          : n
      )
    );

    // 2. Call real API
    const result = await generateHiggsfieldImage({
      apiBaseUrl: data.apiBaseUrl || 'http://127.0.0.1:8000/api',
      token:      data.token      || '',
      roomId:     data.roomId     || 1,
      prompt:     localPrompt,
    });

    // 3. Write image URL into node data
    setStatus('done');
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id
          ? { ...n, data: { ...n.data, status: 'done', url: result.url, prompt: localPrompt } }
          : n
      )
    );
  };

  const isGenerating = status === 'generating';
  const isDone = status === 'done';
  const resolvedUrl = data.url;

  return (
    <div
      style={{ minWidth: 240 }}
      className={[
        'relative rounded-2xl overflow-hidden border transition-all duration-300 group',
        'bg-[#1a1a1a] shadow-[0_0_30px_rgba(0,0,0,0.7)]',
        selected
          ? 'border-[#d1fe17] shadow-[0_0_20px_rgba(209,254,23,0.3)]'
          : 'border-[#2a2a2a] hover:border-[#d1fe17]/50 hover:shadow-[0_0_20px_rgba(209,254,23,0.12)]',
      ].join(' ')}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a2a2a]">
        <div className="flex items-center gap-2">
          <span
            className={[
              'w-2 h-2 rounded-full flex-shrink-0 transition-all duration-500',
              isGenerating
                ? 'bg-[#d1fe17] animate-pulse shadow-[0_0_8px_rgba(209,254,23,0.8)]'
                : isDone
                ? 'bg-[#d1fe17] shadow-[0_0_6px_rgba(209,254,23,0.5)]'
                : 'bg-[#3a3a3a]',
            ].join(' ')}
          />
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#7b7b7b]">
            {isGenerating ? 'Generating…' : isDone ? 'Image ready' : 'AI Generate'}
          </span>
        </div>
        {/* Spark icon */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="opacity-70">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#d1fe17" />
        </svg>
      </div>

      {/* Image preview area */}
      <div className="relative aspect-video bg-[#131313] flex items-center justify-center overflow-hidden">
        {isGenerating && (
          <div className="flex flex-col items-center gap-3">
            <div className="relative flex items-center justify-center">
              <div className="absolute w-14 h-14 rounded-full border border-[#d1fe17]/20 animate-ping" />
              <div className="absolute w-9 h-9 rounded-full border border-[#d1fe17]/40 animate-ping [animation-delay:0.25s]" />
              <div className="w-8 h-8 border-2 border-[#d1fe17]/30 border-t-[#d1fe17] rounded-full animate-spin relative z-10" />
            </div>
            <span className="text-xs text-[#d1fe17] animate-pulse font-medium tracking-wide px-4 text-center">
              {localPrompt}
            </span>
          </div>
        )}
        {!isGenerating && resolvedUrl && (
          <img
            src={resolvedUrl}
            alt="AI generated"
            className="w-full h-full object-cover"
          />
        )}
        {!isGenerating && !resolvedUrl && (
          <div className="flex flex-col items-center gap-3 px-4 text-center select-none">
            <div className="w-12 h-12 rounded-full border border-[#3a3a3a] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="opacity-50">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#7b7b7b" />
              </svg>
            </div>
            <span className="text-[11px] text-[#7b7b7b]">Describe an image below</span>
          </div>
        )}
      </div>

      {/* Prompt input + generate button */}
      <div className="px-3 py-2.5 border-t border-[#2a2a2a] space-y-2">
        <input
          type="text"
          placeholder="Imagine…"
          value={localPrompt}
          disabled={isGenerating}
          onChange={(e) => setLocalPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
          className="w-full bg-[#131313] border border-[#2a2a2a] focus:border-[#d1fe17]/50 outline-none rounded-lg px-3 py-2 text-[11px] text-[#fefefe] placeholder-[#7b7b7b] transition-colors disabled:opacity-50"
        />
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !localPrompt.trim()}
          className="w-full flex items-center justify-center gap-2 bg-[#d1fe17] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed text-[#131313] font-bold py-2 rounded-lg text-[11px] transition-all shadow-[0_0_16px_rgba(209,254,23,0.25)]"
        >
          {isGenerating ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="animate-spin">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor" />
            </svg>
          )}
          {isGenerating ? 'Generating…' : isDone ? 'Regenerate' : 'Generate'}
        </button>
      </div>

      {/* Handles */}
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
