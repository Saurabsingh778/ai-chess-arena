from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from typing import Literal

from ..state.game_state import ChessGameState
from ..agents.game_orchestrator import (
    initialize_game, check_game_over, detect_turn, finalize_game
)
from ..agents.chess_player import white_player_node, black_player_node
from ..agents.move_validator import validate_move

def build_graph():
    """Build and compile the chess match LangGraph."""

    builder = StateGraph(ChessGameState)

    builder.add_node("init_game", initialize_game)
    builder.add_node("white_player", white_player_node)
    builder.add_node("black_player", black_player_node)
    builder.add_node("validate_move", validate_move)
    builder.add_node("finalize", finalize_game)

    builder.add_edge(START, "init_game")
    builder.add_edge("init_game", "white_player")
    builder.add_edge("white_player", "validate_move")
    
    builder.add_conditional_edges(
        "validate_move",
        check_game_over,
        {
            "continue_black" : "black_player",
            "continue_white" : "white_player",
            "checkmate_white" : "finalize",
            "checkmate_black" : "finalize",
            "draw" : "finalize",
            "max_moves" : "finalize",
        }
    )

    builder.add_edge("black_player", "validate_move")

    builder.add_edge("finalize", END)

    memory = MemorySaver()
    graph = builder.compile(checkpointer=memory)

    return graph




    


