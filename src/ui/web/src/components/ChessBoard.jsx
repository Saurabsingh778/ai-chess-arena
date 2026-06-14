import { useMemo } from 'react';
import { parseFEN, getPieceSymbol, uciToSquares } from '../utils/chessPieces';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

/**
 * Interactive SVG chessboard with piece rendering and move highlighting.
 */
export default function ChessBoard({ fen, lastMove, flipped = false }) {
  const board = useMemo(() => parseFEN(fen), [fen]);
  const highlights = useMemo(() => uciToSquares(lastMove), [lastMove]);

  const displayBoard = flipped ? [...board].reverse().map(r => [...r].reverse()) : board;
  const displayFiles = flipped ? [...FILES].reverse() : FILES;
  const displayRanks = flipped ? [...RANKS].reverse() : RANKS;

  return (
    <div className="chess-board-wrapper">
      {/* Rank labels */}
      <div className="board-labels-ranks">
        {displayRanks.map((rank) => (
          <span key={rank}>{rank}</span>
        ))}
      </div>

      {/* Board grid */}
      <div className="chess-board">
        {displayBoard.map((row, rowIdx) =>
          row.map((piece, colIdx) => {
            // Map display indices back to actual board indices for highlighting
            const actualRow = flipped ? 7 - rowIdx : rowIdx;
            const actualCol = flipped ? 7 - colIdx : colIdx;

            const isLight = (actualRow + actualCol) % 2 === 0;
            const isFrom = highlights.from &&
              highlights.from.row === actualRow &&
              highlights.from.col === actualCol;
            const isTo = highlights.to &&
              highlights.to.row === actualRow &&
              highlights.to.col === actualCol;

            const classes = [
              'chess-square',
              isLight ? 'light' : 'dark',
              isFrom ? 'highlight-from' : '',
              isTo ? 'highlight-to' : '',
            ].filter(Boolean).join(' ');

            return (
              <div
                key={`${rowIdx}-${colIdx}`}
                className={classes}
              >
                {piece && (
                  <span className={`chess-piece ${isTo ? 'animate-in' : ''}`}>
                    {getPieceSymbol(piece)}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* File labels */}
      <div className="board-labels-files">
        {displayFiles.map((file) => (
          <span key={file}>{file}</span>
        ))}
      </div>
    </div>
  );
}
