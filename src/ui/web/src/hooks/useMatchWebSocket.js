import { useCallback, useEffect, useRef, useState } from 'react';
import { getMoveColor } from '../utils/chessPieces';

export const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const isViteDev = window.location.port === '5173';
const defaultApiBase = isViteDev ? 'http://localhost:8000' : window.location.origin;
const API_BASE = import.meta.env.VITE_API_BASE || defaultApiBase;
const WS_BASE = import.meta.env.VITE_WS_BASE || API_BASE.replace(/^http/, 'ws');

const FALLBACK_MODELS = {
  providers: ['groq', 'gemini', 'cerebrase'],
  suggested_models: {
    groq: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'gemma2-9b-it', 'openai/gpt-oss-120b'],
    gemini: ['gemma-4-31b-it', 'gemini-2.5-flash', 'gemini-2.5-pro'],
    cerebrase: ['llama-3.3-70b', 'llama-3.1-8b'],
  },
};

function createInitialGameState(overrides = {}) {
  return {
    fen: STARTING_FEN,
    currentTurn: 'white',
    turnCount: 0,
    gameStatus: 'waiting',
    winner: null,
    lastMove: null,
    lastMoveSan: null,
    whiteModel: '',
    blackModel: '',
    moveHistory: [],
    currentNode: null,
    proposedMove: null,
    rawModelOutput: null,
    activeModel: null,
    startedAt: null,
    endedAt: null,
    ...overrides,
  };
}

