import { useMemo } from 'react';
import { getCapturedPieces, getPieceSymbol } from '../utils/chessPieces';

/**
 * Player info panel — shows model name, turn indicator, captured pieces.
 */
export default function PlayerPanel({ color, model, isActive, fen, isRunning }) {
  const captured = useMemo(() => getCapturedPieces(fen), [fen]);
  const myCaptured = color === 'white' ? captured.white : captured.black;

  const pieceIcon = color === 'white' ? '♔' : '♚';
  const isThinking = isActive && isRunning;

  return (
    <div className={`player-panel glass-card ${color}-player ${isActive ? 'active-turn' : ''}`}>
      <div className="player-header">
        <div className={`player-icon ${color}`}>
          {pieceIcon}
        </div>
        <div className="player-info">
          <div className={`player-color ${color}`}>{color}</div>
          <div className="player-model" title={model}>
            {model || 'Not selected'}
          </div>
        </div>
        {isActive && isRunning && (
          <div className="badge badge-ongoing">
            Active
          </div>
        )}
      </div>

      {/* Thinking indicator */}
      {isThinking && (
        <div className="player-thinking">
          <span>Thinking</span>
          <div className="thinking-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      )}

      {/* Captured pieces */}
      {myCaptured.length > 0 && (
        <div className="captured-pieces">
          {myCaptured.map((p, i) => (
            <span key={i}>{getPieceSymbol(p)}</span>
          ))}
        </div>
      )}
    </div>
  );
}
