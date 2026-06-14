/**
 * Chess piece Unicode mappings and FEN→piece conversion utilities.
 */

// Unicode chess pieces
export const PIECES = {
  // White pieces
  K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
  // Black pieces
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟',
};

/**
 * Parse a FEN string into an 8x8 board array.
 * Returns array of 8 rows (rank 8 to rank 1), each row is array of 8 chars.
 * Empty squares are null.
 */
export function parseFEN(fen) {
  if (!fen) return Array(8).fill(null).map(() => Array(8).fill(null));

  const placement = fen.split(' ')[0];
  const rows = placement.split('/');

  return rows.map(row => {
    const squares = [];
    for (const ch of row) {
      if (/\d/.test(ch)) {
        for (let i = 0; i < parseInt(ch); i++) squares.push(null);
      } else {
        squares.push(ch);
      }
    }
    return squares;
  });
}

/**
 * Get the Unicode symbol for a FEN piece character.
 */
export function getPieceSymbol(piece) {
  return PIECES[piece] || '';
}

/**
 * Determine if a piece char is white (uppercase).
 */
export function isWhitePiece(piece) {
  return piece && piece === piece.toUpperCase();
}

/**
 * Convert UCI notation (e.g. "e2e4") to from/to squares as [row, col].
 */
export function uciToSquares(uci) {
  if (!uci || uci.length < 4) return { from: null, to: null };

  const fileToCol = (f) => f.charCodeAt(0) - 'a'.charCodeAt(0);
  const rankToRow = (r) => 8 - parseInt(r);

  return {
    from: { row: rankToRow(uci[1]), col: fileToCol(uci[0]) },
    to: { row: rankToRow(uci[3]), col: fileToCol(uci[2]) },
  };
}

/**
 * Get which side is in check from FEN (basic heuristic: 
 * this would need a proper chess engine, so we keep it simple)
 */
export function getActiveColor(fen) {
  if (!fen) return 'w';
  const parts = fen.split(' ');
  return parts[1] || 'w';
}

/**
 * Calculate captured pieces from move history FENs.
 * Since we only have current FEN, we compare piece counts vs starting position.
 */
export function getCapturedPieces(fen) {
  if (!fen) return { white: [], black: [] };

  const startingCounts = {
    P: 8, N: 2, B: 2, R: 2, Q: 1, K: 1,
    p: 8, n: 2, b: 2, r: 2, q: 1, k: 1,
  };

  const placement = fen.split(' ')[0];
  const currentCounts = {};

  for (const ch of placement) {
    if (/[a-zA-Z]/.test(ch) && ch in startingCounts) {
      currentCounts[ch] = (currentCounts[ch] || 0) + 1;
    }
  }

  const capturedByWhite = []; // Black pieces captured by white
  const capturedByBlack = []; // White pieces captured by black

  for (const [piece, startCount] of Object.entries(startingCounts)) {
    const current = currentCounts[piece] || 0;
    const diff = startCount - current;
    for (let i = 0; i < diff; i++) {
      if (isWhitePiece(piece)) {
        capturedByBlack.push(piece);
      } else {
        capturedByWhite.push(piece);
      }
    }
  }

  return { white: capturedByWhite, black: capturedByBlack };
}
