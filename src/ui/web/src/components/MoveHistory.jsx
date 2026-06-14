import { useMemo, useRef, useEffect } from 'react';

/**
 * PGN-style move list — numbered move pairs (white/black).
 */
export default function MoveHistory({ moveHistory, lastMoveSan }) {
  const listRef = useRef(null);

  // Pair moves into numbered rows
  const movePairs = useMemo(() => {
    const pairs = [];
    for (let i = 0; i < moveHistory.length; i += 2) {
      pairs.push({
        number: Math.floor(i / 2) + 1,
        white: moveHistory[i] || '',
        black: moveHistory[i + 1] || '',
      });
    }
    return pairs;
  }, [moveHistory]);

  // Auto-scroll to latest move
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [moveHistory]);

  return (
    <div className="move-history glass-card">
      <h3>📋 Moves ({moveHistory.length})</h3>

      <div className="move-list" ref={listRef}>
        {movePairs.length === 0 && (
          <div style={{
            textAlign: 'center',
            color: 'var(--text-dim)',
            fontSize: '0.8rem',
            padding: '16px 0',
          }}>
            No moves yet
          </div>
        )}

        {movePairs.map((pair, idx) => (
          <div
            key={pair.number}
            className={`move-row ${idx === movePairs.length - 1 ? 'latest' : ''}`}
          >
            <span className="move-number">{pair.number}.</span>
            <span className="move-white">{pair.white}</span>
            <span className="move-black">{pair.black}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
