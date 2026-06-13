from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage
from .base import BaseChessModel
from ..config.settings import Settings
import asyncio
import os

class GroqChessModel(BaseChessModel):
    def __init__(self, model_id: str, temperature: float = 0.7):
        super().__init__(model_id, temperature)

        self.llm = ChatGroq(
            model = model_id,
            temperature=temperature,
            api_key=Settings.groq_api_key,
            timeout=Settings.timeout_per_move,
        )

    @property
    def provider_name(self) -> str:
        return "groq"
    
    async def get_move(self, fen: str, legal_moves: list[str],
                       move_history: list[str], color: str) -> str:
        system_prompt = f"""You are a chess engine playing as {color}.
Your task: analyze the position and choose the BEST move.
Respond ONLY with a UCI move string (e.g., 'e2e4', 'g1f3', 'e1g1' for castling).
Do not explain. Do not add punctuation. Just the 4-5 character UCI move.

Current FEN: {fen}
Legal moves: {', '.join(legal_moves)}
Move history: {', '.join(move_history[-10:]) if move_history else 'None'}"""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content="Your Move:")
        ]

        response = await self.llm.ainvoke(messages)
        move = response.content.strip().split()[0]

        # Validate it's in legal moves
        if move not in legal_moves:
            # Try to find closest match or pick first legal
            move = legal_moves[0] if legal_moves else "0000"
        
        return move
    
    async def analyze_position(self, fen: str) -> str:
        prompt = f"Analyze this chess position briefly (FEN: {fen})."
        response = await self.llm.ainvoke([HumanMessage(content=prompt)])
        return response.content



#--------------------------------------------------------------------------------------------------------------------------------------
"""Testing"""
#--------------------------------------------------------------------------------------------------------------------------------------

class TestGroqChessModel:
    def __init__(
        self,
        api_key: str,
        model_id: str,
        temperature: float = 0.7,
        timeout: int = 30,
    ):
        self.llm = ChatGroq(
            model=model_id,
            temperature=temperature,
            api_key=api_key,
            timeout=timeout,
        )

    async def get_move(
        self,
        fen: str,
        legal_moves: list[str],
        move_history: list[str],
        color: str,
    ) -> str:

        system_prompt = f"""
You are a chess engine playing as {color}.

Your task: analyze the position and choose the BEST move.

Respond ONLY with a UCI move string.

Examples:
e2e4
g1f3
e1g1

Current FEN: {fen}

Legal moves:
{", ".join(legal_moves)}

Move history:
{", ".join(move_history[-10:]) if move_history else "None"}
"""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content="Your move:")
        ]

        response = await self.llm.ainvoke(messages)

        print("\nRaw LLM Response:")
        print(response.content)

        move = response.content.strip().split()[0]

        if move not in legal_moves:
            print(f"\nInvalid move returned: {move}")
            move = legal_moves[0]

        return move

    async def analyze_position(self, fen: str) -> str:

        prompt = f"""
Analyze this chess position briefly.

FEN:
{fen}
"""

        response = await self.llm.ainvoke(
            [HumanMessage(content=prompt)]
        )

        return response.content

