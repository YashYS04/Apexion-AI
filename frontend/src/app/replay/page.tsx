"use client";

import { useState, useEffect, useRef } from "react";
import { getBackendUrl } from "../../components/config";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  History, 
  TrendingUp, 
  AlertTriangle, 
  ChevronRight,
  ShieldAlert,
  Info
} from "lucide-react";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip,
  CartesianGrid
} from "recharts";

export default function RaceReplay() {
  const [selectedRace, setSelectedRace] = useState("silverstone_2020");
  const [raceDetails, setRaceDetails] = useState<any>(null);
  
  // Replay live status
  const [frame, setFrame] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [isConnected, setIsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);

  const races = [
    {
      key: "silverstone_2020",
      name: "British GP 2020 (Silverstone)",
      track: "Silverstone Circuit",
      laps: 52,
      weather: "Dry and Sunny",
      desc: "Lewis Hamilton leads the race comfortably until a series of sudden tyre punctures strike the leaders on the final laps. Limp across the line on 3 tyres to win.",
      events: [
        { lap: 13, text: "Safety Car Pitstop for Hard tyres" },
        { lap: 49, text: "Warning: High vibration front-left sensor" },
        { lap: 50, text: "Bottas Front-Left tyre punctures behind!" },
        { lap: 52, text: "Hamilton Front-Left tyre punctures; Verstappen chasing down" }
      ]
    },
    {
      key: "monaco_2022",
      name: "Monaco GP 2022 (Monte Carlo)",
      track: "Circuit de Monaco",
      laps: 64,
      weather: "Rain drying to Sunny",
      desc: "Heavy rain delaying start. Charles Leclerc leads from pole, but strategic delays by Ferrari double-stacking Leclerc behind Sainz allow Red Bull's Sergio Perez to take the lead.",
      events: [
        { lap: 16, text: "Perez pits for Intermediate tyres (Slick-wet transition)" },
        { lap: 20, text: "Leclerc pits for Intermediate tyres (Too late)" },
        { lap: 22, text: "Ferrari double-stacks Leclerc and Sainz for Hard slicks; Leclerc loses lead" }
      ]
    }
  ];

  const activeRace = races.find(r => r.key === selectedRace) || races[0];

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [selectedRace]);

  const connectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    setHistory([]);
    setFrame(null);
    setIsPlaying(false);

    const backendUrl = getBackendUrl();
    const wsProtocol = backendUrl.startsWith("https") ? "wss" : "ws";
    const wsHost = backendUrl.replace(/^https?:\/\//, "");
    const wsUrl = `${wsProtocol}://${wsHost}/ws/telemetry`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      ws.send(JSON.stringify({ command: "select_session", session_key: selectedRace }));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "telemetry" || msg.type === "init") {
        setFrame(msg.data);
        setHistory(prev => {
          const next = [...prev, msg.data];
          if (next.length > 25) {
            next.shift();
          }
          return next;
        });
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      // Auto-reconnect after 3 seconds if this socket is still active
      if (wsRef.current === ws) {
        setTimeout(() => {
          if (wsRef.current === ws) {
            connectWebSocket();
          }
        }, 3000);
      }
    };
    ws.onerror = () => setIsConnected(false);
  };

  const handlePlayToggle = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    
    if (isPlaying) {
      wsRef.current.send(JSON.stringify({ command: "pause" }));
      setIsPlaying(false);
    } else {
      wsRef.current.send(JSON.stringify({ command: "play", speed: speed }));
      setIsPlaying(true);
    }
  };

  const handleReset = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ command: "reset" }));
    setHistory([]);
    setFrame(null);
    setIsPlaying(false);
  };

  const handleSpeedMultiplier = (m: number) => {
    setSpeed(m);
    if (isPlaying && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ command: "play", speed: m }));
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black font-mono f1-font-telemetry tracking-tight">
          HISTORICAL RACE REPLAY CONTROL
        </h1>
        <p className="text-sm text-f1-textMuted font-mono uppercase">
          Review critical strategic decisions and analyze second-by-second telemetry data
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left selector and details */}
        <div className="lg:col-span-1 space-y-6">
          <div className="f1-panel p-5 space-y-4">
            <h3 className="text-xs text-f1-textMuted uppercase font-mono tracking-wider border-b border-f1-cardBorder pb-2">
              SELECT HISTORY FEED
            </h3>
            
            <div className="space-y-3">
              {races.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setSelectedRace(r.key)}
                  className={`
                    w-full text-left p-3.5 rounded border transition-all flex justify-between items-center
                    ${selectedRace === r.key
                      ? "bg-f1-red/10 border-f1-red/50 text-white" 
                      : "bg-[#121218] border-f1-cardBorder text-f1-textMuted hover:text-white hover:border-f1-cardBorder/80"
                    }
                  `}
                >
                  <div className="space-y-1">
                    <div className="font-bold text-xs uppercase font-mono">{r.name}</div>
                    <div className="text-[10px] font-mono text-f1-textMuted">{r.track} // {r.laps} Laps</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-f1-red" />
                </button>
              ))}
            </div>
          </div>

          {/* Race details */}
          <div className="f1-panel p-5 space-y-4">
            <h3 className="text-xs text-f1-textMuted uppercase font-mono tracking-wider border-b border-f1-cardBorder pb-2">
              SESSION INTELLIGENCE
            </h3>
            
            <div className="space-y-3 font-mono text-xs">
              <div className="bg-black/35 rounded p-3 text-f1-textMuted leading-relaxed">
                {activeRace.desc}
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-f1-textMuted uppercase">Historical Event Timeline</span>
                <div className="border border-f1-cardBorder rounded divide-y divide-f1-cardBorder">
                  {activeRace.events.map((e, idx) => {
                    const upper = e.text.toUpperCase();
                    let badgeColor = "text-[#7FFFD4]"; // Default mint info color
                    if (upper.includes("WARNING") || upper.includes("VIBRATION")) {
                      badgeColor = "text-[#D4AF37]"; // Soft Gold
                    } else if (upper.includes("PUNCTURE") || upper.includes("DELAMINATION") || upper.includes("CRITICAL")) {
                      badgeColor = "text-red-500"; // Warning Red
                    } else if (upper.includes("WIN") || upper.includes("SUCCESS") || upper.includes("NOMINAL")) {
                      badgeColor = "text-[#00C389]"; // Emerald Green
                    }
                    return (
                      <div key={idx} className="p-2 flex items-start space-x-2 text-[10px] hover:bg-black/25">
                        <span className={`${badgeColor} font-bold shrink-0`}>LAP {e.lap}:</span>
                        <span className="text-white">{e.text}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right timeline and live charts */}
        <div className="lg:col-span-2 space-y-6">
          <div className="f1-panel p-5 space-y-5">
            {/* Playback bar */}
            <div className="flex flex-wrap justify-between items-center gap-4 border-b border-f1-cardBorder pb-4">
              <div className="flex items-center space-x-4">
                <button
                  onClick={handlePlayToggle}
                  className="bg-f1-red hover:bg-[#059669] text-white p-3 rounded-full transition-colors"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
                <button
                  onClick={handleReset}
                  className="border border-f1-cardBorder hover:bg-f1-card/50 text-white p-3 rounded-full transition-all"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
                
                <div className="flex items-center space-x-1 border border-f1-cardBorder rounded p-1 bg-black/40 font-mono text-xs">
                  {[1, 2, 5].map((m) => (
                    <button
                      key={m}
                      onClick={() => handleSpeedMultiplier(m)}
                      className={`px-2.5 py-1 rounded transition-colors ${
                        speed === m ? "bg-f1-red text-white" : "text-f1-textMuted hover:text-white"
                      }`}
                    >
                      {m}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center space-x-1.5 font-mono text-xs text-f1-textMuted">
                <History className="w-4 h-4 text-f1-red shrink-0" />
                <span className="uppercase">{isConnected ? "Feed Sync Active" : "Telemetry Connection Disconnected"}</span>
              </div>
            </div>

            {/* Replay Display */}
            <AnimatePresence mode="wait">
              {frame ? (
                <motion.div 
                  key="online-replay"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6"
                >
                  
                  {/* Dashboard layout snippet */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-black/35 rounded border border-f1-cardBorder p-3 font-mono text-center">
                      <div className="text-[10px] text-f1-textMuted uppercase font-mono">Current Lap</div>
                      <div className="text-xl font-bold f1-font-telemetry text-white mt-0.5">{frame.lap}</div>
                    </div>
                    <div className="bg-black/35 rounded border border-f1-cardBorder p-3 font-mono text-center">
                      <div className="text-[10px] text-f1-textMuted uppercase font-mono">Telemetry Speed</div>
                      <div className="text-xl font-bold f1-font-telemetry text-f1-red mt-0.5">{frame.speed} km/h</div>
                    </div>
                    <div className="bg-black/35 rounded border border-f1-cardBorder p-3 font-mono text-center">
                      <div className="text-[10px] text-f1-textMuted uppercase font-mono">Gear</div>
                      <div className="text-xl font-bold f1-font-telemetry text-f1-yellow mt-0.5">{frame.gear}</div>
                    </div>
                    <div className="bg-black/35 rounded border border-f1-cardBorder p-3 font-mono text-center">
                      <div className="text-[10px] text-f1-textMuted uppercase font-mono">Front-Left Wear</div>
                      <div className={`text-xl font-bold f1-font-telemetry mt-0.5 ${
                        frame.tyre_wear[0] > 85 ? "text-f1-red animate-pulse" : "text-f1-green"
                      }`}>
                        {frame.tyre_wear[0]}%
                      </div>
                    </div>
                  </div>

                  {/* Event warning box if any */}
                  {frame.event && (() => {
                    const eventText = frame.event;
                    const upper = eventText.toUpperCase();
                    let styleClass = "alert-info";
                    let icon = <Info className="w-4 h-4 shrink-0 mt-0.5" />;

                    if (upper.includes("CRITICAL") || upper.includes("PUNCTURE") || upper.includes("DELAMINATION") || upper.includes("FAIL")) {
                      styleClass = "alert-critical";
                      icon = <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 animate-pulse" />;
                    } else if (upper.includes("WARNING") || upper.includes("VIBRATION") || upper.includes("DROPPING") || upper.includes("ALERT")) {
                      styleClass = "alert-warning";
                      icon = <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />;
                    } else if (upper.includes("WIN") || upper.includes("SUCCESS") || upper.includes("NOMINAL") || upper.includes("OPTIMIZATION")) {
                      styleClass = "alert-optimization";
                      icon = <TrendingUp className="w-4 h-4 shrink-0 mt-0.5" />;
                    }

                    return (
                      <div className={`${styleClass} border rounded p-3 flex items-start space-x-2 text-xs font-mono`}>
                        {icon}
                        <span>{eventText}</span>
                      </div>
                    );
                  })()}

                  {/* mini chart */}
                  <div className="space-y-2">
                    <div className="text-[10px] text-f1-textMuted font-mono uppercase tracking-wider">
                      Velocity profile overlay
                    </div>
                    <div className="h-64 w-full text-xs font-mono">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={history} margin={{ left: -10, right: 10, top: 5, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1d1d27" />
                          <XAxis dataKey="time" stroke="#5a5d68" />
                          <YAxis domain={[0, 340]} stroke="#5a5d68" />
                          <Tooltip contentStyle={{ backgroundColor: "#121218", borderColor: "#22222d", color: "#fff" }} />
                          <Line type="monotone" dataKey="speed" stroke="#9dff00" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                </motion.div>
              ) : (
                <motion.div 
                  key="offline-replay"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25 }}
                  className="border border-dashed border-f1-cardBorder rounded-lg h-[360px] flex flex-col items-center justify-center text-center p-6 bg-f1-card/30"
                >
                  <History className="w-12 h-12 text-f1-textMuted mb-4 animate-pulse" />
                  <h4 className="text-sm font-bold font-mono uppercase text-white mb-1">
                    Replay Feed Offline
                  </h4>
                  <p className="text-xs text-f1-textMuted max-w-sm">
                    Click the red Play button above to connect the historical telemetry feed and begin streaming replay values.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </div>
  );
}
