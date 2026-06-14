from typing import Dict, Any
from ..state.game_state import ChessGameState
from ..chess_engine.board import ChessBoard

def validate_move(state: ChessGameState) -> Dict[str, Any]:
    """Post-move validation and state update."""
    board = ChessBoard(state["fen"])
    
    # Check for check, checkmate, draws
    status = "ongoing"
    new = board.get_game_results()

    if new:
        status = new
    
    return {"game_status": status}
    