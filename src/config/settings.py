from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Literal

class Settings(BaseSettings):
    groq_api_key: str | None = None
    cerebrase_api_key: str | None = None
    gemini_api_key:str | None = None

    white_model: str = "groq/llama-3.3-70b-versatile"
    black_model: str = "gemini/gemini-2.5-flash"

    max_moves: int = 200
    temperature: float = 0.7
    timeout_per_move: int = 60


    class Config:
        env_file = ".env"

Settings = Settings()