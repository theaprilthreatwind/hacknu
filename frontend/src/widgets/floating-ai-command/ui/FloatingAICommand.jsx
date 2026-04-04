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
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4">
            <form
                onSubmit={handleSubmit}
                className="relative flex items-center bg-neutral-900/80 backdrop-blur-xl border border-neutral-700/50 rounded-2xl shadow-[0_0_40px_rgba(34,211,238,0.1)] p-2 transition-all hover:border-cyan-500/50 hover:shadow-[0_0_50px_rgba(34,211,238,0.2)]"
            >
                {/* Индикатор работы ИИ */}
                <div className="pl-4 pr-2 flex items-center justify-center">
                    <div className={`w-3 h-3 rounded-full ${isGenerating ? 'bg-fuchsia-500 animate-pulse shadow-[0_0_10px_rgba(217,70,239,0.8)]' : 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]'}`}></div>
                </div>

                <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={isGenerating}
                    placeholder={isGenerating ? "Gemini анализирует пространство..." : "Попроси ИИ сгенерировать идеи, картинку или сгруппировать карточки..."}
                    className="flex-1 bg-transparent border-none outline-none text-neutral-200 placeholder-neutral-500 px-2 py-3 text-sm"
                />

                <button
                    type="submit"
                    disabled={isGenerating || !prompt.trim()}
                    className="ml-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-neutral-950 font-bold px-6 py-2.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isGenerating ? '...' : '→'}
                </button>
            </form>
        </div>
    );
};