import os
import json
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from app.services.strategy_model import F1StrategySimulator
from app.services.telemetry_streamer import TelemetryStreamer

import sys
# Append root-level ai-engine directory to sys.path
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ai-engine"))
from reasoning_agent import RaceEngineerAgent

app = FastAPI(
    title="Apexion AI - Backend API",
    description="F1 Pit-Wall Telemetry Streaming, Strategy Simulation, and Explainable AI Copilot.",
    version="1.0.0"
)

# Enable CORS for Next.js app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to the frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize global services
telemetry_streamer = TelemetryStreamer()
copilot_agent = RaceEngineerAgent()

# Pydantic Schemas
class PitStopItem(BaseModel):
    lap: int
    next_tyre: str

class SimulationRequest(BaseModel):
    track_name: str
    start_tyre: str
    pit_stops: List[PitStopItem]
    track_temp: Optional[float] = 38.0
    weather: Optional[str] = "Sunny"

class ChatRequest(BaseModel):
    question: str
    mode: Optional[str] = "engineering" # "engineering" or "fan"
    current_telemetry: Optional[Dict[str, Any]] = None

class RAGRequest(BaseModel):
    query: str
    top_k: Optional[int] = 2

# REST Routes
@app.get("/api/status")
def read_status():
    return {
        "status": "online",
        "service": "Apexion AI Backend",
        "ai_engine_live": copilot_agent.use_live_api,
        "active_session": telemetry_streamer.selected_session
    }

@app.get("/api/sessions")
def get_sessions():
    return [
        {
            "key": "silverstone_2020",
            "name": "British GP 2020 (Silverstone)",
            "context": "Hamilton front-left tyre puncture drama on final lap.",
            "weather": "Dry - Hot",
            "track_temp": 38.5
        },
        {
            "key": "monaco_2022",
            "name": "Monaco GP 2022 (Monte Carlo)",
            "context": "Dry-wet transition and double-stack strategy chaos.",
            "weather": "Rain transitioning to Dry",
            "track_temp": 24.0
        },
        {
            "key": "live_sim",
            "name": "F1 Cinematic Live Simulator",
            "context": "Real-time F1 simulator active inside dashboard.",
            "weather": "Dry - Sunny",
            "track_temp": 38.5
        }
    ]

@app.post("/api/simulate")
def simulate_strategy(req: SimulationRequest):
    try:
        print("SIMULATION REQUEST RECEIVED:", req)
        pit_stops_dict = [{"lap": s.lap, "next_tyre": s.next_tyre} for s in req.pit_stops]
        results = F1StrategySimulator.run_simulation(
            track_name=req.track_name,
            start_tyre=req.start_tyre,
            pit_stops=pit_stops_dict,
            track_temp=req.track_temp,
            weather=req.weather or "Sunny"
        )
        return results
    except Exception as e:
        print("SIMULATION ERROR:", str(e))
        raise HTTPException(status_code=500, detail=f"Simulation error: {str(e)}")

@app.post("/api/copilot/chat")
def copilot_chat(req: ChatRequest):
    try:
        response = copilot_agent.get_response(
            question=req.question,
            mode=req.mode,
            telemetry=req.current_telemetry
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Engine chat error: {str(e)}")

@app.post("/api/rag/query")
def query_rag(req: RAGRequest):
    try:
        hits = copilot_agent.rag.retrieve(query=req.query, top_k=req.top_k)
        return {"hits": hits}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RAG retrieval error: {str(e)}")


# WebSocket Telemetry Stream
@app.websocket("/ws/telemetry")
async def websocket_telemetry(websocket: WebSocket):
    await websocket.accept()
    print("WebSocket client connected to live telemetry stream.")
    
    # Send initial session meta
    initial_frame = telemetry_streamer.get_next_frame()
    await websocket.send_json({
        "type": "init",
        "data": initial_frame
    })

    # Start task to receive commands from client
    async def receive_commands():
        import json
        try:
            while True:
                data = await websocket.receive_text()
                cmd = json.loads(data)
                print(f"WS Command received: {cmd}")
                telemetry_streamer.process_command(cmd)
        except WebSocketDisconnect:
            print("WS Command receiver disconnected.")
        except Exception as e:
            print(f"WS Command error: {e}")

    cmd_task = asyncio.create_task(receive_commands())

    try:
        # Loop that streams frames at a regular interval (1Hz default)
        while True:
            frame = telemetry_streamer.get_next_frame()
            await websocket.send_json({
                "type": "telemetry",
                "data": frame
            })
            
            # Tick rate: wait 1 second
            # Can be influenced by speed multiplier, but let's keep tick rate at 1 second
            # and let speed_multiplier handle jumping index steps (e.g. current_frame += speed)
            await asyncio.sleep(1.0)
            
    except WebSocketDisconnect:
        print("WebSocket client disconnected.")
    except Exception as e:
        print(f"WebSocket streaming error: {e}")
    finally:
        cmd_task.cancel()
        try:
            await cmd_task
        except asyncio.CancelledError:
            pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
