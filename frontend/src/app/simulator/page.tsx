"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Play, 
  Plus, 
  Trash2, 
  Cpu, 
  AlertTriangle, 
  Info,
  TrendingUp,
  UserCheck
} from "lucide-react";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip,
  CartesianGrid,
  Legend
} from "recharts";

interface PitStop {
  lap: number;
  next_tyre: "Soft" | "Medium" | "Hard" | "Intermediate" | "Wet";
}

export default function StrategySimulator() {
  const [track, setTrack] = useState("Silverstone Circuit");
  const [startTyre, setStartTyre] = useState<"Soft" | "Medium" | "Hard" | "Intermediate" | "Wet">("Medium");
  const [pitStops, setPitStops] = useState<PitStop[]>([]);
  const [trackTemp, setTrackTemp] = useState(38.0);
  const [weather, setWeather] = useState<"Sunny" | "Overcast" | "Rain" | "Storm">("Sunny");
  
  // Input form state
  const [newPitLap, setNewPitLap] = useState<number>(20);
  const [newPitTyre, setNewPitTyre] = useState<PitStop["next_tyre"]>("Hard");

  // Simulation results
  const [simulationResults, setSimulationResults] = useState<any>(null);
  const [simulationId, setSimulationId] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isInitial, setIsInitial] = useState(true);

  useEffect(() => {
    setMounted(true);
    runSimulation();
  }, []);

  const trackLaps = track === "Circuit de Monaco" ? 64 : 52;

  const handleAddPitStop = () => {
    if (newPitLap <= 0 || newPitLap >= trackLaps) {
      alert(`Pit lap must be between 1 and ${trackLaps - 1}`);
      return;
    }
    
    // Check if duplicate lap
    if (pitStops.some(stop => stop.lap === newPitLap)) {
      alert("A pit stop is already planned for this lap.");
      return;
    }

    setPitStops(prev => [...prev, { lap: newPitLap, next_tyre: newPitTyre }].sort((a, b) => a.lap - b.lap));
  };

  const handleRemovePitStop = (index: number) => {
    setPitStops(prev => prev.filter((_, i) => i !== index));
  };

  const runSimulation = async () => {
    setLoading(true);
    setError("");
    const startTime = Date.now();

    const payload = {
      track_name: track,
      start_tyre: startTyre,
      pit_stops: pitStops,
      track_temp: trackTemp,
      weather: weather
    };

    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${backendUrl}/api/simulate?t=${Date.now()}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Failed to execute strategy simulation.");
      }

      const data = await response.json();

      // Artificial delay to ensure UI shows calculating state for a realistic experience
      const elapsed = Date.now() - startTime;
      const remainingDelay = Math.max(0, 800 - elapsed);
      if (remainingDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingDelay));
      }

      setSimulationResults(data);
      setIsDirty(false); // Reset dirty flag on successful simulation
      setSimulationId(prev => prev + 1);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unknown error occurred.");
    } finally {
      setLoading(false);
    }
  };

  // Mark configuration as dirty when inputs change (skip initial load)
  useEffect(() => {
    if (isInitial) {
      setIsInitial(false);
      return;
    }
    setIsDirty(true);
  }, [track, startTyre, pitStops, trackTemp, weather]);

  // Process data for charts
  const chartData = simulationResults?.laps.map((lap: any) => {
    // Dynamic baseline 1-stop strategy parameters (Medium -> Hard)
    const totalLaps = track === "Circuit de Monaco" ? 64 : 52;
    const pitLap = track === "Circuit de Monaco" ? 26 : 22;
    const baselineSpeedFactor = track === "Circuit de Monaco" ? 78.4 : 91.8;
    
    // Fuel weight burns off, lap times get faster
    const fuelEffect = (totalLaps - lap.lap) * 0.05;
    const pitLoss = lap.lap === pitLap ? (track === "Circuit de Monaco" ? 25.0 : 20.5) : 0.0;
    
    // Tyre wear degradation effect on baseline
    const baselineTyreAge = lap.lap <= pitLap ? lap.lap : (lap.lap - pitLap);
    const baselineTyreWearPerLap = lap.lap <= pitLap ? 2.6 : 1.5; // Medium -> Hard
    const baselineWear = Math.min(100, baselineTyreAge * baselineTyreWearPerLap);
    const baselineDegPenalty = baselineWear > 35.0 ? Math.pow(baselineWear - 35.0, 1.2) * 0.08 / 10.0 : 0.0;

    const baselineLapTime = baselineSpeedFactor + fuelEffect + pitLoss + baselineDegPenalty;

    return {
      lap: lap.lap,
      "Simulated Pace": lap.lap_time,
      "Baseline Pace": parseFloat(baselineLapTime.toFixed(2)),
      "Tire Wear %": lap.tyre_wear,
      "Baseline Wear %": parseFloat(baselineWear.toFixed(1)),
      "Tire Temp °C": lap.tyre_temp,
    };
  }) || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black font-mono f1-font-telemetry tracking-tight">
            STRATEGY TIME MACHINE
          </h1>
          <p className="text-sm text-f1-textMuted font-mono uppercase">
            Simulate tyre degradation patterns and calculate undercut deltas
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Input Configuration Deck */}
        <div className="lg:col-span-1 space-y-6">
          <div className="f1-panel p-5 space-y-5">
            <h3 className="text-xs text-f1-textMuted uppercase font-mono tracking-wider border-b border-f1-cardBorder pb-2">
              SESSION CONFIGURATION
            </h3>

            {/* Track Selector */}
            <div className="space-y-1.5">
              <label className="text-xs text-f1-textMuted font-mono uppercase">Race Track</label>
              <select
                value={track}
                onChange={(e) => {
                  setTrack(e.target.value);
                  setPitStops([]); // Reset pit stops as lap count changes
                }}
                className="w-full bg-[#121218] border border-f1-cardBorder rounded text-sm px-3 py-2 text-white font-mono"
              >
                <option value="Silverstone Circuit">British GP (Silverstone - 52 Laps)</option>
                <option value="Circuit de Monaco">Monaco GP (Monte Carlo - 64 Laps)</option>
              </select>
            </div>

            {/* Weather Selector */}
            <div className="space-y-1.5">
              <label className="text-xs text-f1-textMuted font-mono uppercase">Weather Conditions</label>
              <select
                value={weather}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setWeather(val);
                  // Automatically adjust track temperature based on weather for realism!
                  if (val === "Sunny") setTrackTemp(38.0);
                  else if (val === "Overcast") setTrackTemp(28.0);
                  else if (val === "Rain") setTrackTemp(22.0);
                  else if (val === "Storm") setTrackTemp(18.0);
                }}
                className="w-full bg-[#121218] border border-f1-cardBorder rounded text-sm px-3 py-2 text-white font-mono"
              >
                <option value="Sunny">Sunny (Dry - Hot Track)</option>
                <option value="Overcast">Overcast (Dry - Cool Track)</option>
                <option value="Rain">Rain (Damp/Wet Track)</option>
                <option value="Storm">Storm (Heavy Downpour - Track Flooded)</option>
              </select>
            </div>

            {/* Start Tyre Selector */}
            <div className="space-y-1.5">
              <label className="text-xs text-f1-textMuted font-mono uppercase">Starting Tyre Compound</label>
              <div className="grid grid-cols-5 gap-1.5">
                {(["Soft", "Medium", "Hard", "Intermediate", "Wet"] as const).map((compound) => (
                  <button
                    key={compound}
                    onClick={() => setStartTyre(compound)}
                    className={`
                      px-1.5 py-2 rounded text-[10px] font-mono border transition-all uppercase font-bold truncate
                      ${startTyre === compound 
                        ? compound === "Soft" ? "bg-f1-red text-white border-f1-red"
                        : compound === "Medium" ? "bg-f1-yellow text-black border-f1-yellow"
                        : compound === "Hard" ? "bg-white text-black border-white"
                        : compound === "Intermediate" ? "bg-f1-green text-black border-f1-green"
                        : "bg-f1-blue text-white border-f1-blue"
                        : "bg-f1-card text-f1-textMuted border-f1-cardBorder hover:text-white"
                      }
                    `}
                    title={compound}
                  >
                    {compound === "Intermediate" ? "Inter" : compound}
                  </button>
                ))}
              </div>
            </div>

            {/* Track Temperature Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-f1-textMuted uppercase">Track Temperature</span>
                <span className="text-white font-bold">{trackTemp} °C</span>
              </div>
              <input
                type="range"
                min="15"
                max="55"
                step="0.5"
                value={trackTemp}
                onChange={(e) => setTrackTemp(parseFloat(e.target.value))}
                className="w-full accent-f1-red"
              />
              <div className="flex justify-between text-[10px] text-f1-textMuted font-mono">
                <span>15°C (Cool)</span>
                <span>55°C (Thermal Deg)</span>
              </div>
            </div>
          </div>

          {/* Pit Stop Planner Deck */}
          <div className="f1-panel p-5 space-y-5">
            <h3 className="text-xs text-f1-textMuted uppercase font-mono tracking-wider border-b border-f1-cardBorder pb-2">
              PIT STOP PLANNER
            </h3>

            {/* Add Pit Stop Form */}
            <div className="grid grid-cols-2 gap-3 items-end">
              <div className="space-y-1.5">
                <label className="text-[10px] text-f1-textMuted font-mono uppercase">Pit Lap</label>
                <input
                  type="number"
                  min="1"
                  max={trackLaps - 1}
                  value={newPitLap}
                  onChange={(e) => setNewPitLap(parseInt(e.target.value) || 1)}
                  className="w-full bg-[#121218] border border-f1-cardBorder rounded text-sm px-3 py-2 text-white font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-f1-textMuted font-mono uppercase">Compound</label>
                <select
                  value={newPitTyre}
                  onChange={(e) => setNewPitTyre(e.target.value as any)}
                  className="w-full bg-[#121218] border border-f1-cardBorder rounded text-sm px-3 py-2 text-white font-mono"
                >
                  <option value="Soft">Soft</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Wet">Wet</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleAddPitStop}
              className="w-full bg-f1-card border border-f1-cardBorder hover:border-f1-red/50 hover:bg-f1-red/5 text-white font-bold font-mono text-xs uppercase py-2.5 rounded transition-all flex items-center justify-center space-x-1.5"
            >
              <Plus className="w-4 h-4 text-f1-red" />
              <span>Add Planned Pitstop</span>
            </button>

            {/* Active Stints List */}
            <div className="space-y-2">
              <div className="text-[10px] text-f1-textMuted font-mono uppercase">Stint Breakdown</div>
              {pitStops.length === 0 ? (
                <div className="border border-dashed border-f1-cardBorder rounded p-4 text-center text-xs text-f1-textMuted font-mono">
                  No pit stops scheduled (0-Stop Strategy)
                </div>
              ) : (
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  <AnimatePresence initial={false}>
                    {pitStops.map((stop, idx) => (
                      <motion.div 
                        key={`${stop.lap}-${stop.next_tyre}-${idx}`}
                        initial={{ opacity: 0, height: 0, y: -10 }}
                        animate={{ opacity: 1, height: "auto", y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -10 }}
                        transition={{ type: "spring", stiffness: 350, damping: 25 }}
                        className="bg-black/30 border border-f1-cardBorder rounded p-2.5 flex items-center justify-between text-xs font-mono overflow-hidden"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-f1-textMuted">LAP {stop.lap}:</span>
                          <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${
                            stop.next_tyre === "Soft" ? "bg-f1-red/10 text-f1-red"
                            : stop.next_tyre === "Medium" ? "bg-f1-yellow/10 text-f1-yellow"
                            : stop.next_tyre === "Hard" ? "bg-white/10 text-white"
                            : stop.next_tyre === "Intermediate" ? "bg-f1-green/10 text-f1-green"
                            : "bg-f1-blue/10 text-f1-blue"
                          }`}>
                            {stop.next_tyre}
                          </span>
                        </div>
                        <button 
                          onClick={() => handleRemovePitStop(idx)} 
                          className="text-f1-textMuted hover:text-f1-red transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            <button
              onClick={runSimulation}
              disabled={loading}
              className={`
                w-full text-white font-bold font-mono text-xs uppercase py-3 rounded transition-all flex items-center justify-center space-x-2
                ${isDirty 
                  ? "bg-f1-red hover:bg-[#059669] animate-pulse shadow-lg shadow-f1-red/30 border border-f1-red" 
                  : "bg-f1-card border border-f1-cardBorder hover:border-f1-red/50 hover:bg-f1-red/5 text-f1-textMuted hover:text-white"
                }
              `}
            >
              <Cpu className="w-4 h-4" />
              <span>{loading ? "Calculating..." : "Run Physics Simulation"}</span>
            </button>
          </div>
        </div>

        {/* Right Output Dashboard */}
        <div className="lg:col-span-2 space-y-6">
          {error && (
            <div className="alert-critical border rounded p-4 text-xs font-mono flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isDirty && simulationResults && (
            <div className="alert-warning border rounded p-3.5 text-xs font-mono flex items-center space-x-2 animate-pulse-fast">
              <Info className="w-4 h-4 shrink-0 font-bold" />
              <span>Inputs modified. Click <strong className="text-white uppercase font-bold">Run Physics Simulation</strong> to update the charts and AI insights.</span>
            </div>
          )}

          {simulationResults ? (
            <div className="space-y-6 transition-all duration-300">
              
              {/* Core metrics stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="f1-panel p-4 text-center">
                  <div className="text-[10px] text-f1-textMuted uppercase font-mono">Total Race Time</div>
                  <div className="text-xl font-bold font-mono f1-font-telemetry text-white mt-1">
                    {Math.floor(simulationResults.total_time / 60)}m{" "}
                    {(simulationResults.total_time % 60).toFixed(2)}s
                  </div>
                </div>
                
                <div className="f1-panel p-4 text-center">
                  <div className="text-[10px] text-f1-textMuted uppercase font-mono">Vs Baseline 1-Stop</div>
                  <div className={`text-xl font-bold font-mono f1-font-telemetry mt-1 ${
                    simulationResults.time_delta_vs_actual <= 0 ? "text-f1-green" : "text-f1-red"
                  }`}>
                    {simulationResults.time_delta_vs_actual <= 0 ? "" : "+"}
                    {simulationResults.time_delta_vs_actual.toFixed(2)}s
                  </div>
                </div>

                <div className="f1-panel p-4 text-center">
                  <div className="text-[10px] text-f1-textMuted uppercase font-mono">Projected Position</div>
                  <div className={`text-xl font-bold font-mono f1-font-telemetry mt-1 ${
                    simulationResults.projected_position_change >= 0 ? "text-f1-green" : "text-f1-red"
                  }`}>
                    {simulationResults.projected_position_change >= 0 ? "+" : ""}
                    {simulationResults.projected_position_change} positions
                  </div>
                </div>
              </div>

              {/* Chart telemetry progression */}
              <div className="f1-panel p-5 relative overflow-hidden">
                {loading && (
                  <div className="absolute inset-0 bg-[#08080a]/75 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center space-y-2 pointer-events-none">
                    <Cpu className="w-8 h-8 text-f1-red animate-spin" />
                    <span className="text-[10px] text-f1-red uppercase font-mono tracking-widest animate-pulse font-bold">Running Physics Sweep...</span>
                  </div>
                )}
                <h4 className="text-xs text-f1-textMuted uppercase font-mono tracking-wider border-b border-f1-cardBorder pb-2 mb-4">
                  LAP-BY-LAP SIMULATION PACE
                </h4>
                <div className="h-64 w-full text-xs font-mono">
                  {mounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart key={`pace-chart-${track}-${simulationId}`} data={chartData} margin={{ left: -10, right: 10, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1d1d27" />
                      <XAxis dataKey="lap" stroke="#5a5d68" />
                      <YAxis domain={['auto', 'auto']} stroke="#5a5d68" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#121218", borderColor: "#22222d", color: "#fff" }}
                        labelClassName="text-f1-textMuted font-mono"
                      />
                      <Legend wrapperStyle={{ paddingTop: 10, fontSize: 10 }} />
                      <Line 
                        type="monotone" 
                        dataKey="Simulated Pace" 
                        stroke="#9dff00" 
                        name="Simulated Pace (s)"
                        strokeWidth={2.5}
                        dot={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="Baseline Pace" 
                        stroke="#5a5d68" 
                        name="Baseline 1-Stop Pace (s)"
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
                </div>
              </div>

              {/* Tyre Wear progression curve */}
              <div className="f1-panel p-5 relative overflow-hidden">
                {loading && (
                  <div className="absolute inset-0 bg-[#08080a]/75 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center space-y-2 pointer-events-none">
                    <Cpu className="w-8 h-8 text-f1-yellow animate-spin" />
                    <span className="text-[10px] text-f1-yellow uppercase font-mono tracking-widest animate-pulse font-bold">Modeling Tyre Degradation...</span>
                  </div>
                )}
                <h4 className="text-xs text-f1-textMuted uppercase font-mono tracking-wider border-b border-f1-cardBorder pb-2 mb-4">
                  TYRE DEGRADATION AND WEAR OVER LAPCOUNT
                </h4>
                <div className="h-44 w-full text-xs font-mono">
                  {mounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart key={`wear-chart-${track}-${simulationId}`} data={chartData} margin={{ left: -10, right: 10, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1d1d27" />
                      <XAxis dataKey="lap" stroke="#5a5d68" />
                      <YAxis domain={[0, 100]} stroke="#5a5d68" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#121218", borderColor: "#22222d", color: "#fff" }}
                        labelClassName="text-f1-textMuted font-mono"
                      />
                      <Legend wrapperStyle={{ paddingTop: 10, fontSize: 10 }} />
                      <Line 
                        type="monotone" 
                        dataKey="Tire Wear %" 
                        stroke="#ffd000" 
                        name="Simulated Stint Wear (%)"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="Baseline Wear %" 
                        stroke="#5a5d68" 
                        name="Baseline 1-Stop Wear (%)"
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                        dot={false}
                      />
                      {/* Safety threshold line */}
                      <Line
                        type="monotone"
                        dataKey={() => 85}
                        stroke="#9dff00"
                        strokeDasharray="5 5"
                        strokeWidth={1}
                        name="Structural Wear Safety Limit (85%)"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
                </div>
              </div>

              {/* Explainable AI insights cards */}
              <div className="f1-panel p-5 space-y-4 relative overflow-hidden">
                {loading && (
                  <div className="absolute inset-0 bg-[#08080a]/75 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center space-y-2 pointer-events-none">
                    <TrendingUp className="w-8 h-8 text-f1-green animate-bounce" />
                    <span className="text-[10px] text-f1-green uppercase font-mono tracking-widest animate-pulse font-bold">Evaluating Strategy Insights...</span>
                  </div>
                )}
                <div className="flex items-center space-x-2 border-b border-f1-cardBorder pb-2">
                  <Cpu className="w-5 h-5 text-f1-yellow" />
                  <h4 className="text-xs font-bold uppercase font-mono">EXPLAINABLE AI RACE INSIGHTS</h4>
                </div>
                
                {simulationResults.ai_insights.length === 0 ? (
                  <p className="text-xs text-f1-textMuted font-mono">
                    No critical warnings or performance anomalies detected for this stint structure.
                  </p>
                ) : (
                  <div className="space-y-3 font-mono text-xs">
                    {simulationResults.ai_insights.map((insight: string, idx: number) => {
                      const upper = insight.toUpperCase();
                      let styleClass = "alert-info";
                      let icon = <Info className="w-4 h-4 shrink-0 mt-0.5" />;

                      if (upper.startsWith("CRITICAL")) {
                        styleClass = "alert-critical";
                        icon = <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />;
                      } else if (upper.startsWith("WARNING")) {
                        styleClass = "alert-warning";
                        icon = <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />;
                      } else if (upper.startsWith("OPTIMIZATION")) {
                        styleClass = "alert-optimization";
                        icon = <TrendingUp className="w-4 h-4 shrink-0 mt-0.5" />;
                      }

                      return (
                        <div 
                          key={idx} 
                          className={`p-3 rounded border flex items-start space-x-2 ${styleClass}`}
                        >
                          {icon}
                          <span>{insight}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Physics Engine Assumptions */}
                <div className="space-y-2 pt-2 border-t border-f1-cardBorder">
                  <div className="text-[10px] text-f1-textMuted uppercase font-mono flex items-center space-x-1">
                    <Info className="w-3.5 h-3.5" />
                    <span>SIMULATOR HYPOTHESES</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] font-mono text-f1-textMuted bg-black/25 rounded p-2">
                    {simulationResults.assumptions.map((ass: string, idx: number) => (
                      <div key={idx} className="flex items-center space-x-1.5">
                        <UserCheck className="w-3 h-3 text-f1-blue" />
                        <span>{ass}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : loading ? (
            <div className="border border-dashed border-f1-cardBorder rounded-lg h-96 flex flex-col items-center justify-center text-center p-6 bg-f1-card/30">
              <Cpu className="w-12 h-12 text-f1-red mb-4 animate-spin" />
              <h4 className="text-sm font-bold font-mono uppercase text-white mb-1">
                Calculating Race Physics...
              </h4>
            </div>
          ) : (
            <div className="border border-dashed border-f1-cardBorder rounded-lg h-96 flex flex-col items-center justify-center text-center p-6 bg-f1-card/30">
              <Cpu className="w-12 h-12 text-f1-textMuted mb-4 animate-spin-slow" />
              <h4 className="text-sm font-bold font-mono uppercase text-white mb-1">
                Awaiting Simulation Inputs
              </h4>
              <p className="text-xs text-f1-textMuted max-w-sm">
                Select your track, tires, and scheduled pit stops on the left deck, then click "Run Physics Simulation" to see projected time deltas.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
