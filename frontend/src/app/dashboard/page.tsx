"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Sliders, 
  CheckCircle2, 
  AlertTriangle, 
  Wifi, 
  WifiOff,
  Cpu,
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
import RacingSimulator from "../../components/RacingSimulator";
import TrackMap from "../../components/TrackMap";

export default function TelemetryDashboard() {
  // Telemetry stream state
  const [frame, setFrame] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [activeSession, setActiveSession] = useState("silverstone_2020");
  const [sessions, setSessions] = useState<any[]>([]);
  
  const showSimulator = activeSession === "live_sim";
  const wsRef = useRef<WebSocket | null>(null);

  // Load list of available sessions
  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    fetch(`${backendUrl}/api/sessions`)
      .then(res => res.json())
      .then(data => setSessions(data))
      .catch(err => {
        console.error("Error fetching sessions list", err);
        // Fallback static list
        setSessions([
          { key: "silverstone_2020", name: "British GP 2020 (Silverstone)" },
          { key: "monaco_2022", name: "Monaco GP 2022 (Monte Carlo)" }
        ]);
      });
  }, []);

  // Manage WebSocket connection
  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [activeSession]);

  const connectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const wsProtocol = backendUrl.startsWith("https") ? "wss" : "ws";
    const wsHost = backendUrl.replace(/^https?:\/\//, "");
    const wsUrl = `${wsProtocol}://${wsHost}/ws/telemetry`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      console.log("Connected to telemetry stream");
      // Initial session selection command
      ws.send(JSON.stringify({ command: "select_session", session_key: activeSession }));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "telemetry" || msg.type === "init") {
        const data = msg.data;
        
        // Skip updating history if live simulator is active to avoid double entry and dial lag
        if (activeSession === "live_sim") {
          return;
        }

        setFrame(data);
        
        // Append to history, keeping last 30 frames
        setHistory(prev => {
          const next = [...prev, data];
          if (next.length > 30) {
            next.shift();
          }
          return next;
        });
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log("Telemetry stream disconnected");
      // Auto-reconnect after 3 seconds if this socket is still active
      if (wsRef.current === ws) {
        setTimeout(() => {
          if (wsRef.current === ws) {
            connectWebSocket();
          }
        }, 3000);
      }
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
      setIsConnected(false);
    };
  };

  const togglePlayback = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    
    if (isPlaying) {
      wsRef.current.send(JSON.stringify({ command: "pause" }));
      setIsPlaying(false);
    } else {
      wsRef.current.send(JSON.stringify({ command: "play", speed: speed }));
      setIsPlaying(true);
    }
  };

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    if (isPlaying && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ command: "play", speed: newSpeed }));
    }
  };

  const resetReplay = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ command: "reset" }));
    setHistory([]);
    setIsPlaying(false);
  };

  const handleSessionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setActiveSession(e.target.value);
    setHistory([]);
    setIsPlaying(false);
  };

  const handleSimulatorTelemetry = useCallback((data: any) => {
    setFrame(data);
    setHistory(prev => {
      const next = [...prev, data];
      if (next.length > 30) {
        next.shift();
      }
      return next;
    });

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        command: "sim_telemetry",
        telemetry: data
      }));
    }
  }, []);

  // Helper to determine tire temp warning levels
  const getTempColorClass = (temp: number) => {
    if (temp < 85) return "text-f1-blue border-f1-blue/20 bg-f1-blue/5"; // Cold
    if (temp <= 118) return "text-f1-green border-f1-green/20 bg-f1-green/5"; // Optimal
    return "text-f1-red border-f1-red/30 bg-f1-red/10 animate-pulse"; // Overheating
  };

  const getWearColorClass = (wear: number) => {
    if (wear < 40) return "bg-f1-green";
    if (wear < 75) return "bg-f1-yellow";
    return "bg-f1-red animate-pulse";
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Control Panel Header */}
      <div className="f1-panel p-4 flex flex-col md:flex-row justify-between items-center gap-4 border-b border-f1-cardBorder">
        {/* Playback actions */}
        <div className="flex flex-wrap items-center gap-4">
          <button 
            onClick={togglePlayback}
            disabled={!isConnected}
            className={`
              flex items-center space-x-2 font-bold font-mono text-xs uppercase px-4 py-2.5 rounded transition-all
              ${isPlaying 
                ? "bg-f1-yellow hover:bg-[#e0b800] text-black" 
                : "bg-f1-red hover:bg-[#059669] text-white"
              }
              disabled:opacity-50
            `}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isPlaying ? "Pause Stream" : "Stream Telemetry"}</span>
          </button>
          
          <button 
            onClick={resetReplay}
            disabled={!isConnected}
            className="border border-f1-cardBorder hover:bg-f1-card/50 text-white font-mono text-xs uppercase px-3 py-2.5 rounded transition-all flex items-center space-x-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <button 
            onClick={() => {
              if (showSimulator) {
                // Close simulator, reset to default Silverstone session
                setActiveSession("silverstone_2020");
                setHistory([]);
                setIsPlaying(false);
              } else {
                // Launch simulator
                setActiveSession("live_sim");
                setHistory([]);
                setIsPlaying(false);
              }
            }}
            className={`
              flex items-center space-x-2 font-bold font-mono text-xs uppercase px-4 py-2.5 rounded transition-all border
              ${showSimulator 
                ? "bg-f1-blue hover:bg-blue-600 text-white border-f1-blue" 
                : "border-f1-blue/30 text-f1-blue hover:bg-f1-blue/5"
              }
            `}
          >
            <Cpu className="w-4 h-4" />
            <span>{showSimulator ? "Close Simulator" : "Launch Simulator"}</span>
          </button>

          <div className="flex items-center space-x-1 border border-f1-cardBorder rounded px-1.5 py-1 bg-black/40">
            {[1, 2, 5].map((multiplier) => (
              <button
                key={multiplier}
                onClick={() => handleSpeedChange(multiplier)}
                className={`
                  font-mono text-xs px-2 py-1 rounded transition-colors
                  ${speed === multiplier 
                    ? "bg-f1-red text-white font-bold" 
                    : "text-f1-textMuted hover:text-white"
                  }
                `}
              >
                {multiplier}x
              </button>
            ))}
          </div>
        </div>

        {/* Replay Selector & Status */}
        <div className="flex items-center space-x-4 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-f1-textMuted font-mono uppercase">Race Profile:</span>
            <select
              value={activeSession}
              onChange={handleSessionChange}
              className="bg-f1-card border border-f1-cardBorder rounded text-sm px-3 py-1.5 text-white font-mono"
            >
              {sessions.map(s => (
                <option key={s.key} value={s.key}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className={`flex items-center space-x-1.5 text-xs font-mono px-3 py-1.5 rounded border ${
            isConnected 
              ? "text-f1-green border-f1-green/20 bg-f1-green/5" 
              : "text-f1-red border-f1-red/20 bg-f1-red/5"
          }`}>
            {isConnected ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-f1-green animate-pulse" />
                <span>ONLINE</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-f1-red" />
                <button onClick={connectWebSocket} className="hover:underline font-bold">RECONNECT</button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Embedded Simulator Section */}
      {showSimulator && (
        <div className="f1-panel p-5 border border-f1-blue/20">
          <div className="flex items-center space-x-2 border-b border-f1-cardBorder pb-2 mb-4">
            <Cpu className="w-5 h-5 text-f1-blue" />
            <h3 className="text-xs font-bold uppercase font-mono">F1 CINEMATIC DRIVING SIMULATOR</h3>
          </div>
          <RacingSimulator 
            onTelemetryUpdate={handleSimulatorTelemetry} 
            activeSession={activeSession}
          />
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Info Panel: Timing Tower */}
        <div className="lg:col-span-1 flex flex-col space-y-6">
          <div className="f1-panel p-5 space-y-4">
            <h3 className="text-xs text-f1-textMuted uppercase font-mono tracking-wider border-b border-f1-cardBorder pb-2">
              TIMING & METADATA
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] text-f1-textMuted uppercase font-mono">Current Lap</div>
                <div className="text-3xl font-black font-mono f1-font-telemetry text-white">
                  {frame ? frame.lap : "--"}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-f1-textMuted uppercase font-mono">Fuel Load</div>
                <div className="text-2xl font-black font-mono f1-font-telemetry text-f1-blue">
                  {frame ? `${frame.fuel} kg` : "--"}
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <div className="text-[10px] text-f1-textMuted uppercase font-mono">Track Conditions</div>
              <div className="bg-black/30 border border-f1-cardBorder rounded p-3 space-y-1.5 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-f1-textMuted">T-TEMP:</span>
                  <span className="text-white">{frame?.session_info?.track_temp || "--"} °C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-f1-textMuted">WEATHER:</span>
                  <span className="text-white">{frame?.session_info?.weather || "--"}</span>
                </div>
              </div>
            </div>

            {/* Event notifications ticker */}
            <div className="space-y-2 pt-2">
              <div className="text-[10px] text-f1-textMuted uppercase font-mono">Pit-Wall Notes</div>
              {(() => {
                const eventText = frame?.event;
                if (!eventText) {
                  return (
                    <div className="alert-optimization border rounded p-3 min-h-[70px] text-xs font-mono flex items-start space-x-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>All telemetry values nominal. Stream active.</span>
                    </div>
                  );
                }

                const upper = eventText.toUpperCase();
                let styleClass = "alert-info";
                let icon = <Info className="w-4 h-4 shrink-0 mt-0.5" />;

                if (upper.includes("CRITICAL") || upper.includes("PUNCTURE") || upper.includes("DELAMINATION") || upper.includes("FAIL")) {
                  styleClass = "alert-critical";
                  icon = <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 animate-pulse" />;
                } else if (upper.includes("WARNING") || upper.includes("VIBRATION") || upper.includes("DROPPING") || upper.includes("ALERT")) {
                  styleClass = "alert-warning";
                  icon = <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />;
                } else if (upper.includes("WIN") || upper.includes("SUCCESS") || upper.includes("NOMINAL") || upper.includes("OPTIMIZATION")) {
                  styleClass = "alert-optimization";
                  icon = <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />;
                }

                return (
                  <div className={`${styleClass} border rounded p-3 min-h-[70px] text-xs font-mono flex items-start space-x-2`}>
                    {icon}
                    <span>{eventText}</span>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Quick Stats: Speed & Gears */}
          <div className="f1-panel p-5 flex flex-col space-y-4">
            <h3 className="text-xs text-f1-textMuted uppercase font-mono tracking-wider border-b border-f1-cardBorder pb-2">
              GEARBOX & ENGINE
            </h3>
            
            <div className="flex justify-around items-center">
              {/* Gear */}
              <div className="text-center">
                <div className="text-[10px] text-f1-textMuted uppercase font-mono">Gear</div>
                <div className="w-16 h-16 rounded-full border border-f1-red/30 flex items-center justify-center font-black font-mono f1-font-telemetry text-4xl text-f1-red bg-f1-red/5">
                  {frame ? frame.gear : "-"}
                </div>
              </div>
              {/* Speed & RPM */}
              <div className="space-y-2 text-right">
                <div>
                  <div className="text-[10px] text-f1-textMuted uppercase font-mono">Speed</div>
                  <div className="text-2xl font-black font-mono f1-font-telemetry text-white leading-none">
                    {frame ? frame.speed : "--"}{" "}
                    <span className="text-xs text-f1-textMuted font-mono font-normal">km/h</span>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-f1-textMuted uppercase font-mono">Engine RPM</div>
                  <div className="text-xl font-bold font-mono f1-font-telemetry text-f1-yellow leading-none">
                    {frame ? frame.rpm : "--"}{" "}
                    <span className="text-xs text-f1-textMuted font-mono font-normal">RPM</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Inputs slider meters */}
            <div className="space-y-3 pt-2 font-mono text-xs">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-f1-green">THROTTLE</span>
                  <span className="font-bold">{frame?.throttle || 0}%</span>
                </div>
                <div className="w-full bg-[#1b1b24] h-2 rounded overflow-hidden">
                  <div 
                    className="bg-f1-green h-full transition-all duration-100" 
                    style={{ width: `${frame?.throttle || 0}%` }}
                  />
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-f1-red">BRAKE</span>
                  <span className="font-bold">{frame?.brake || 0}%</span>
                </div>
                <div className="w-full bg-[#1b1b24] h-2 rounded overflow-hidden">
                  <div 
                    className="bg-f1-red h-full transition-all duration-100" 
                    style={{ width: `${frame?.brake || 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2D Live Track Position Map */}
          <TrackMap 
            distance={frame ? frame.distance || 0 : 0} 
            sessionKey={activeSession} 
          />
        </div>

        {/* Center Panel: Line Charts */}
        <div className="lg:col-span-2 flex flex-col space-y-6">
          <div className="f1-panel p-5 flex-1 flex flex-col justify-between">
            <div className="flex justify-between items-center border-b border-f1-cardBorder pb-2 mb-4">
              <h3 className="text-xs text-f1-textMuted uppercase font-mono tracking-wider">
                TELEMETRY TELEGRAM // HISTORICAL TRACE
              </h3>
              <span className="text-[10px] font-mono bg-f1-card px-2 py-0.5 border border-f1-cardBorder rounded text-f1-textMuted">
                30s SCAN WINDOW
              </span>
            </div>
            
            <div className="h-64 sm:h-72 w-full text-xs font-mono">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history} margin={{ left: -10, right: 10, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1d1d27" />
                  <XAxis dataKey="time" stroke="#5a5d68" />
                  <YAxis yAxisId="speed" domain={[0, 350]} stroke="#9dff00" />
                  <YAxis yAxisId="rpm" orientation="right" domain={[3000, 14000]} stroke="#ffd000" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#121218", borderColor: "#22222d", color: "#fff" }}
                    labelClassName="font-mono text-f1-textMuted"
                  />
                  <Line 
                    yAxisId="speed" 
                    type="monotone" 
                    dataKey="speed" 
                    stroke="#9dff00" 
                    name="Speed (km/h)" 
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Line 
                    yAxisId="rpm" 
                    type="monotone" 
                    dataKey="rpm" 
                    stroke="#ffd000" 
                    name="RPM" 
                    strokeWidth={1.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="f1-panel p-5">
            <h3 className="text-xs text-f1-textMuted uppercase font-mono tracking-wider border-b border-f1-cardBorder pb-2 mb-4">
              PEDAL INPUT CORRELATION
            </h3>
            <div className="h-40 w-full text-xs font-mono">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history} margin={{ left: -10, right: 10, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1d1d27" />
                  <XAxis dataKey="time" stroke="#5a5d68" />
                  <YAxis domain={[0, 100]} stroke="#5a5d68" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#121218", borderColor: "#22222d", color: "#fff" }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="throttle" 
                    stroke="#00ff66" 
                    name="Throttle %" 
                    strokeWidth={1.5} 
                    dot={false} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="brake" 
                    stroke="#9dff00" 
                    name="Brake %" 
                    strokeWidth={1.5} 
                    dot={false} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Panel: Tyre Temperature Heatmap & Wear */}
        <div className="lg:col-span-1 f1-panel p-5 space-y-6">
          <h3 className="text-xs text-f1-textMuted uppercase font-mono tracking-wider border-b border-f1-cardBorder pb-2">
            TYRE TEMPERATURE & WEAR
          </h3>

          <div className="grid grid-cols-2 gap-4">
            {/* Front Left */}
            <div className={`border rounded p-3 flex flex-col justify-between h-36 ${getTempColorClass(frame?.tyre_temp?.[0] || 90)}`}>
              <div className="flex justify-between items-start">
                <span className="font-mono text-xs font-bold text-white">F-LEFT</span>
                <span className="font-mono text-xs text-f1-textMuted">FL</span>
              </div>
              <div className="text-center font-bold text-2xl font-mono f1-font-telemetry text-white">
                {frame ? `${frame.tyre_temp[0]}°C` : "--"}
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-f1-textMuted">
                  <span>WEAR:</span>
                  <span className="text-white">{frame ? `${frame.tyre_wear[0]}%` : "--"}</span>
                </div>
                <div className="w-full bg-[#1b1b24]/50 h-1.5 rounded overflow-hidden">
                  <div 
                    className={`h-full ${getWearColorClass(frame?.tyre_wear?.[0] || 0)}`}
                    style={{ width: `${frame?.tyre_wear?.[0] || 0}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Front Right */}
            <div className={`border rounded p-3 flex flex-col justify-between h-36 ${getTempColorClass(frame?.tyre_temp?.[1] || 90)}`}>
              <div className="flex justify-between items-start">
                <span className="font-mono text-xs font-bold text-white">F-RIGHT</span>
                <span className="font-mono text-xs text-f1-textMuted">FR</span>
              </div>
              <div className="text-center font-bold text-2xl font-mono f1-font-telemetry text-white">
                {frame ? `${frame.tyre_temp[1]}°C` : "--"}
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-f1-textMuted">
                  <span>WEAR:</span>
                  <span className="text-white">{frame ? `${frame.tyre_wear[1]}%` : "--"}</span>
                </div>
                <div className="w-full bg-[#1b1b24]/50 h-1.5 rounded overflow-hidden">
                  <div 
                    className={`h-full ${getWearColorClass(frame?.tyre_wear?.[1] || 0)}`}
                    style={{ width: `${frame?.tyre_wear?.[1] || 0}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Rear Left */}
            <div className={`border rounded p-3 flex flex-col justify-between h-36 ${getTempColorClass(frame?.tyre_temp?.[2] || 90)}`}>
              <div className="flex justify-between items-start">
                <span className="font-mono text-xs font-bold text-white">R-LEFT</span>
                <span className="font-mono text-xs text-f1-textMuted">RL</span>
              </div>
              <div className="text-center font-bold text-2xl font-mono f1-font-telemetry text-white">
                {frame ? `${frame.tyre_temp[2]}°C` : "--"}
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-f1-textMuted">
                  <span>WEAR:</span>
                  <span className="text-white">{frame ? `${frame.tyre_wear[2]}%` : "--"}</span>
                </div>
                <div className="w-full bg-[#1b1b24]/50 h-1.5 rounded overflow-hidden">
                  <div 
                    className={`h-full ${getWearColorClass(frame?.tyre_wear?.[2] || 0)}`}
                    style={{ width: `${frame?.tyre_wear?.[2] || 0}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Rear Right */}
            <div className={`border rounded p-3 flex flex-col justify-between h-36 ${getTempColorClass(frame?.tyre_temp?.[3] || 90)}`}>
              <div className="flex justify-between items-start">
                <span className="font-mono text-xs font-bold text-white">R-RIGHT</span>
                <span className="font-mono text-xs text-f1-textMuted">RR</span>
              </div>
              <div className="text-center font-bold text-2xl font-mono f1-font-telemetry text-white">
                {frame ? `${frame.tyre_temp[3]}°C` : "--"}
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-f1-textMuted">
                  <span>WEAR:</span>
                  <span className="text-white">{frame ? `${frame.tyre_wear[3]}%` : "--"}</span>
                </div>
                <div className="w-full bg-[#1b1b24]/50 h-1.5 rounded overflow-hidden">
                  <div 
                    className={`h-full ${getWearColorClass(frame?.tyre_wear?.[3] || 0)}`}
                    style={{ width: `${frame?.tyre_wear?.[3] || 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Legend indicator */}
          <div className="bg-[#121218] border border-f1-cardBorder rounded p-3 text-xs font-mono space-y-2">
            <div className="text-[10px] text-f1-textMuted uppercase">Thermal Legends</div>
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded bg-f1-blue" />
                <span>Cold (&lt;85°C)</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded bg-f1-green" />
                <span>Optimal (90-115°C)</span>
              </span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded bg-f1-red" />
              <span>Overheating (&gt;118°C)</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
