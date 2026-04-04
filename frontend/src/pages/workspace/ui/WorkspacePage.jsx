import React, { useState } from 'react';
import { Canva } from "../../../widgets/Canva";

export const WorkspacePage = ({ sessionConfig }) => {
  const [activeTab, setActiveTab] = useState('chat');

  return (
    <div className="flex h-screen w-screen bg-neutral-950 overflow-hidden font-sans text-neutral-200">

      {/* 1. ЛЕВЫЙ САЙДБАР */}
      <aside className="w-64 bg-neutral-900/50 border-r border-neutral-800 flex flex-col backdrop-blur-sm z-10">
        <div className="p-5 border-b border-neutral-800">
          <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-fuchsia-500">
            HackNU AI
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div>
            <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-widest mb-3">Комнаты</h3>
            <div className="p-2 bg-neutral-800/50 text-cyan-400 border border-cyan-900/50 rounded-lg cursor-pointer text-sm font-medium">
              Главная доска
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-neutral-800">
          <button className="w-full bg-neutral-100 hover:bg-white text-neutral-900 py-2.5 px-4 rounded-lg text-sm font-medium transition shadow-[0_0_15px_rgba(255,255,255,0.1)]">
            Поделиться ссылкой
          </button>
        </div>
      </aside>

      {/* 2. ЦЕНТРАЛЬНАЯ ЗОНА (Холст React Flow) */}
      <main className="flex-1 relative bg-neutral-950 overflow-hidden">
        <div className="absolute inset-0">
          <Canva />
        </div>

        {/* 4. ВИДЖЕТ LIVEKIT */}
        <div className="absolute bottom-6 left-6 w-72 h-48 bg-neutral-900/90 rounded-xl shadow-2xl overflow-hidden border border-neutral-800 flex flex-col backdrop-blur-md pointer-events-none z-20">
          <div className="px-4 py-2 border-b border-neutral-800 flex justify-between items-center bg-neutral-950/50">
            <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Live Voice</span>
            <div className="w-2 h-2 bg-lime-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(132,204,22,0.8)]"></div>
          </div>
          <div className="flex-1 flex items-center justify-center text-neutral-600 text-sm">
            Ожидание подключения...
          </div>
        </div>
      </main>

      {/* 3. ПРАВАЯ ПАНЕЛЬ (AI Tools) */}
      <aside className="w-80 bg-neutral-900/50 border-l border-neutral-800 flex flex-col backdrop-blur-sm z-10">

        {/* Табы */}
        <div className="flex border-b border-neutral-800">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-4 text-xs font-semibold uppercase tracking-widest transition ${activeTab === 'chat' ? 'border-b-2 border-cyan-400 text-cyan-400' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            Gemini
          </button>
          <button
            onClick={() => setActiveTab('media')}
            className={`flex-1 py-4 text-xs font-semibold uppercase tracking-widest transition ${activeTab === 'media' ? 'border-b-2 border-fuchsia-500 text-fuchsia-500' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            Higgsfield
          </button>
        </div>

        {/* Контент */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'chat' ? (
            <div className="bg-neutral-800/50 border border-neutral-700/50 p-4 rounded-xl text-sm leading-relaxed text-neutral-300">
              <span className="text-cyan-400 font-bold">AI:</span> Я проанализировал граф на доске. Хотите сгенерировать видео из первого промпта?
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-fuchsia-950/30 border border-fuchsia-900/50 text-fuchsia-200 p-4 rounded-xl text-sm">
                Готов к генерации медиа.
              </div>
            </div>
          )}
        </div>

        {/* Инпут */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-900/80">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Введите команду..."
              className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition"
            />
            <button className="bg-neutral-100 hover:bg-white text-neutral-900 rounded-lg px-4 transition font-medium">
              →
            </button>
          </div>
        </div>
      </aside>

    </div>
  );
};