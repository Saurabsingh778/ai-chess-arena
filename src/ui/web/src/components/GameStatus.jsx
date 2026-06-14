/**
 * Turn indicator — shows during active play.
 */
export function TurnIndicator({ gameState, isRunning }) {
  const { gameStatus, currentTurn, turnCount } = gameState;

  if (gameStatus === 'waiting') {
    return (
      <div className="turn-indicator" style={{
        background: 'var(--bg-glass)',
        color: 'var(--text-muted)',
        border: '1px solid var(--bg-glass-border)',
      }}>
        <span>⏳</span>
        <span>Waiting to start...</span>
      </div>
    );
  }

  const isGameOver = gameStatus && !['ongoing', 'waiting'].includes(gameStatus);
  if (isGameOver) {
    return (
      <div className="game-status-banner glass-card">
        <span className="status-text" style={{ color: 'var(--status-warning)' }}>
          {getResultEmoji(gameStatus)} {getResultText(gameStatus)}
        </span>
      </div>
    );
  }

  return (
    <div className={`turn-indicator ${currentTurn === 'white' ? 'white-turn' : 'black-turn'}`}>
      <span>{currentTurn === 'white' ? '♔' : '♚'}</span>
      <span>{currentTurn === 'white' ? 'White' : 'Black'} to move</span>
      <span style={{ marginLeft: 'auto', opacity: 0.6, fontSize: '0.75rem' }}>
        Move {turnCount}
      </span>
    </div>
  );
}

/**
 * Game over overlay — full-screen result display.
 */
export function GameOverOverlay({ gameState, onDismiss }) {
  const { gameStatus, winner, turnCount } = gameState;

  const getWinnerText = () => {
    if (winner === 'draw' || !winner) return 'Game ended in a draw';
    return `${winner.charAt(0).toUpperCase() + winner.slice(1)} wins!`;
  };

  const getTrophy = () => {
    if (winner === 'white') return '♔';
    if (winner === 'black') return '♚';
    return '🤝';
  };

  return (
    <div className="game-over-overlay" onClick={onDismiss}>
      <div className="game-over-card glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="trophy">{getTrophy()}</div>
        <h2>{getResultText(gameStatus)}</h2>
        <p className="winner-label">{getWinnerText()}</p>

        <div className="game-over-stats">
          <div className="stat">
            <div className="stat-value">{turnCount}</div>
            <div className="stat-label">Total Moves</div>
          </div>
          <div className="stat">
            <div className="stat-value" style={{ textTransform: 'capitalize' }}>{gameStatus}</div>
            <div className="stat-label">Result</div>
          </div>
        </div>

        <button className="btn btn-primary" onClick={onDismiss} style={{ width: '100%' }}>
          New Match
        </button>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────

function getResultText(status) {
  switch (status) {
    case 'checkmate':   return 'Checkmate!';
    case 'stalemate':   return 'Stalemate!';
    case 'draw':        return 'Draw!';
    case 'resignation': return 'Resignation!';
    case 'max_moves':   return 'Max Moves Reached!';
    default:            return 'Game Over!';
  }
}

function getResultEmoji(status) {
  switch (status) {
    case 'checkmate':   return '👑';
    case 'stalemate':   return '🤝';
    case 'draw':        return '🤝';
    case 'resignation': return '🏳️';
    case 'max_moves':   return '⏰';
    default:            return '🏁';
  }
}

// Default export for backward compat
export default { TurnIndicator, GameOverOverlay };
