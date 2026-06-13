from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Literal
from dotenv import load_dotenv
import os

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_API_KEY_II = os.getenv("GROQ_API_KEY_II")


class Settings(BaseSettings):
    groq_api_key: str = GROQ_API_KEY
    groq_api_key_II: str = GROQ_API_KEY_II
    cerebrase_api_key: str | None = None
    gemini_api_key:str | None = None

    white_model: str = "groq/llama-3.3-70b-versatile"
    black_model: str = "groq/openai/gpt-oss-120b"

    max_moves: int = 200
    temperature: float = 0.7
    timeout_per_move: int = 60


    class Config:
        env_file = ".env"

Settings = Settings()