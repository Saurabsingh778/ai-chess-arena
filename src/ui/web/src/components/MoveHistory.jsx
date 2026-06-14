import { useEffect, useMemo, useRef } from 'react';

function normalizeMoves(moveHistory) {
  return moveHistory.map((move, index) => {
    if (typeof move === 'string') {
      const ply = index + 1;
      return {
        ply,
        number: Math.ceil(ply / 2),
        color: ply % 2 === 1 ? 'white' : 'black',
        san: move,
      };
    }
    return move;
  });
}

export default function MoveHistory({ moveHistory, lastMoveSan }) {
  const listRef = useRef(null);

  const movePairs = useMemo(() => {
    const pairs = [];
    for (const move of normalizeMoves(moveHistory)) {
      if (!pairs[move.number - 1]) {
        pairs[move.number - 1] = { number: move.number, white: null, black: null };
      }
      pairs[move.number - 1][move.color] = move;
    }
    return pairs.filter(Boolean);
  }, [moveHistory]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [moveHistory]);

  return (
    <section className="history-card">
      <div className="section-heading">
        <span>Move History</span>
        <strong>{moveHistory.length}</strong>
      </div>

      <div className="move-list" ref={listRef}>
        {movePairs.length === 0 && <div className="empty-state">No moves yet</div>}

        {movePairs.map((pair) => (
          <div className="move-row" key={pair.number}>
            <span className="move-number">{pair.number}.</span>
            <MoveCell move={pair.white} isLatest={pair.white?.san === lastMoveSan} />
            <MoveCell move={pair.black} isLatest={pair.black?.san === lastMoveSan} />
          </div>
        ))}
      </div>
    </section>
  );
}

function MoveCell({ move, isLatest }) {
  if (!move) return <span className="move-cell empty">...</span>;

  return (
    <span className={`move-cell ${move.color} ${isLatest ? 'latest' : ''}`}>
      <span className="move-color-icon">{move.color === 'white' ? '♙' : '♟'}</span>
      <strong>{move.san}</strong>
    </span>
  );
}
