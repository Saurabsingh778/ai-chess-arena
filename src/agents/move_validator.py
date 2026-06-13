from typing import Dict, Any
from ..state.game_state import ChessGameState
from ..chess_engine.board import ChessBoard

def validate_move(state: ChessGameState) -> Dict[str, Any]:
    """Post-move validation and state update."""
    board = ChessBoard(state["fen"])
    
    # Check for check, checkmate, draws
    status = "ongoing"
    if board.is_checkmate():
        status = "checkmate"
    elif board.is_stalemate():
        status = "stalemate"
    elif board.is_insufficient_material():
        status = "draw"
    
    return {"game_status": status}
    