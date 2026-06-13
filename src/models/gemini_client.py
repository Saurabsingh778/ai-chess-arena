from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
from .base import BaseChessModel
from ..config.settings import Settings

class GeminiChessModel(BaseChessModel):
    def __init__(self, model_id: str, temperature: float = 0.7):
        super().__init__(model_id, temperature)

        self.llm = ChatGoogleGenerativeAI(
            model=model_id,
            temperature=temperature,
            api_key=Settings.gemini_api_key,
            timeout=Settings.timeout_per_move,
        )

    @property
    def provider_name(self):
        return "Google"
    
    async def get_move(self, fen: str, legal_moves: list[str], move_history: list[str], color: str) -> str:
        system_prompt = f"""You are a chess engine playing as {color}.
Your task: analyze the position and choose the BEST move.
Respond ONLY with a UCI move string (e.g., 'e2e4', 'g1f3', 'e1g1' for castling).
Do not explain. Do not add punctuation. Just the 4-5 character UCI move.

Current FEN: {fen}
Legal moves: {', '.join(legal_moves)}
Move history: {', '.join(move_history[-10:]) if move_history else 'None'}"""
        
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content="Your Move: ")
        ]

        response = await self.llm.ainvoke(messages)

        # 1. Safely extract text whether the response is a list (thinking models) or a string
        if isinstance(response.content, list):
            text_content = "".join(
                block.get("text", "") 
                for block in response.content 
                if isinstance(block, dict) and block.get("type") == "text"
            )
        else:
            text_content = response.content

        # 2. Use .split()[0] to get the full move (e.g., "e2e4")
        if text_content.strip():
            move = text_content.strip().split()[0]
        else:
            move = "0000"

        # Validate it's in legal moves
        if move not in legal_moves:
            move = legal_moves[0] if legal_moves else "0000"
        
        return move
    
    async def analyze_position(self, fen: str) -> str:
        prompt = f"Analyze this chess position briefly (FEN: {fen})."
        response = await self.llm.ainvoke([HumanMessage(content=prompt)])
        
        if isinstance(response.content, list):
            return "".join(
                block.get("text", "") 
                for block in response.content 
                if isinstance(block, dict) and block.get("type") == "text"
            )
        
        return response.content

#--------------------------------------------------------------------------------------------------------------------------------------
"""Testing"""
#--------------------------------------------------------------------------------------------------------------------------------------

class TestGeminiChessModel:
    def __init__(self, api_key: str, model_id: str, temperature: float = 0.7, timeout: int = 40):
        self.llm = ChatGoogleGenerativeAI(
            model=model_id,
            temperature=temperature,
            api_key=api_key,
            timeout=timeout
        )
    
    async def get_move(self, fen: str, legal_moves: list[str], move_history: list[str], color: str) -> str:
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
            HumanMessage(content="Your Move:")
        ]

        response = await self.llm.ainvoke(messages)

        print("\nRaw LLM Response:")
        print(response.content)

        # Safely extract text
        if isinstance(response.content, list):
            text_content = "".join(
                block.get("text", "") 
                for block in response.content 
                if isinstance(block, dict) and block.get("type") == "text"
            )
        else:
            text_content = response.content

        # Extract the move properly
        if text_content.strip():
            move = text_content.strip().split()[0]
        else:
            move = "0000"

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

        if isinstance(response.content, list):
            return "".join(
                block.get("text", "") 
                for block in response.content 
                if isinstance(block, dict) and block.get("type") == "text"
            )
            
        return response.content