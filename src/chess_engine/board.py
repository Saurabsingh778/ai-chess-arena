import chess
from typing import List, Optional, Tuple

class ChessBoard:
    def __init__(self, fen: Optional[str] = None):
        self.board = chess.Board(fen) if fen else chess.Board()

    
    def get_legal_moves(self) -> List[str]:
        """Return list of legal moves in UCI notation."""
        return [move.uci() for move in self.board.legal_moves()]
    
    def get_legal_moves_san(self) -> List[str]:
        """Return list of legal moves in SAN notation."""
        return [self.board.san(move) for move in self.board.legal_moves()]
    
    def make_move(self, move_uci: str) -> Tuple[bool, str]:
        """Apply a move. Returns (success, message)."""
        try:
            move = chess.Move.from_uci(move_uci)
            if move not in self.board.legal_moves:
                return False, f"Illegal move: {move_uci}"
            
            san = self.board.san(move=move)
            self.board.push(move)
            return True, san
        except ValueError as e:
            return False, f"Invalid move formate: {str(e)}"
    
    def get_fen(self) -> str:
        return self.board.fen()
    
    def is_game_over(self) -> bool:
        return self.board.is_game_over()
    
    def get_game_results(self) -> Optional[str]:
        if self.board.is_checkmate():
            return "checkmate"
        elif self.board.is_stalemate():
            return "stalemate"
        elif self.board.is_insufficient_material():
            return "insufficient_material"
        elif self.board.is_fivefold_repetition():
            return "repetition"
        elif self.board.is_seventyfive_moves():
            return "seventyfive_moves"
        return None
    
    def get_turn(self) -> str:
        return "white" if self.board.turn == chess.WHITE else "black"
    
    def get_board_visual(self) -> str:
        """ASCII board representation."""
        return str(self.board)
    
    def copy(self) -> "ChessBoard":
        return ChessBoard(self.get_fen())