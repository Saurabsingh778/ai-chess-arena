"""
AI Chess Arena — FastAPI WebSocket Server
Streams real-time game events to the React frontend.
"""

import asyncio
import uuid
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from src.graphs.chess_match_graph import build_graph
from src.state.game_state import ChessGameState
from src.models.model_factory import MODEL_REGISTRY
from src.config.settings import Settings

# ── Active matches store ─────────────────────────────────────────────
matches: Dict[str, Dict[str, Any]] = {}


# ── Pydantic request/response models ────────────────────────────────
class MatchRequest(BaseModel):
    white_model: str = "groq/openai/gpt-oss-120b"
    black_model: str = "groq_II/llama-3.3-70b-versatile"
    max_moves: int = 200
    temperature: float = 0.7


class MatchInfo(BaseModel):
    match_id: str
    status: str
    white_model: str
    black_model: str
    turn_count: int
    current_turn: str
    winner: Optional[str] = None
    game_status: str = "ongoing"


# ── App lifecycle ────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    # Clean up any running matches on shutdown
    for match_id, match in matches.items():
        if "task" in match and not match["task"].done():
            match["task"].cancel()


app = FastAPI(title="AI Chess Arena", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Match engine ─────────────────────────────────────────────────────
async def run_match_engine(match_id: str, white_model: str, black_model: str):
    """Run a chess match and push events to the match queue."""
    queue: asyncio.Queue = matches[match_id]["queue"]

    graph = build_graph()
    config = {"configurable": {"thread_id": f"chess-match-{match_id}"}}

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
        "game_id": match_id,
        "start_time": datetime.now().isoformat(),
        "end_time": None,
    }

    await queue.put({
        "type": "match_started",
        "match_id": match_id,
        "white_model": white_model,
        "black_model": black_model,
        "timestamp": time.time(),
    })

    try:
        async for event in graph.astream(initial_state, config, stream_mode="updates"):
            for node_name, node_state in event.items():
                changed_keys = sorted(node_state.keys())
                current_snapshot = matches[match_id]["state"]

                # Always send node-level event
                await queue.put({
                    "type": "node_update",
                    "node": node_name,
                    "changed_keys": changed_keys,
                    "timestamp": time.time(),
                })

                await queue.put({
                    "type": "graph_state",
                    "node": node_name,
                    "changed_keys": changed_keys,
                    "current_turn": node_state.get("current_turn", current_snapshot.get("current_turn")),
                    "turn_count": node_state.get("turn_count", current_snapshot.get("turn_count", 0)),
                    "game_status": node_state.get("game_status", current_snapshot.get("game_status")),
                    "last_move": node_state.get("last_move"),
                    "last_move_san": node_state.get("last_move_san"),
                    "timestamp": time.time(),
                })

                if node_name in ("white_player", "black_player"):
                    color = "white" if node_name == "white_player" else "black"
                    if node_state.get("proposed_move"):
                        await queue.put({
                            "type": "move_proposed",
                            "color": color,
                            "model": node_state.get("active_model"),
                            "proposed_move": node_state.get("proposed_move"),
                            "selected_move": node_state.get("last_move"),
                            "move_san": node_state.get("last_move_san"),
                            "timestamp": time.time(),
                        })

                    if node_state.get("raw_model_output"):
                        await queue.put({
                            "type": "raw_output",
                            "color": color,
                            "model": node_state.get("active_model"),
                            "raw_output": node_state.get("raw_model_output"),
                            "prompt": node_state.get("model_prompt"),
                            "proposed_move": node_state.get("proposed_move"),
                            "timestamp": time.time(),
                        })

                # Board update
                if "fen" in node_state and node_state["fen"]:
                    board_event = {
                        "type": "board_update",
                        "fen": node_state["fen"],
                        "last_move": node_state.get("last_move"),
                        "last_move_san": node_state.get("last_move_san"),
                        "current_turn": node_state.get("current_turn"),
                        "turn_count": node_state.get("turn_count", 0),
                        "move_history": node_state.get("move_history", []),
                        "game_status": node_state.get("game_status"),
                        "timestamp": time.time(),
                    }
                    await queue.put(board_event)

                    if node_state.get("last_move_san"):
                        played_color = "white" if node_state.get("turn_count", 0) % 2 == 1 else "black"
                        await queue.put({
                            "type": "move_applied",
                            "color": played_color,
                            "move_san": node_state.get("last_move_san"),
                            "move_uci": node_state.get("last_move"),
                            "fen": node_state["fen"],
                            "turn_count": node_state.get("turn_count", 0),
                            "timestamp": time.time(),
                        })

                    # Update stored state
                    matches[match_id]["state"].update({
                        "fen": node_state["fen"],
                        "current_turn": node_state.get("current_turn", "white"),
                        "turn_count": node_state.get("turn_count", 0),
                        "last_move": node_state.get("last_move"),
                        "last_move_san": node_state.get("last_move_san"),
                        "proposed_move": node_state.get("proposed_move"),
                        "raw_model_output": node_state.get("raw_model_output"),
                        "model_prompt": node_state.get("model_prompt"),
                        "active_model": node_state.get("active_model"),
                    })

                # Move errors
                if node_state.get("move_errors"):
                    for err in node_state["move_errors"]:
                        await queue.put({
                            "type": "error_event",
                            "error": err,
                            "node": node_name,
                            "category": "illegal_move" if "invalid move" in err.lower() or "illegal move" in err.lower() else "error",
                            "timestamp": time.time(),
                        })

                # Thinking status
                if node_name in ("white_player", "black_player"):
                    color = "white" if node_name == "white_player" else "black"
                    await queue.put({
                        "type": "move_event",
                        "color": color,
                        "move_san": node_state.get("last_move_san"),
                        "move_uci": node_state.get("last_move"),
                        "timestamp": time.time(),
                    })

                # Game over check
                if node_state.get("game_status") and node_state["game_status"] != "ongoing":
                    matches[match_id]["state"]["game_status"] = node_state["game_status"]
                    matches[match_id]["state"]["winner"] = node_state.get("winner")
                    await queue.put({
                        "type": "game_over",
                        "game_status": node_state["game_status"],
                        "winner": node_state.get("winner"),
                        "turn_count": matches[match_id]["state"].get("turn_count", 0),
                        "timestamp": time.time(),
                    })

    except asyncio.CancelledError:
        await queue.put({
            "type": "match_cancelled",
            "match_id": match_id,
            "timestamp": time.time(),
        })
    except Exception as e:
        await queue.put({
            "type": "error_event",
            "error": f"Match engine error: {str(e)}",
            "timestamp": time.time(),
        })
    finally:
        matches[match_id]["state"]["status"] = "finished"
        await queue.put({"type": "stream_end", "timestamp": time.time()})


