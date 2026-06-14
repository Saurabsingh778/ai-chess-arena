import { useMemo, useState } from 'react';
import {
  FILES,
  RANKS,
  coordsToSquare,
  getPieceSymbol,
  isWhitePiece,
  parseFEN,
  uciToSquares,
} from '../utils/chessPieces';

function displayCoord(coord, flipped) {
  if (!coord) return null;
  return {
    row: flipped ? 7 - coord.row : coord.row,
    col: flipped ? 7 - coord.col : coord.col,
  };
}

function arrowPoint(coord) {
  return {
    x: ((coord.col + 0.5) / 8) * 100,
    y: ((coord.row + 0.5) / 8) * 100,
  };
}

export default function ChessBoard({ fen, lastMove, flipped = false }) {
  const [selectedSquare, setSelectedSquare] = useState(null);
  const board = useMemo(() => parseFEN(fen), [fen]);
  const highlights = useMemo(() => uciToSquares(lastMove), [lastMove]);

  const displayBoard = flipped ? [...board].reverse().map((row) => [...row].reverse()) : board;
  const displayFiles = flipped ? [...FILES].reverse() : FILES;
  const displayRanks = flipped ? [...RANKS].reverse() : RANKS;

  const arrow = useMemo(() => {
    const from = displayCoord(highlights.from, flipped);
    const to = displayCoord(highlights.to, flipped);
    if (!from || !to) return null;
    return { from: arrowPoint(from), to: arrowPoint(to) };
  }, [flipped, highlights.from, highlights.to]);

  return (
    <div className="board-frame" aria-label="Chess board">
      <div className="board-inner">
        {arrow && (
          <svg className="last-move-arrow" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <marker id="arrow-head" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
                <path d="M0,0 L5,2.5 L0,5 Z" />
              </marker>
            </defs>
            <line
              x1={arrow.from.x}
              y1={arrow.from.y}
              x2={arrow.to.x}
              y2={arrow.to.y}
              markerEnd="url(#arrow-head)"
            />
          </svg>
        )}

        <div className="chess-board">
          {displayBoard.map((row, rowIndex) => row.map((piece, colIndex) => {
            const actualRow = flipped ? 7 - rowIndex : rowIndex;
            const actualCol = flipped ? 7 - colIndex : colIndex;
            const squareName = coordsToSquare(actualRow, actualCol);
            const isLight = (actualRow + actualCol) % 2 === 0;
            const isFrom = highlights.from?.row === actualRow && highlights.from?.col === actualCol;
            const isTo = highlights.to?.row === actualRow && highlights.to?.col === actualCol;
            const isSelected = selectedSquare === squareName;

            return (
              <button
                type="button"
                key={squareName}
                className={[
                  'chess-square',
                  isLight ? 'light' : 'dark',
                  isFrom ? 'last-from' : '',
                  isTo ? 'last-to' : '',
                  isSelected ? 'selected' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => setSelectedSquare((current) => (current === squareName ? null : squareName))}
                aria-label={squareName}
              >
                {colIndex === 0 && <span className="rank-label">{displayRanks[rowIndex]}</span>}
                {rowIndex === 7 && <span className="file-label">{displayFiles[colIndex]}</span>}
                {piece && (
                  <span className={`chess-piece ${isWhitePiece(piece) ? 'piece-white' : 'piece-black'}`}>
                    {getPieceSymbol(piece)}
                  </span>
                )}
              </button>
            );
          }))}
        </div>
      </div>
    </div>
  );
}
