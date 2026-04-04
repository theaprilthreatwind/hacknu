import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Canva } from "../../../widgets/Canva";
import { FloatingAICommand } from "../../../widgets/floating-ai-command";
import { chatWithRoomAi, fetchRoom } from "../../../shared/api/platform";
import { saveCanvasState as apiSaveCanvasState } from "../../../shared/api/canvas";
import { createRoomConnection } from "../../../shared/api/realtime";

export const WorkspacePage = ({ sessionConfig }) => {
  const { id: roomId } = useParams();
  const guestId = useMemo(() => Math.random().toString(36).substring(7), []);

  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  
  const [remoteCursors, setRemoteCursors] = useState({});
  const connectionRef = useRef(null);

  // 1. Загрузка комнаты при монтировании
  useEffect(() => {
    if (!roomId || !sessionConfig?.token) return;

    const loadRoomState = async () => {
      try {
        const response = await fetchRoom({
          apiBaseUrl: sessionConfig.apiBaseUrl,
          token: sessionConfig.token,
          roomId,
        });

        // Надежное извлечение данных обходя все возможные обертки
        const payload = response?.payload?.data || response?.payload || response?.data?.data || response?.data || response;
        console.log('[DEBUG] Загрузка комнаты, ответ API:', payload);

        const state = typeof payload.canvas_state === 'string' ? JSON.parse(payload.canvas_state) : payload.canvas_state;

        if (state && Array.isArray(state.nodes)) {
          setNodes(state.nodes);
          setEdges(state.edges || []);
          console.log('[DEBUG] Данные холста успешно загружены из БД!', state.nodes);
        } else {
          console.warn('[DEBUG] canvas_state пуст или имеет неверный формат:', state);
        }
      } catch (error) {
        console.error("Ошибка при загрузке комнаты:", error);
      } finally {
        setIsHydrated(true);
      }
    };

    loadRoomState();
  }, [roomId, sessionConfig]);

  // 1.5 WebSockets: Инициализация реалтайм коллаборации
  useEffect(() => {
    if (!roomId || !isHydrated || !sessionConfig?.token) return;

    const connection = createRoomConnection({
      apiBaseUrl: sessionConfig.apiBaseUrl,
      token: sessionConfig.token,
      roomId,
      onReady: (status) => console.log('[WebSockets]', status.message),
      onPresenceSync: (users) => console.log('В комнате:', users),
      onCursorMoved: (data) => {
        // Обновляем координаты чужого курсора по его ID
        setRemoteCursors(prev => ({
          ...prev,
          [data.userId]: data
        }));
      },
      onCanvasUpdated: (newState) => {
        // Защита от перезаписи собственных изменений
        const parsedState = typeof newState === 'string' ? JSON.parse(newState) : newState;
        if (parsedState?.nodes) setNodes(parsedState.nodes);
        if (parsedState?.edges) setEdges(parsedState.edges);
      }
    });

    connectionRef.current = connection;

    return () => connection.disconnect();
  }, [roomId, isHydrated, sessionConfig]);

  // 2. Автоматическое сохранение стейта холста (Debounce)
  useEffect(() => {
    if (!isHydrated || !roomId || nodes.length === 0) return; // Не сохраняем пустую доску при инициализации

    const timeoutId = setTimeout(() => {
      handleSaveCanvas(nodes, edges);
    }, 1500); // Сохраняем через 1.5 сек после последнего изменения

    return () => clearTimeout(timeoutId);
  }, [nodes, edges, roomId, isHydrated]);

  // 2. Функция для сохранения стейта холста
  const handleSaveCanvas = async (currentNodes, currentEdges) => {
    try {
      const result = await apiSaveCanvasState({
        apiBaseUrl: sessionConfig?.apiBaseUrl,
        token: sessionConfig?.token,
        roomId,
        canvasState: { nodes: currentNodes, edges: currentEdges }
      });
      if (!result?.ok) {
        console.error('[DEBUG] Ошибка сохранения в БД:', result?.message || result);
      } else {
        console.log('[DEBUG] Успешное сохранение в БД. Сохранено нод:', currentNodes.length);
      }
    } catch (error) {
      console.error("Failed to save canvas state:", error);
    }
  };

  // 3. Обновленный обработчик сабмита от FloatingAICommand с логами
  const handleAiSubmit = async (prompt) => {
    if (!roomId) return;
    setIsAiGenerating(true);
    try {
      console.log("1. Отправляем запрос:", prompt);
      const response = await chatWithRoomAi({
        apiBaseUrl: sessionConfig?.apiBaseUrl,
        token: sessionConfig?.token,
        roomId,
        prompt,
        canvas_state: nodes
      });
      console.log("2. Сырой ответ API:", response);

      // Надежное извлечение данных
      const aiData = response?.payload || response?.data || response;
      console.log("3. Извлеченные данных ИИ:", aiData);

      if (aiData && Array.isArray(aiData.new_nodes) && aiData.new_nodes.length > 0) {
        console.log("4. Добавляем ноды:", aiData.new_nodes);

        setNodes(prev => {
          // Ищем самую нижнюю ноду на текущей доске
          const maxY = prev.reduce((max, node) => Math.max(max, node.position.y), 0);
          const startX = 100;
          const startY = prev.length > 0 ? maxY + 250 : 100; // Отступ вниз на 250px

          // Переопределяем позиции новых нод для аккуратной сетки
          const neatlyPlacedNodes = aiData.new_nodes.map((node, index) => ({
            ...node,
            position: {
              x: startX + (index * 350), // Шаг 350px вправо для каждой новой карточки
              y: startY
            }
          }));

          return [...prev, ...neatlyPlacedNodes];
        });
      } else {
        console.warn("Внимание: new_nodes пуст или не найден!", aiData);
      }

      if (aiData && Array.isArray(aiData.new_edges)) {
        setEdges(prev => {
          const updatedEdges = [...prev, ...aiData.new_edges];
          return updatedEdges;
        });
      }
    } catch (error) {
      console.error("AI Error:", error);
    } finally {
      setIsAiGenerating(false);
    }
  };

  // handlePointerMove moved to Canva.jsx (FlowWrapper) for viewport-correct cursor coords

  return (
    <div className="flex h-screen w-screen bg-h_bg_main overflow-hidden font-sans text-h_text_primary">

      {/* 1. ЛЕВЫЙ САЙДБАР */}
      <aside className="w-64 bg-h_bg_card/80 border-r border-neutral-800 flex flex-col backdrop-blur-sm z-10">
        <div className="p-5 border-b border-neutral-800">
          <h2 className="text-xl font-bold text-h_text_primary">
            Higgsfield Workspace
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div>
            <h3 className="text-xs font-semibold text-h_text_secondary uppercase tracking-widest mb-3">Комнаты</h3>
            <div className="p-2 bg-h_bg_main text-h_accent border border-h_accent/40 rounded-lg cursor-pointer text-sm font-medium hover:border-h_accent transition-colors">
              Главная доска
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-neutral-800">
          <button className="w-full bg-h_accent hover:bg-yellow-300 text-h_bg_main py-2.5 px-4 rounded-lg text-sm font-bold transition">
            Поделиться ссылкой
          </button>
        </div>
      </aside>

      {/* 2. ЦЕНТРАЛЬНАЯ ЗОНА (Холст React Flow) */}
      <main className="flex-1 relative bg-h_bg_main overflow-hidden">
        <div className="absolute inset-0">
          <Canva
            nodes={nodes}
            setNodes={setNodes}
            edges={edges}
            setEdges={setEdges}
            remoteCursors={remoteCursors}
            onCursorMove={(pos) => connectionRef.current?.broadcastCursor(pos)}
            guestId={guestId}
            user={sessionConfig?.user}
          />
        </div>

        {/* Встроенный плавающий виджет команд AI */}
        <FloatingAICommand onCommandSubmit={handleAiSubmit} isGenerating={isAiGenerating} />

        {/* 4. ВИДЖЕТ LIVEKIT */}
        <div className="absolute bottom-6 left-6 w-72 h-48 bg-h_dark/80 rounded-xl shadow-2xl overflow-hidden border border-neutral-800 flex flex-col backdrop-blur-md pointer-events-none z-20">
          <div className="px-4 py-2 border-b border-neutral-800 flex justify-between items-center bg-h_black/50">
            <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Live Voice</span>
            <div className="w-2 h-2 bg-h_lime rounded-full animate-pulse shadow-[0_0_8px_rgba(132,204,22,0.8)]"></div>
          </div>
          <div className="flex-1 flex items-center justify-center text-neutral-600 text-sm">
            Ожидание подключения...
          </div>
        </div>
      </main>

    </div>
  );
};