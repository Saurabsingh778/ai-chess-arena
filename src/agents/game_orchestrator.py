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
        "move_errors" : [],
        "messages" : [],
        "commentary" : [],
        "game_id" : str(uuid.uuid4())[:8],
        "start_time" : datetime.now().isoformat(),
        "end_time" : None,
    }


def check_game_over(state: ChessGameState) -> str:
    """Conditional edge: check if game should end."""
    board = ChessBoard(state["fen"])

    if state["turn_count"] >= 200:
        return "max_moves"
    
    if board.is_game_over():
        result = board.get_game_results()
        if result == "checkmate":
            winner = "black" if state["current_turn"] == "white" else "white"
            return f"checkmate_{winner}"
        return "draw"
    
    return "continue"

def detect_turn(state: ChessGameState) -> str:
    """Route to the correct player's subgraph."""
    return state["current_turn"]

def finalize_game(state: ChessGameState) -> Dict[str, Any]:
    """Clean up and export game result."""
    from datetime import datetime

    board = ChessBoard(state["fen"])
    result = board.get_game_results()

    winner = None
    if result == "checkmate":
        winner = "black" if state["current_turn"] == "white" else "white"
    elif result in ["stalemate", "insufficient_material", "repetition"]:
        winner = "draw"
    
    return {
        "game_status" : result or "completed",
        "winner" : winner,
        "end_time" : datetime.now().isoformat(),
    }

