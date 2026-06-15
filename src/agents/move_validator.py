from typing import Dict, Any
from ..state.game_state import ChessGameState
from ..chess_engine.board import ChessBoard

def validate_move(state: ChessGameState) -> Dict[str, Any]:
    """Post-move validation and state update."""

    current_status = state.get("game_status")

    if current_status not in (None, "ongoing"):
        return {"game_status": current_status}

    board = ChessBoard(state["fen"])
    status = "ongoing"
    new = board.get_game_results()
    if new:
        status = new

    return {"game_status": status}
    