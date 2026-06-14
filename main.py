import asyncio
import uuid
from rich.console import Console
from rich.live import Live

from src.graphs.chess_match_graph import build_graph
from src.state.game_state import ChessGameState
from src.ui.cli_display import display_board, display_game_result
from src.config.settings import Settings
import sys
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

console = Console()

async def run_match(white_model: str, black_model: str):
    """Run a complete chess match between two AI models."""

    graph = build_graph()

    config = {
        "configurable": {
            "thread_id": f"chess-match-{uuid.uuid4().hex[:8]}"
        }
    }

    initial_state: ChessGameState = {
        "fen": "",
        "move_history": [],
        "fullmove_number": 1,
        "white_model": white_model,
        "black_model": black_model,
        "current_turn": "white",
        "turn_count": 0,
        "game_status": "ongoing",
        "winner": None,
        "last_move": None,
        "last_move_san": None,
        "proposed_move": None,
        "raw_model_output": None,
        "model_prompt": None,
        "active_model": None,
        "move_errors": [],
        "messages": [],
        "commentary": [],
        "game_id": "",
        "start_time": "",
        "end_time": None,
    }

    console.print(f"[bold green]Starting Chess Match![/bold green]")
    console.print(f"White: {initial_state['white_model']}")
    console.print(f"Black: {initial_state['black_model']}")
    console.print("─" * 50)

    with Live(console=console, refresh_per_second=1) as live:
        async for event in graph.astream(initial_state, config, stream_mode="updates"):
            for node_name, node_state in event.items():
                if "fen" in node_state and node_state["fen"]:
                    display_board(
                        node_state["fen"],
                        node_state.get("last_move_san"),
                        node_state.get("current_turn")
                    )
                if node_state.get("game_status") and node_state["game_status"] != "ongoing":
                    display_game_result(node_state)

    final_state = graph.get_state(config)
    return final_state.values

if __name__ == "__main__":
    # Example: Groq vs Gemini
    asyncio.run(run_match(
        white_model="groq/llama-3.3-70b-versatile",
        black_model="gemini/gemma-4-31b-it"
    ))
