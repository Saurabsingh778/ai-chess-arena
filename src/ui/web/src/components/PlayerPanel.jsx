import { useMemo } from 'react';
import { formatModelName, getCapturedPieces, getPieceSymbol } from '../utils/chessPieces';

function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function PlayerPanel({
  color,
  model,
  isActive,
  isRunning,
  fen,
  moveCount,
  elapsedSeconds,
}) {
  const modelInfo = useMemo(() => formatModelName(model), [model]);
  const captured = useMemo(() => getCapturedPieces(fen), [fen]);
  const capturedPieces = color === 'white' ? captured.white : captured.black;
  const label = color.toUpperCase();

  return (
    <section className={`player-card ${color} ${isActive && isRunning ? 'active' : ''}`}>
      <div className="player-card-header">
        <span className={`color-token ${color}`} />
        <div className="player-title">
          <span>{label}</span>
          <strong>{modelInfo.provider}</strong>
        </div>
        {isActive && isRunning && <span className="thinking-badge">Thinking...</span>}
      </div>

      <div className="model-name" title={modelInfo.label}>
        {modelInfo.name}
      </div>

      <div className="player-metrics">
        <div>
          <span>Clock</span>
          <strong>{formatDuration(elapsedSeconds)}</strong>
        </div>
        <div>
          <span>Moves</span>
          <strong>{moveCount}</strong>
        </div>
      </div>

      <div className="captured-row">
        <span>Captured</span>
        <div className="captured-pieces" aria-label={`${label} captured pieces`}>
          {capturedPieces.length > 0 ? (
            capturedPieces.map((piece, index) => (
              <span key={`${piece}-${index}`}>{getPieceSymbol(piece)}</span>
            ))
          ) : (
            <em>None</em>
          )}
        </div>
      </div>
    </section>
  );
}
