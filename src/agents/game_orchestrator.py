from typing import Dict, Any
from ..state.game_state import ChessGameState
from ..chess_engine.board import ChessBoard

def initialize_game(state: ChessGameState) -> Dict[str, Any]:
    """Initialize a new chess game."""
    import uuid
    from datetime import datetime

    return {
        "fen" : ChessBoard().get_fen(),
        "move_history" : [],
        "fullmove_number" : 1,
        "current_turn" : "white",
        "turn_count" : 0,
        "game_status" : "ongoing",
        "winner" : None,
        "last_move" : None,
        "last_move_san" : None,
        "proposed_move" : None,
        "raw_model_output" : None,
        "model_prompt" : None,
        "active_model" : None,
        "move_errors" : [],
        "messages" : [],
        "commentary" : [],
        "game_id" : str(uuid.uuid4())[:8],
        "start_time" : datetime.now().isoformat(),
        "end_time" : None,
    }


def check_game_over(state: ChessGameState) -> str:
    """Conditional edge: check if game should end."""

    # Bug 3 fix: handle non-board terminations (resignation, timeout)
    # validate_move preserves these; route them straight to finalize
    if state.get("game_status") not in (None, "ongoing"):
        return "draw"  # both "draw" and "checkmate_*" map to finalize anyway

    board = ChessBoard(state["fen"])

    if state["turn_count"] >= 200:
        return "max_moves"

    if board.is_game_over():
        result = board.get_game_results()
        if result == "checkmate":
            winner = "black" if state["current_turn"] == "white" else "white"
            return f"checkmate_{winner}"
        return "draw"

    # Bug 1 fix: inverted condition was here
    return "continue_black" if state["current_turn"] == "black" else "continue_white"

def detect_turn(state: ChessGameState) -> str:
    """Route to the correct player's subgraph."""
    return state["current_turn"]

def finalize_game(state: ChessGameState) -> Dict[str, Any]:
    """Clean up and export game result."""
    from datetime import datetime

    board = ChessBoard(state["fen"])
    board_result = board.get_game_results()
    end_time = datetime.now().isoformat()

    if board_result:
        # Board-level termination: checkmate, stalemate, etc.
        winner = None
        if board_result == "checkmate":
            winner = "black" if state["current_turn"] == "white" else "white"
        else:
            winner = "draw"
        return {"game_status": board_result, "winner": winner, "end_time": end_time}

    # Bug 4 fix: non-board terminations
    if state["turn_count"] >= 200:
        return {"game_status": "max_moves", "winner": "draw", "end_time": end_time}

    # Resignation/timeout: winner is already set in state by player_move_node
    # Just add end_time; don't clobber game_status or winner
    return {"end_time": end_time}
