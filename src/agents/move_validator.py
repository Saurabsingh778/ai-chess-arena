from typing import Dict, Any
from ..state.game_state import ChessGameState
from ..chess_engine.board import ChessBoard

def validate_move(state: ChessGameState) -> Dict[str, Any]:
    """Post-move validation and state update."""

    if state.get("game_status") not in (None, "ongoing"):
        return {}

    board = ChessBoard(state["fen"])
    status = "ongoing"
    new = board.get_game_results()
    if new:
        status = new

    return {"game_status": status}
    