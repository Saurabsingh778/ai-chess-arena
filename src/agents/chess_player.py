from typing import Dict, Any
from ..state.game_state import ChessGameState
from ..chess_engine.board import ChessBoard
from ..models.model_factory import create_model
from ..config.settings import Settings
import asyncio

async def player_move_node(state: ChessGameState, color: str) -> Dict[str, Any]:
    """Execute a single player's turn."""
    board = ChessBoard(state["fen"])
    legal_moves = board.get_legal_moves()

    if not legal_moves:
        return {"game_status" : "stalemate"}
    
    model_string = state["white_model"] if color == "white" else state["black_model"]

    model = create_model(model_string, Settings.temperature)

    try:
        move_uci = await asyncio.wait_for(
            model.get_move(
                fen=state["fen"],
                legal_moves=legal_moves,
                move_history=state["move_history"],
                color=color
            ),
            timeout=Settings.timeout_per_move
        )
    except asyncio.TimeoutError:
        return {
            "move_errors" : [f"{color} timeout - forfeit"],
            "game_status": "resignation",
            "winner": "black" if color == "white" else "white",
            "active_model": model_string,
        }
    except Exception as e:
        fallback = legal_moves[0] if legal_moves else None
        if fallback:
            success, san = board.make_move(fallback)
            if success:
                return {
                    "move_errors": [f"{color} exception, used fallback {fallback}: {str(e)}"],
                    "fen": board.get_fen(),
                    "last_move": fallback,
                    "last_move_san": san,
                    "current_turn": "black" if color == "white" else "white",
                    "turn_count": state["turn_count"] + 1,
                    "active_model": model_string,
                    **model_metadata,
                }
        return {
            "move_errors": [f"{color} fatal error: {str(e)}"],
            "game_status": "error",
            "winner": "black" if color == "white" else "white",
        }

    model_metadata = {
        "proposed_move": getattr(model, "last_proposed_move", None) or move_uci,
        "raw_model_output": getattr(model, "last_raw_output", None),
        "model_prompt": getattr(model, "last_prompt", None),
        "active_model": model_string,
    }
    
    success, san = board.make_move(move_uci)

    if not success:
        # Invalid move - retry with first legal move as fallback
        return {
            "move_errors": [f"{color} invalid move: {move_uci}"],
            "move_uci": legal_moves[0],
            "last_move": legal_moves[0],
            **model_metadata,
        }
    
    return {
        "fen": board.get_fen(),
        "last_move": move_uci,
        "last_move_san": san,
        **model_metadata,
        "move_history": [move_uci],
        "current_turn": "black" if color == "white" else "white",
        "turn_count": state["turn_count"] + 1,
        "messages": [{"role": "assistant", "content": f"{color} played {san}"}],

    }

# Wrapper functions for graph nodes (async — no nested asyncio.run)
async def white_player_node(state: ChessGameState) -> Dict[str, Any]:
    return await player_move_node(state, "white")

async def black_player_node(state: ChessGameState) -> Dict[str, Any]:
    return await player_move_node(state, "black")
