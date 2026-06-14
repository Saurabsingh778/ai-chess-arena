from typing import TypedDict, Annotated, Literal
from operator import add
from langchain_core.messages import BaseMessage

class ChessGameState(TypedDict):
    #Board State

    fen: str
    move_history: Annotated[list[str], add]
    fullmove_number: int

    white_model:str
    black_model:str

    current_turn:Literal["white", "black"]
    turn_count: int

    game_status: Literal["ongoing", "checkmate", "stalemate", "draw", "resignation", "max_moves", "error"]

    winner: Literal["white", "black", "draw", None]

    last_move: str | None
    last_move_san: str | None
    proposed_move: str | None
    raw_model_output: str | None
    model_prompt: str | None
    active_model: str | None
    move_errors: Annotated[list[str], add]

    messages: Annotated[list[BaseMessage], add]
    commentary: Annotated[list[dict], add]

    game_id: str
    start_time: str
    end_time: str | None
