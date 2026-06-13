import asyncio
from src.models.gemini_client import TestGeminiChessModel
from dotenv import load_dotenv
import os

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")


async def main():
    api_key = API_KEY
    model_id = "gemini-2.5-flash-preview-tts"
    temperature = 0.7

    model = TestGeminiChessModel(
        api_key=api_key,
        model_id=model_id,
        temperature=temperature,
    )

    fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

    legal_moves = [
        "e2e4",
        "d2d4",
        "g1f3",
        "c2c4",
        "b1c3",
    ]

    move = await model.get_move(
        fen=fen,
        legal_moves=legal_moves,
        move_history=[],
        color="white",
    )

    print("Move:", move)


if __name__ == "__main__":
    asyncio.run(main())