import { useState, useEffect, useRef, useCallback } from 'react';

const API_BASE = 'http://localhost:8000';
const WS_BASE = 'ws://localhost:8000';

/**
 * Custom hook for managing the chess match WebSocket connection.
 * Handles connection lifecycle, reconnection, and event dispatching.
 */
export function useMatchWebSocket() {
  const [matchId, setMatchId] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // disconnected | connecting | connected
  const [gameState, setGameState] = useState({
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    currentTurn: 'white',
    turnCount: 0,
    gameStatus: 'waiting', // waiting | ongoing | checkmate | stalemate | draw | resignation | max_moves
    winner: null,
    lastMove: null,
    lastMoveSan: null,
    whiteModel: '',
    blackModel: '',
    moveHistory: [],
  });
  const [events, setEvents] = useState([]);
  const [isRunning, setIsRunning] = useState(false);

  const wsRef = useRef(null);
  const eventsEndRef = useRef(null);

  // Add event to the log
  const addEvent = useCallback((event) => {
    setEvents(prev => [...prev, {
      ...event,
      id: Date.now() + Math.random(),
      displayTime: new Date().toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    }]);
  }, []);

  // Connect to WebSocket
  const connectWebSocket = useCallback((id) => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    setConnectionStatus('connecting');
    const ws = new WebSocket(`${WS_BASE}/ws/match/${id}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus('connected');
      addEvent({ type: 'system_event', text: 'Connected to match stream' });
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case 'state_sync':
          setGameState(prev => ({
            ...prev,
            fen: data.fen || prev.fen,
            currentTurn: data.current_turn || prev.currentTurn,
            turnCount: data.turn_count ?? prev.turnCount,
            gameStatus: data.game_status || prev.gameStatus,
            winner: data.winner,
            whiteModel: data.white_model || prev.whiteModel,
            blackModel: data.black_model || prev.blackModel,
          }));
          break;

        case 'match_started':
          setGameState(prev => ({
            ...prev,
            gameStatus: 'ongoing',
            whiteModel: data.white_model,
            blackModel: data.black_model,
          }));
          setIsRunning(true);
          addEvent({
            type: 'game_event',
            text: `Match started! ${data.white_model} vs ${data.black_model}`,
          });
          break;

        case 'board_update':
          setGameState(prev => ({
            ...prev,
            fen: data.fen,
            currentTurn: data.current_turn,
            turnCount: data.turn_count,
            lastMove: data.last_move,
            lastMoveSan: data.last_move_san,
            gameStatus: 'ongoing',
            moveHistory: data.last_move_san ? [...prev.moveHistory, data.last_move_san] : prev.moveHistory,
          }));
          break;

        case 'move_event':
          if (data.move_san) {
            addEvent({
              type: 'move_event',
              text: `${data.color === 'white' ? '♔' : '♚'} ${data.color} played ${data.move_san}`,
              color: data.color,
            });
          }
          break;

        case 'node_update':
          if (data.node === 'white_player') {
            addEvent({ type: 'system_event', text: '🤔 White is thinking...' });
          } else if (data.node === 'black_player') {
            addEvent({ type: 'system_event', text: '🤔 Black is thinking...' });
          }
          break;

        case 'error_event':
          addEvent({
            type: 'error_event',
            text: data.error,
          });
          break;

        case 'game_over':
          setGameState(prev => ({
            ...prev,
            gameStatus: data.game_status,
            winner: data.winner,
            turnCount: data.turn_count ?? prev.turnCount,
          }));
          setIsRunning(false);
          addEvent({
            type: 'game_event',
            text: `Game Over! ${data.winner ? `Winner: ${data.winner}` : `Result: ${data.game_status}`}`,
          });
          break;

        case 'match_cancelled':
          setIsRunning(false);
          addEvent({ type: 'system_event', text: 'Match was cancelled.' });
          break;

        case 'stream_end':
          setIsRunning(false);
          setConnectionStatus('disconnected');
          break;

        default:
          break;
      }
    };

    ws.onclose = () => {
      setConnectionStatus('disconnected');
    };

    ws.onerror = () => {
      setConnectionStatus('disconnected');
      addEvent({ type: 'error_event', text: 'WebSocket connection error' });
    };
  }, [addEvent]);

  // Start a new match
  const startMatch = useCallback(async (whiteModel, blackModel, temperature = 0.7) => {
    try {
      // Reset state
      setEvents([]);
      setGameState({
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        currentTurn: 'white',
        turnCount: 0,
        gameStatus: 'ongoing',
        winner: null,
        lastMove: null,
        lastMoveSan: null,
        whiteModel: whiteModel,
        blackModel: blackModel,
        moveHistory: [],
      });

      addEvent({ type: 'system_event', text: 'Starting new match...' });

      const response = await fetch(`${API_BASE}/api/match/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          white_model: whiteModel,
          black_model: blackModel,
          temperature,
        }),
      });

      const data = await response.json();

      if (data.match_id) {
        setMatchId(data.match_id);
        setIsRunning(true);
        connectWebSocket(data.match_id);
      }
    } catch (err) {
      addEvent({ type: 'error_event', text: `Failed to start match: ${err.message}` });
    }
  }, [addEvent, connectWebSocket]);

  // Stop a running match
  const stopMatch = useCallback(async () => {
    if (!matchId) return;

    try {
      await fetch(`${API_BASE}/api/match/${matchId}/stop`, { method: 'POST' });
      addEvent({ type: 'system_event', text: 'Stopping match...' });
    } catch (err) {
      addEvent({ type: 'error_event', text: `Failed to stop match: ${err.message}` });
    }
  }, [matchId, addEvent]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return {
    matchId,
    connectionStatus,
    gameState,
    events,
    isRunning,
    startMatch,
    stopMatch,
  };
}

/**
 * Fetch available models from the API.
 */
export async function fetchAvailableModels() {
  try {
    const response = await fetch(`${API_BASE}/api/models`);
    return await response.json();
  } catch {
    return {
      providers: ['groq', 'gemini'],
      suggested_models: {
        groq: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'gemma2-9b-it'],
        gemini: ['gemma-4-31b-it', 'gemini-2.5-flash'],
      },
    };
  }
}
