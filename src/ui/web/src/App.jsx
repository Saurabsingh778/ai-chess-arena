import { useEffect, useMemo, useState } from 'react';
import './App.css';
import ChessBoard from './components/ChessBoard';
import EventLog from './components/EventLog';
import { GameOverOverlay, StatusBanner } from './components/GameStatus';
import MatchControls from './components/MatchControls';
import MoveHistory from './components/MoveHistory';
import PlayerPanel from './components/PlayerPanel';
import { describeMove, getMoveColor, getStage } from './utils/chessPieces';
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

  const [flipped, setFlipped] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [clockNow, setClockNow] = useState(Date.now());

  const isGameOver = gameState.gameStatus && !['ongoing', 'waiting'].includes(gameState.gameStatus);
  const latestMove = gameState.moveHistory.at(-1);
  const lastMoveColor = latestMove?.color || getMoveColor(gameState.turnCount);
  const stage = getStage(gameState.turnCount, gameState.gameStatus);

  const elapsedSeconds = useMemo(() => {
    if (!gameState.startedAt) return 0;
    const start = new Date(gameState.startedAt).getTime();
    const end = gameState.endedAt ? new Date(gameState.endedAt).getTime() : clockNow;
    return Math.max(0, Math.floor((end - start) / 1000));
  }, [clockNow, gameState.endedAt, gameState.startedAt]);

  const whatHappened = useMemo(() => describeMove({
    san: latestMove?.san || gameState.lastMoveSan,
    uci: latestMove?.uci || gameState.lastMove,
    color: latestMove?.color || lastMoveColor,
  }), [gameState.lastMove, gameState.lastMoveSan, lastMoveColor, latestMove]);

  useEffect(() => {
    if (!isRunning) return undefined;
    const timer = window.setInterval(() => setClockNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [isRunning]);

  useEffect(() => {
    if (isGameOver) {
      const timer = window.setTimeout(() => setShowGameOver(true), 500);
      return () => window.clearTimeout(timer);
    }
    setShowGameOver(false);
    return undefined;
  }, [isGameOver]);

  const whiteMoveCount = gameState.moveHistory.filter((move) => move.color === 'white').length;
  const blackMoveCount = gameState.moveHistory.filter((move) => move.color === 'black').length;

  return (
    <div className="arena-shell">
      <header className="arena-header">
        <div className="brand-block">
          <div className="brand-mark">♚</div>
          <div>
            <h1>AI Chess Arena</h1>
            <p>LangGraph model match</p>
          </div>
        </div>

        <StatusBanner
          gameState={gameState}
          isRunning={isRunning}
          stage={stage}
        />

        <div className="header-actions">
          {matchId && <span className="match-id">#{matchId}</span>}
          <button
            className="icon-button"
            type="button"
            onClick={() => setFlipped((value) => !value)}
            title="Flip board"
          >
            ⇄
          </button>
          <div className={`connection-pill ${connectionStatus}`}>
            <span />
            {connectionStatus}
          </div>
        </div>
      </header>

      <main className="arena-layout">
        <aside className="arena-rail">
          <PlayerPanel
            color="white"
            model={gameState.whiteModel}
            isActive={gameState.currentTurn === 'white'}
            isRunning={isRunning}
            fen={gameState.fen}
            moveCount={whiteMoveCount}
            elapsedSeconds={elapsedSeconds}
          />

          <MatchControls
            onStart={startMatch}
            onStop={stopMatch}
            isRunning={isRunning}
          />
        </aside>

        <section className="board-section">
          <ChessBoard
            fen={gameState.fen}
            lastMove={gameState.lastMove}
            flipped={flipped}
          />

          <div className="move-brief">
            <div>
              <span className="eyebrow">What just happened</span>
              <p>{whatHappened}</p>
            </div>
            <div className="brief-stats">
              <span>{stage}</span>
              <strong>{gameState.turnCount} ply</strong>
            </div>
          </div>
        </section>

        <aside className="arena-rail">
          <PlayerPanel
            color="black"
            model={gameState.blackModel}
            isActive={gameState.currentTurn === 'black'}
            isRunning={isRunning}
            fen={gameState.fen}
            moveCount={blackMoveCount}
            elapsedSeconds={elapsedSeconds}
          />

          <MoveHistory
            moveHistory={gameState.moveHistory}
            lastMoveSan={gameState.lastMoveSan}
          />
        </aside>
      </main>

      <EventLog events={events} isRunning={isRunning} />

      {showGameOver && isGameOver && (
        <GameOverOverlay
          gameState={gameState}
          onDismiss={() => setShowGameOver(false)}
        />
      )}
    </div>
  );
}

export default App;
