import os
import json
import asyncio
import math
from typing import Dict, Any, Optional

class TelemetryStreamer:
    """
    Manages active telemetry sessions. Loads data from datasets
    and streams frames over WebSockets, with play/pause/speed controls.
    """
    def __init__(self, datasets_dir: str = None):
        if datasets_dir is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
            self.datasets_dir = os.path.join(base_dir, "datasets")
        else:
            self.datasets_dir = datasets_dir
        
        self.session_data: Dict[str, Any] = {}
        self.current_frame = 0
        self.is_playing = False
        self.speed_multiplier = 1
        self.selected_session = "silverstone_2020" # default
        self.live_sim_frame = None
        
        # Load default dataset
        self.load_session(self.selected_session)

    def load_session(self, session_key: str):
        """Loads a session JSON file from datasets folder"""
        if session_key == "live_sim":
            self.selected_session = "live_sim"
            self.current_frame = 0
            self.session_data = {
                "session": {
                    "race_name": "Apexion F1 Live Simulator",
                    "track": "Silverstone Circuit",
                    "total_laps": 52,
                    "weather": "Dry",
                    "ambient_temp": 22.0,
                    "track_temp": 38.5,
                    "winning_strategy": "Medium -> Hard",
                    "historical_context": "Real-time F1 simulator active."
                },
                "lap_history": [],
                "telemetry_replay": []
            }
            return

        filename = f"{session_key}_telemetry.json"
        filepath = os.path.join(self.datasets_dir, filename)
        
        if os.path.exists(filepath):
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    self.session_data = json.load(f)
                self.selected_session = session_key
                self.current_frame = 0
                print(f"Loaded session telemetry: {session_key}")
            except Exception as e:
                print(f"Error loading session file {filepath}: {e}")
                self._load_fallback_generator(session_key)
        else:
            print(f"Session file {filepath} not found, using fallback generator.")
            self._load_fallback_generator(session_key)

    def _load_fallback_generator(self, session_key: str):
        """Creates dummy session parameters if file is missing"""
        self.session_data = {
            "session": {
                "race_name": f"Live Simulated Grand Prix ({session_key.replace('_', ' ').title()})",
                "track": "Albert Park Circuit",
                "total_laps": 58,
                "weather": "Dry",
                "ambient_temp": 21.0,
                "track_temp": 32.0,
                "winning_strategy": "Medium -> Hard",
                "historical_context": "Simulated telemetry engine running in fallback mode."
            },
            "lap_history": [
                {"lap": 1, "driver": "SIM", "position": 3, "lap_time": 85.5, "s1": 27.2, "s2": 33.1, "s3": 25.2, "tyre": "Medium", "tyre_age": 1, "tyre_wear": 1.0, "fuel_left": 100.0, "drs_enabled": False}
            ],
            "telemetry_replay": [] # Will generate dynamically in get_next_frame
        }
        self.selected_session = session_key
        self.current_frame = 0

    def _generate_base_sim_frame(self) -> Dict[str, Any]:
        return {
            "time": 0, "lap": 1, "speed": 0, "throttle": 0, "brake": 0, "rpm": 3000, "gear": 1, "drs": False,
            "tyre_wear": [5.0, 5.0, 4.0, 4.0], "tyre_temp": [85.0, 85.0, 85.0, 85.0], "fuel": 100.0,
            "engine_temp": 90, "brake_temp": 120, "distance": 0,
            "session_info": {
                "race_name": "Apexion F1 Live Simulator",
                "track": "Silverstone Circuit",
                "weather": "Dry",
                "track_temp": 38.5,
            }
        }

    def get_next_frame(self) -> Dict[str, Any]:
        """
        Retrieves the current frame. If replay array is empty,
        generates realistic telemetry data mathematically.
        """
        if self.selected_session == "live_sim":
            if self.live_sim_frame:
                return self.live_sim_frame
            else:
                return self._generate_base_sim_frame()

        replay_list = self.session_data.get("telemetry_replay", [])
        
        if replay_list:
            # Loop the telemetry data if we exceed bounds
            idx = self.current_frame % len(replay_list)
            frame = dict(replay_list[idx])
            
            # Inject session metadata
            frame["session_info"] = self.session_data["session"]
            
            # Increment current_frame if playing
            if self.is_playing:
                self.current_frame += self.speed_multiplier
            
            return frame
        else:
            # Mathematical F1 telemetry generator (never fails!)
            t = self.current_frame
            lap = int(t / 20) + 1 # 20 seconds per simulated lap segment
            
            # Physics curves
            speed = int(220 + 80 * math.sin(t / 2.0) - 20 * math.cos(t / 5.0))
            rpm = int(10000 + 3000 * math.sin(t / 1.5))
            throttle = int(max(0, min(100, 50 + 50 * math.sin(t / 2.0))))
            brake = int(max(0, min(100, 50 * math.cos(t / 2.0) if math.sin(t / 2.0) < -0.5 else 0)))
            gear = int(max(1, min(8, 4 + 3 * math.sin(t / 4.0))))
            drs = speed > 280 and throttle > 95
            
            # Fuel and tyre wear degradation
            fuel = max(5.0, 95.0 - (t * 0.05))
            tyre_wear_fl = min(100.0, t * 0.04)
            tyre_wear_fr = min(100.0, t * 0.038)
            tyre_wear_rl = min(100.0, t * 0.032)
            tyre_wear_rr = min(100.0, t * 0.03)
            
            tyre_temp_fl = 95 + 15 * math.sin(t / 3.0) + (tyre_wear_fl * 0.2)
            tyre_temp_fr = 92 + 13 * math.sin(t / 3.0) + (tyre_wear_fr * 0.2)
            tyre_temp_rl = 88 + 10 * math.sin(t / 3.0) + (tyre_wear_rl * 0.15)
            tyre_temp_rr = 87 + 10 * math.sin(t / 3.0) + (tyre_wear_rr * 0.15)
            
            frame = {
                "time": t,
                "lap": lap,
                "speed": speed,
                "throttle": throttle,
                "brake": brake,
                "rpm": rpm,
                "gear": gear,
                "drs": drs,
                "tyre_wear": [round(tyre_wear_fl, 1), round(tyre_wear_fr, 1), round(tyre_wear_rl, 1), round(tyre_wear_rr, 1)],
                "tyre_temp": [round(tyre_temp_fl, 1), round(tyre_temp_fr, 1), round(tyre_temp_rl, 1), round(tyre_temp_rr, 1)],
                "fuel": round(fuel, 1),
                "engine_temp": int(98 + 4 * math.sin(t / 10.0)),
                "brake_temp": int(400 + 200 * (brake / 100.0) - 50 * math.cos(t / 5.0)),
                "distance": t * 70,
                "session_info": self.session_data["session"]
            }
            
            if self.is_playing:
                self.current_frame += self.speed_multiplier
                
            return frame

    def process_command(self, data: Dict[str, Any]):
        """Processes playback control websocket messages"""
        command = data.get("command")
        if command == "sim_telemetry":
            self.live_sim_frame = data.get("telemetry")
        elif command == "play":
            self.is_playing = True
            self.speed_multiplier = int(data.get("speed", 1))
        elif command == "pause":
            self.is_playing = False
        elif command == "reset":
            self.current_frame = 0
            self.is_playing = False
        elif command == "select_session":
            self.load_session(data.get("session_key", "silverstone_2020"))
            self.is_playing = False
            self.current_frame = 0
        elif command == "set_speed":
            self.speed_multiplier = int(data.get("speed", 1))