function formatTimestamp(date = new Date()) {
  const pad = (value, size = 2) => String(value).padStart(size, '0');
  return [
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join(':') + `.${pad(date.getMilliseconds(), 3)}`;
}

function eventDate(timestamp) {
  return timestamp ? new Date(timestamp * 1000) : new Date();
}

function playerFromNode(node) {
  if (node === 'white_player') return 'White';
  if (node === 'black_player') return 'Black';
  return 'System';
}

function upsertMove(history, data) {
  if (!data.last_move_san) return history;

  const ply = data.turn_count || history.length + 1;
  const duplicate = history.some((move) => move.ply === ply && move.san === data.last_move_san);
  if (duplicate) return history;

  return [
    ...history,
    {
      ply,
      number: Math.ceil(ply / 2),
      color: getMoveColor(ply),
      san: data.last_move_san,
      uci: data.last_move || null,
    },
  ];
}

export function useMatchWebSocket() {
  const [matchId, setMatchId] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [gameState, setGameState] = useState(() => createInitialGameState());
  const [events, setEvents] = useState([]);
  const [isRunning, setIsRunning] = useState(false);

  const wsRef = useRef(null);

  const addLog = useCallback((logType, message, options = {}) => {
    const date = eventDate(options.timestamp);
    setEvents((previous) => [
      ...previous,
      {
        id: `${date.getTime()}-${Math.random().toString(16).slice(2)}`,
        logType,
        player: options.player || 'System',
        message,
        details: options.details || null,
        rawText: options.rawText || null,
        timestamp: date.toISOString(),
        displayTime: formatTimestamp(date),
      },
    ]);
  }, []);

  const connectWebSocket = useCallback((id) => {
    if (wsRef.current) wsRef.current.close();

    setConnectionStatus('connecting');
    const socket = new WebSocket(`${WS_BASE}/ws/match/${id}`);
    wsRef.current = socket;

    socket.onopen = () => {
      setConnectionStatus('connected');
      addLog('GRAPH_STATE', 'Connected to match stream.', { player: 'WebSocket' });
    };

    socket.onmessage = (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        addLog('ILLEGAL_MOVE', 'Received malformed WebSocket payload.', { player: 'WebSocket' });
        return;
      }

      switch (data.type) {
        case 'state_sync':
          setGameState((previous) => ({
            ...previous,
            fen: data.fen || previous.fen,
            currentTurn: data.current_turn || previous.currentTurn,
            turnCount: data.turn_count ?? previous.turnCount,
            gameStatus: data.game_status || previous.gameStatus,
            winner: data.winner ?? previous.winner,
            whiteModel: data.white_model || previous.whiteModel,
            blackModel: data.black_model || previous.blackModel,
            lastMove: data.last_move || previous.lastMove,
            lastMoveSan: data.last_move_san || previous.lastMoveSan,
            proposedMove: data.proposed_move || previous.proposedMove,
            rawModelOutput: data.raw_model_output || previous.rawModelOutput,
            activeModel: data.active_model || previous.activeModel,
          }));
          break;

        case 'match_started':
          setGameState((previous) => createInitialGameState({
            ...previous,
            gameStatus: 'ongoing',
            whiteModel: data.white_model,
            blackModel: data.black_model,
            startedAt: eventDate(data.timestamp).toISOString(),
          }));
          setIsRunning(true);
          addLog('GAME_START', `Game initialized: ${data.white_model} vs ${data.black_model}.`, {
            timestamp: data.timestamp,
          });
          addLog('TURN_START', 'White to move, move 1.', {
            player: 'White',
            timestamp: data.timestamp,
          });
          break;

        case 'graph_state':
          setGameState((previous) => ({
            ...previous,
            currentNode: data.node || previous.currentNode,
            currentTurn: data.current_turn || previous.currentTurn,
            turnCount: data.turn_count ?? previous.turnCount,
            gameStatus: data.game_status || previous.gameStatus,
          }));
          addLog('GRAPH_STATE', `${data.node} updated ${data.changed_keys?.join(', ') || 'state'}.`, {
            player: playerFromNode(data.node),
            timestamp: data.timestamp,
            details: data,
          });
          break;

        case 'node_update':
          setGameState((previous) => ({
            ...previous,
            currentNode: data.node || previous.currentNode,
          }));
          if (data.node === 'white_player' || data.node === 'black_player') {
            addLog('MODEL_THINKING', `${playerFromNode(data.node)} model turn resolved.`, {
              player: playerFromNode(data.node),
              timestamp: data.timestamp,
              details: data,
            });
          }
          break;

        case 'move_proposed':
          setGameState((previous) => ({
            ...previous,
            proposedMove: data.proposed_move || previous.proposedMove,
            activeModel: data.model || previous.activeModel,
          }));
          addLog('MOVE_PROPOSED', `${data.model || data.color} proposed ${data.proposed_move || 'a move'}.`, {
            player: data.color === 'white' ? 'White' : 'Black',
            timestamp: data.timestamp,
            details: data,
          });
          break;

        case 'raw_output':
          setGameState((previous) => ({
            ...previous,
            rawModelOutput: data.raw_output || previous.rawModelOutput,
            activeModel: data.model || previous.activeModel,
          }));
          addLog('RAW_OUTPUT', `Raw model response from ${data.model || data.color}.`, {
            player: data.color === 'white' ? 'White' : 'Black',
            timestamp: data.timestamp,
            rawText: data.raw_output,
            details: { prompt: data.prompt, proposed_move: data.proposed_move },
          });
          break;

        case 'board_update':
          setGameState((previous) => ({
            ...previous,
            fen: data.fen || previous.fen,
            currentTurn: data.current_turn || previous.currentTurn,
            turnCount: data.turn_count ?? previous.turnCount,
            lastMove: data.last_move || previous.lastMove,
            lastMoveSan: data.last_move_san || previous.lastMoveSan,
            gameStatus: data.game_status || previous.gameStatus,
            moveHistory: upsertMove(previous.moveHistory, data),
          }));
          if (data.last_move_san && data.current_turn && !data.game_status) {
            const moveNumber = Math.max(1, Math.ceil((data.turn_count || 0) / 2) + (data.current_turn === 'white' ? 1 : 0));
            addLog('TURN_START', `${data.current_turn === 'white' ? 'White' : 'Black'} to move, move ${moveNumber}.`, {
              player: data.current_turn === 'white' ? 'White' : 'Black',
              timestamp: data.timestamp,
            });
          }
          break;

        case 'move_applied':
          addLog('MOVE_APPLIED', `${data.color === 'white' ? 'White' : 'Black'} played ${data.move_san || data.move_uci}.`, {
            player: data.color === 'white' ? 'White' : 'Black',
            timestamp: data.timestamp,
            details: data,
          });
          break;

        case 'move_event':
          break;

        case 'error_event':
          addLog('ILLEGAL_MOVE', data.error || 'Move rejected.', {
            player: playerFromNode(data.node),
            timestamp: data.timestamp,
            details: data,
          });
          break;

        case 'game_over':
          setGameState((previous) => ({
            ...previous,
            gameStatus: data.game_status || previous.gameStatus,
            winner: data.winner ?? previous.winner,
            turnCount: data.turn_count ?? previous.turnCount,
            endedAt: eventDate(data.timestamp).toISOString(),
          }));
          setIsRunning(false);
          addLog('GAME_END', data.winner ? `${data.winner} wins by ${data.game_status}.` : `Game ended: ${data.game_status}.`, {
            player: data.winner ? data.winner.charAt(0).toUpperCase() + data.winner.slice(1) : 'System',
            timestamp: data.timestamp,
            details: data,
          });
          break;

        case 'match_cancelled':
          setIsRunning(false);
          addLog('GAME_END', 'Match was cancelled.', { timestamp: data.timestamp });
          break;

        case 'stream_end':
          setIsRunning(false);
          setConnectionStatus('disconnected');
          break;

        default:
          addLog('GRAPH_STATE', `Unhandled event: ${data.type}.`, {
            timestamp: data.timestamp,
            details: data,
          });
      }
    };

    socket.onclose = () => {
      setConnectionStatus('disconnected');
    };

    socket.onerror = () => {
      setConnectionStatus('disconnected');
      addLog('ILLEGAL_MOVE', 'WebSocket connection error.', { player: 'WebSocket' });
    };
  }, [addLog]);

  const startMatch = useCallback(async (whiteModel, blackModel, temperature = 0.7) => {
    try {
      setEvents([]);
      setGameState(createInitialGameState({
        gameStatus: 'ongoing',
        whiteModel,
        blackModel,
        startedAt: new Date().toISOString(),
      }));
      addLog('GAME_START', 'Starting new match request.');

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
      if (!response.ok || !data.match_id) {
        throw new Error(data.error || 'Match start failed');
      }

      setMatchId(data.match_id);
      setIsRunning(true);
      connectWebSocket(data.match_id);
    } catch (error) {
      setIsRunning(false);
      addLog('ILLEGAL_MOVE', `Failed to start match: ${error.message}`);
    }
  }, [addLog, connectWebSocket]);

  const stopMatch = useCallback(async () => {
    if (!matchId) return;

    try {
      await fetch(`${API_BASE}/api/match/${matchId}/stop`, { method: 'POST' });
      addLog('GAME_END', 'Stopping match.');
    } catch (error) {
      addLog('ILLEGAL_MOVE', `Failed to stop match: ${error.message}`);
    }
  }, [matchId, addLog]);

  useEffect(() => () => {
    if (wsRef.current) wsRef.current.close();
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

export async function fetchAvailableModels() {
  try {
    const response = await fetch(`${API_BASE}/api/models`);
    if (!response.ok) throw new Error('Model list unavailable');
    return await response.json();
  } catch {
    return FALLBACK_MODELS;
  }
}
