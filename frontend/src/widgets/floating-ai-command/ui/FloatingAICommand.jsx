import React, { useState } from 'react';

export const FloatingAICommand = ({ onCommandSubmit, isGenerating }) => {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;
    onCommandSubmit(prompt);
    setPrompt('');
  };

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4">
      <form
        onSubmit={handleSubmit}
        className="relative flex items-center bg-h_bg_card/90 backdrop-blur-xl border border-[#2a2a2a] rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.7)] p-2 transition-all duration-200 hover:border-h_accent/30 hover:shadow-[0_0_40px_rgba(209,254,23,0.08)] focus-within:border-h_accent/50 focus-within:shadow-[0_0_50px_rgba(209,254,23,0.12)]"
      >
        {/* AI status dot */}
        <div className="pl-3 pr-2 flex items-center justify-center flex-shrink-0">
          <div
            className={`w-2.5 h-2.5 rounded-full transition-all ${
              isGenerating
                ? 'bg-h_text_secondary animate-pulse'
                : 'bg-h_accent shadow-[0_0_8px_rgba(209,254,23,0.7)]'
            }`}
          />
        </div>

        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isGenerating}
          placeholder={
            isGenerating
              ? 'AI is thinking…'
              : 'Ask AI to generate ideas, images, group cards…'
          }
          className="flex-1 bg-transparent border-none outline-none text-h_text_primary placeholder-h_text_secondary px-3 py-3 text-sm"
        />

        <button
          type="submit"
          disabled={isGenerating || !prompt.trim()}
          className="ml-2 flex items-center gap-1.5 bg-h_accent hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed text-h_bg_main font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-[0_0_16px_rgba(209,254,23,0.3)]"
        >
          {isGenerating ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="animate-spin">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          )}
          {isGenerating ? '' : 'Generate'}
        </button>
      </form>
    </div>
  );
};