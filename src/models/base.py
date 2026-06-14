from abc import ABC, abstractmethod
from typing import AsyncIterator
from langchain_core.messages import BaseMessage

class BaseChessModel(ABC):
    """Abstract base for all chess-playing LLMs."""

    def __init__(self, model_id : str, temperature: float = 0.7):
        self.model_id = model_id
        self.temperature = temperature
        self.last_prompt: str | None = None
        self.last_raw_output: str | None = None
        self.last_proposed_move: str | None = None
        self.last_selected_move: str | None = None
    
    @abstractmethod
    async def get_move(self, fen: str, legal_moves: list[str],
                       move_history: list[str], color: str) -> str:
        """Given board state, return a UCI move string."""
        pass

    @abstractmethod
    async def analyze_position(self, fen: str) -> str:
        """Return a brief position analysis."""
        pass

    @property
    @abstractmethod
    def provider_name(self) -> str:
        pass
