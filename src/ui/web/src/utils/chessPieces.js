export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
export const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

export const PIECES = {
  K: '♔',
  Q: '♕',
  R: '♖',
  B: '♗',
  N: '♘',
  P: '♙',
  k: '♚',
  q: '♛',
  r: '♜',
  b: '♝',
  n: '♞',
  p: '♟',
};

const STARTING_COUNTS = {
  P: 8,
  N: 2,
  B: 2,
  R: 2,
  Q: 1,
  K: 1,
  p: 8,
  n: 2,
  b: 2,
  r: 2,
  q: 1,
  k: 1,
};

const PIECE_ORDER = ['q', 'r', 'b', 'n', 'p', 'Q', 'R', 'B', 'N', 'P'];

export function parseFEN(fen) {
  const emptyBoard = Array.from({ length: 8 }, () => Array(8).fill(null));
  if (!fen) return emptyBoard;

  const placement = fen.split(' ')[0];
  const rows = placement.split('/');
  if (rows.length !== 8) return emptyBoard;

  return rows.map((row) => {
    const squares = [];
    for (const char of row) {
      if (/\d/.test(char)) {
        for (let i = 0; i < Number(char); i += 1) squares.push(null);
      } else {
        squares.push(char);
      }
    }
    return squares.slice(0, 8);
  });
}

export function getPieceSymbol(piece) {
  return PIECES[piece] || '';
}

export function isWhitePiece(piece) {
  return Boolean(piece && piece === piece.toUpperCase());
}

export function squareToCoords(square) {
  if (!square || square.length < 2) return null;
  const file = square[0].toLowerCase();
  const rank = square[1];
  const col = FILES.indexOf(file);
  const row = RANKS.indexOf(rank);
  if (row < 0 || col < 0) return null;
  return { row, col, square: `${file}${rank}` };
}

export function coordsToSquare(row, col) {
  if (row < 0 || row > 7 || col < 0 || col > 7) return null;
  return `${FILES[col]}${RANKS[row]}`;
}

export function uciToSquares(uci) {
  if (!uci || uci.length < 4) return { from: null, to: null };
  return {
    from: squareToCoords(uci.slice(0, 2)),
    to: squareToCoords(uci.slice(2, 4)),
  };
}

export function getActiveColor(fen) {
  return fen?.split(' ')[1] === 'b' ? 'black' : 'white';
}

export function getCapturedPieces(fen) {
  if (!fen) return { white: [], black: [] };

  const currentCounts = {};
  for (const char of fen.split(' ')[0]) {
    if (char in STARTING_COUNTS) {
      currentCounts[char] = (currentCounts[char] || 0) + 1;
    }
  }

  const capturedByWhite = [];
  const capturedByBlack = [];

  for (const piece of PIECE_ORDER) {
    const startCount = STARTING_COUNTS[piece] || 0;
    const missing = startCount - (currentCounts[piece] || 0);
    for (let i = 0; i < missing; i += 1) {
      if (isWhitePiece(piece)) capturedByBlack.push(piece);
      else capturedByWhite.push(piece);
    }
  }

  return { white: capturedByWhite, black: capturedByBlack };
}

export function getMoveColor(turnCount) {
  if (!turnCount) return null;
  return turnCount % 2 === 1 ? 'white' : 'black';
}

export function getStage(turnCount = 0, gameStatus = 'waiting') {
  if (gameStatus && !['waiting', 'ongoing'].includes(gameStatus)) return 'Final';
  const fullMove = Math.max(1, Math.ceil(turnCount / 2));
  if (fullMove <= 10) return 'Opening';
  if (fullMove <= 32) return 'Middlegame';
  return 'Endgame';
}

export function formatModelName(model) {
  if (!model) return { provider: 'Model', name: 'Not selected', label: 'Not selected' };
  const [provider, ...rest] = model.split('/');
  const name = rest.join('/') || provider;
  const providerLabel = provider.charAt(0).toUpperCase() + provider.slice(1);
  return {
    provider: providerLabel,
    name,
    label: rest.length ? `${providerLabel} - ${name}` : name,
  };
}

export function describeMove({ san, uci, color }) {
  if (!san) return 'No move has been played yet.';

  const side = color ? color.charAt(0).toUpperCase() + color.slice(1) : 'Player';
  const cleanSan = san.replace(/[+#?!]+/g, '');
  const destination = uci?.slice(2, 4) || cleanSan.match(/[a-h][1-8]/)?.[0] || '';

  if (cleanSan === 'O-O') return `${side} castles kingside.`;
  if (cleanSan === 'O-O-O') return `${side} castles queenside.`;

  const pieceMap = {
    K: 'King',
    Q: 'Queen',
    R: 'Rook',
    B: 'Bishop',
    N: 'Knight',
  };
  const first = cleanSan[0];
  const piece = pieceMap[first] || 'Pawn';
  const capture = san.includes('x') ? ' captures on' : ' to';
  const suffix = san.endsWith('#') ? ' checkmate' : san.endsWith('+') ? ' check' : '';

  return `${side} plays ${san} - ${piece}${capture} ${destination}${suffix}.`;
}
