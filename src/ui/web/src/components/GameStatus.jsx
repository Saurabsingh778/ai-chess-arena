function titleCase(value) {
  if (!value) return '';
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function getStatusText(gameState, isRunning) {
  const { gameStatus, currentTurn, winner } = gameState;

  if (gameStatus === 'waiting') return 'Ready to Start';
  if (gameStatus === 'ongoing') {
    return isRunning
      ? `${currentTurn === 'white' ? 'White' : 'Black'}'s Turn`
      : 'Game in Progress';
  }

  if (winner && winner !== 'draw') {
    return `${titleCase(winner)} Wins by ${titleCase(gameStatus)}`;
  }

  return titleCase(gameStatus || 'Game Over');
}

export function StatusBanner({ gameState, isRunning, stage }) {
  const statusText = getStatusText(gameState, isRunning);
  const statusClass = gameState.gameStatus || 'waiting';

  return (
    <section className={`status-banner ${statusClass}`}>
      <div>
        <span className="eyebrow">Status</span>
        <strong>{statusText}</strong>
      </div>
      <div>
        <span className="eyebrow">Stage</span>
        <strong>{stage}</strong>
      </div>
      <div>
        <span className="eyebrow">Turn</span>
        <strong>{gameState.currentTurn === 'white' ? 'White' : 'Black'}</strong>
      </div>
    </section>
  );
}

export function GameOverOverlay({ gameState, onDismiss }) {
  const resultText = getStatusText(gameState, false);

  return (
    <div className="game-over-overlay" onClick={onDismiss}>
      <section className="game-over-card" onClick={(event) => event.stopPropagation()}>
        <div className="result-piece">
          {gameState.winner === 'black' ? '♚' : gameState.winner === 'white' ? '♔' : '½'}
        </div>
        <h2>{resultText}</h2>
        <p>{gameState.turnCount} ply played</p>
        <button className="primary-button" type="button" onClick={onDismiss}>
          Close
        </button>
      </section>
    </div>
  );
}

export default { StatusBanner, GameOverOverlay };
