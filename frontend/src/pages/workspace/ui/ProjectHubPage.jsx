import React from 'react';
import { useNavigate } from 'react-router-dom';

export const ProjectHubPage = ({ onResetSession }) => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            {/* Шапка */}
            <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm">
                <h1 className="text-2xl font-bold text-indigo-600 tracking-tight">HackNU Hub</h1>
                <button
                    onClick={onResetSession}
                    className="text-sm font-medium text-gray-500 hover:text-red-600 transition"
                >
                    Выйти из аккаунта
                </button>
            </header>

            {/* Основной контент */}
            <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">

                {/* Левая колонка: Проекты */}
                <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col h-[calc(100vh-8rem)]">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Мои проекты</h2>
                    <button className="w-full py-2 mb-4 bg-indigo-50 text-indigo-700 rounded-md font-medium hover:bg-indigo-100 transition shadow-sm border border-indigo-100">
                        + Новый проект
                    </button>

                    <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                        {/* Карточка проекта */}
                        <div className="p-3 bg-indigo-600 rounded-md shadow-md cursor-pointer text-white">
                            <h3 className="font-medium">Хакатон 2026</h3>
                            <p className="text-xs text-indigo-200 mt-1">Выбранный проект</p>
                        </div>
                        <div className="p-3 bg-white rounded-md border border-gray-200 cursor-pointer hover:border-indigo-300 transition text-gray-700">
                            <h3 className="font-medium">Учеба & SAT</h3>
                            <p className="text-xs text-gray-400 mt-1">Черновики</p>
                        </div>
                    </div>
                </div>

                {/* Правая колонка: Комнаты выбранного проекта */}
                <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-[calc(100vh-8rem)]">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-semibold text-gray-800">Комнаты: Хакатон 2026</h2>
                        <button className="py-2 px-4 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-800 transition shadow-sm">
                            Создать комнату
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-2">
                        {/* Карточка комнаты */}
                        <div
                            onClick={() => navigate('/room/1')}
                            className="border border-gray-200 rounded-xl p-5 hover:shadow-lg hover:border-indigo-300 cursor-pointer transition group bg-gradient-to-br from-white to-gray-50"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <h3 className="text-lg font-bold text-gray-800 group-hover:text-indigo-600 transition">Главная доска</h3>
                                <span className="bg-green-100 text-green-800 text-xs px-2.5 py-1 rounded-full font-medium border border-green-200">Active</span>
                            </div>
                            <p className="text-sm text-gray-500 mb-6">Здесь мы брейнштормим архитектуру API и рисуем макеты.</p>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-400 font-mono">ID: 1</span>
                                <span className="text-indigo-600 text-sm font-medium group-hover:translate-x-1 transition-transform">Войти →</span>
                            </div>
                        </div>
                    </div>
                </div>

            </main>
        </div>
    );
};