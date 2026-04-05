import React, { useRef } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';

/**
 * HiggsfieldImageUploadNode
 * - Uploads a local image via FileReader → stores base64 as data.url
 * - Exports that url downstream to a HiggsfieldVideoNode
 */
export function HiggsfieldImageUploadNode({ id, data, selected }) {
  const { setNodes } = useReactFlow();
  const inputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64url = ev.target.result;
      setNodes((nds) =>
        nds.map((node) =>
          node.id === id
            ? { ...node, data: { ...node.data, url: base64url, fileName: file.name } }
            : node
        )
      );
    };
    reader.readAsDataURL(file);
  };

  const hasImage = !!data.url;

  return (
    <div
      style={{ minWidth: 220 }}
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
              hasImage
                ? 'bg-[#d1fe17] shadow-[0_0_6px_rgba(209,254,23,0.7)]'
                : 'bg-[#3a3a3a]',
            ].join(' ')}
          />
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#7b7b7b]">
            {hasImage ? 'Image ready' : 'Upload Image'}
          </span>
        </div>
        {/* Image icon */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d1fe17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <path d="M21 15l-5-5L5 21"/>
        </svg>
      </div>

      {/* Preview / Upload area */}
      <div
        className="relative aspect-video bg-[#131313] flex items-center justify-center overflow-hidden cursor-pointer"
        onClick={() => !hasImage && inputRef.current?.click()}
      >
        {hasImage ? (
          <img
            src={data.url}
            alt={data.fileName || 'uploaded'}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-3 px-4 text-center select-none">
            <div className="w-12 h-12 rounded-full border border-[#3a3a3a] flex items-center justify-center group-hover:border-[#d1fe17]/40 transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7b7b7b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <span className="text-[11px] text-[#7b7b7b] leading-relaxed">
              Click to upload image
            </span>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="px-3 py-2.5 border-t border-[#2a2a2a] flex items-center gap-2">
        {hasImage && (
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-[#7b7b7b] truncate">{data.fileName || 'image'}</p>
          </div>
        )}
        <button
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 bg-[#d1fe17]/10 hover:bg-[#d1fe17]/20 border border-[#d1fe17]/30 text-[#d1fe17] px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ml-auto"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          {hasImage ? 'Replace' : 'Upload'}
        </button>
      </div>

      {/* Prompt field for downstream use */}
      <div className="px-3 pb-3">
        <input
          type="text"
          placeholder="Image description…"
          defaultValue={data.prompt || ''}
          onChange={(e) =>
            setNodes((nds) =>
              nds.map((node) =>
                node.id === id
                  ? { ...node, data: { ...node.data, prompt: e.target.value } }
                  : node
              )
            )
          }
          className="w-full bg-[#131313] border border-[#2a2a2a] focus:border-[#d1fe17]/50 outline-none rounded-lg px-3 py-2 text-[11px] text-[#fefefe] placeholder-[#7b7b7b] transition-colors"
        />
      </div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

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