# ── REST API Endpoints ───────────────────────────────────────────────
@app.get("/api/models")
async def get_available_models():
    """Return available model providers and their suggested models."""
    return {
        "providers": list(MODEL_REGISTRY.keys()),
        "suggested_models": {
            "groq": [
                "llama-3.3-70b-versatile",
                "llama-3.1-8b-instant",
                "gemma2-9b-it",
                "mixtral-8x7b-32768",
            ],
            "gemini": [
                "gemma-4-31b-it",
                "gemini-2.5-flash",
                "gemini-2.5-pro",
            ],
            "cerebrase": [
                "llama-3.3-70b",
                "llama-3.1-8b",
            ],
        },
    }


@app.post("/api/match/start")
async def start_match(req: MatchRequest):
    """Start a new chess match."""
    match_id = uuid.uuid4().hex[:8]

    matches[match_id] = {
        "queue": asyncio.Queue(),
        "state": {
            "status": "running",
            "white_model": req.white_model,
            "black_model": req.black_model,
            "game_status": "ongoing",
            "current_turn": "white",
            "turn_count": 0,
            "winner": None,
            "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            "last_move": None,
            "last_move_san": None,
            "proposed_move": None,
            "raw_model_output": None,
            "model_prompt": None,
            "active_model": None,
        },
        "clients": set(),
    }

    task = asyncio.create_task(
        run_match_engine(match_id, req.white_model, req.black_model)
    )
    matches[match_id]["task"] = task

    return {"match_id": match_id, "status": "started"}


@app.post("/api/match/{match_id}/stop")
async def stop_match(match_id: str):
    """Stop a running match."""
    if match_id not in matches:
        return {"error": "Match not found"}

    match = matches[match_id]
    if "task" in match and not match["task"].done():
        match["task"].cancel()
        return {"status": "stopping"}

    return {"status": "already_finished"}


@app.get("/api/match/{match_id}/state")
async def get_match_state(match_id: str):
    """Get current state of a match."""
    if match_id not in matches:
        return {"error": "Match not found"}
    return matches[match_id]["state"]


# ── WebSocket Endpoint ───────────────────────────────────────────────
@app.websocket("/ws/match/{match_id}")
async def websocket_match(websocket: WebSocket, match_id: str):
    """Stream match events to connected clients."""
    await websocket.accept()

    if match_id not in matches:
        await websocket.send_json({"type": "error", "error": "Match not found"})
        await websocket.close()
        return

    match = matches[match_id]
    queue: asyncio.Queue = match["queue"]

    # Send current state immediately
    await websocket.send_json({
        "type": "state_sync",
        **match["state"],
        "timestamp": time.time(),
    })

    # Create a personal queue for this client (fan-out pattern)
    client_queue: asyncio.Queue = asyncio.Queue()
    match.setdefault("client_queues", []).append(client_queue)

    # Start a task to fan out events from main queue to client queues
    async def fan_out():
        """Read from the main match queue and distribute to all client queues."""
        while True:
            try:
                event = await queue.get()
                for cq in match.get("client_queues", []):
                    await cq.put(event)
                if event.get("type") == "stream_end":
                    break
            except asyncio.CancelledError:
                break

    # Only start fan-out if not already running
    if "fan_out_task" not in match:
        match["fan_out_task"] = asyncio.create_task(fan_out())

    try:
        while True:
            event = await client_queue.get()
            await websocket.send_json(event)
            if event.get("type") == "stream_end":
                break
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        if client_queue in match.get("client_queues", []):
            match["client_queues"].remove(client_queue)


web_dist = Path(__file__).resolve().parent / "src" / "ui" / "web" / "dist"
if web_dist.exists():
    app.mount("/", StaticFiles(directory=web_dist, html=True), name="web")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
