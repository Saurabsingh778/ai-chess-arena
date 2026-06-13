from typing import Dict, Type
from .base import BaseChessModel
from .groq_client import GroqChessModel
from .gemini_client import GeminiChessModel
from .cerebras_client import CerebraseChessModel
from .groq_client_II import GroqChessModelII

# Registry of available models
MODEL_REGISTRY: Dict[str, type[BaseChessModel]] = {
    "groq" : GroqChessModel,
    "gemini" : GeminiChessModel,
    "cerebrase" : CerebraseChessModel,
}

def create_model(model_string: str, temperature: float = 0.7) -> BaseChessModel:
    """
    Parse model string format: "provider/model-name"
    Example: "groq/llama-3.3-70b-versatile"
    """

    if "/" not in model_string:
        raise ValueError(f"Model string must be 'provider/model-name', got: {model_string}")
    
    provider, model_name = model_string.split('/', 1)
    provider = provider.lower()

    if provider not in MODEL_REGISTRY:
        raise ValueError(f"Unknown provider: {provider}. Available: {list(MODEL_REGISTRY.keys())}")
    
    model_class = MODEL_REGISTRY[provider]

    return model_class(model_name, temperature)