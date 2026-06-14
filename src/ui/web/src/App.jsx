import { useState, useEffect } from 'react';
import './App.css';
import ChessBoard from './components/ChessBoard';
import PlayerPanel from './components/PlayerPanel';
import EventLog from './components/EventLog';
import MatchControls from './components/MatchControls';
import MoveHistory from './components/MoveHistory';
import { TurnIndicator, GameOverOverlay } from './components/GameStatus';
import { useMatchWebSocket } from './hooks/useMatchWebSocket';

function App() {
  const {
    matchId,
    connectionStatus,
    gameState,
    events,
    isRunning,
    startMatch,
    stopMatch,
  } = useMatchWebSocket();

  const [showGameOver, setShowGameOver] = useState(false);
  const [flipped, setFlipped] = useState(false);

  const isGameOver = gameState.gameStatus &&
    !['ongoing', 'waiting'].includes(gameState.gameStatus);

  // Auto-show game over overlay when game ends
  useEffect(() => {
    if (isGameOver && events.length > 0) {
      const timer = setTimeout(() => setShowGameOver(true), 600);
      return () => clearTimeout(timer);
    }
  }, [isGameOver, events.length]);

  const handleDismissGameOver = () => {
    setShowGameOver(false);
  };

  return (
    <div className="app-container">
      {/* ── Header ──────────────────────────────── */}
      <header className="app-header glass-card">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <h1>♔ AI Chess Arena</h1>
          <span className="subtitle">LLM vs LLM</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            className="btn btn-ghost"
            onClick={() => setFlipped(!flipped)}
            title="Flip board"
            style={{ padding: '8px 12px', fontSize: '0.8rem' }}
          >
            🔄 Flip
          </button>
          <div className="connection-status">
            <span className={`connection-dot ${connectionStatus}`}></span>
            <span>{connectionStatus}</span>
          </div>
        </div>
      </header>

      {/* ── Left Panel: Controls + Move History ── */}
      <div className="left-panel">
        <MatchControls
          onStart={startMatch}
          onStop={stopMatch}
          isRunning={isRunning}
        />

        <MoveHistory
          moveHistory={gameState.moveHistory}
          lastMoveSan={gameState.lastMoveSan}
        />
      </div>

      {/* ── Center Panel: Board ──────────────────── */}
      <div className="center-panel">
        {/* Black player on top */}
        <PlayerPanel
          color="black"
          model={gameState.blackModel}
          isActive={gameState.currentTurn === 'black'}
          fen={gameState.fen}
          isRunning={isRunning}
        />

        {/* Turn / Status indicator */}
        <TurnIndicator
          gameState={gameState}
          isRunning={isRunning}
        />

        {/* Chess board */}
        <ChessBoard
          fen={gameState.fen}
          lastMove={gameState.lastMove}
          flipped={flipped}
        />

        {/* White player on bottom */}
        <PlayerPanel
          color="white"
          model={gameState.whiteModel}
          isActive={gameState.currentTurn === 'white'}
          fen={gameState.fen}
          isRunning={isRunning}
        />
      </div>

      {/* ── Right Panel: Event Log ───────────────── */}
      <div className="right-panel">
        <EventLog
          events={events}
          isRunning={isRunning}
        />
      </div>

      {/* ── Game Over Overlay ──────────────────────── */}
      {showGameOver && isGameOver && (
        <GameOverOverlay
          gameState={gameState}
          onDismiss={handleDismissGameOver}
        />
      )}
    </div>
  );
}

export default App;
