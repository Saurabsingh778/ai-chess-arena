from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from ..chess_engine.board import ChessBoard

console = Console()

def display_board(fen: str, last_move: str = None, turn: str = None):
    """Display chess board in terminal with Rich."""
    board = ChessBoard(fen)
    
    # Create board grid
    grid = Table(show_header=False, show_edge=True, padding=0)
    for _ in range(8):
        grid.add_column(width=3)
    
    board_str = board.get_board_visual().split("\n")
    for row in board_str:
        grid.add_row(*row.split())
    
    title = f"Chess Board | Turn: {turn or '?'}"
    if last_move:
        title += f" | Last: {last_move}"
    
    console.print(Panel(grid, title=title, border_style="blue"))

def display_game_result(state: dict):
    """Display final game results."""
    console.print(Panel(
        f"[bold]Game Over![/bold]\n"
        f"Winner: {state.get('winner', 'Unknown')}\n"
        f"Status: {state.get('game_status')}\n"
        f"Total Moves: {state.get('turn_count')}",
        title="Result",
        border_style="green" if state.get('winner') else "yellow"
    ))