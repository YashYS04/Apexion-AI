"use client";
import { useEffect, useRef, useState, memo } from "react";
import { Play, RotateCcw, Shield, ShieldAlert, Cpu, User } from "lucide-react";

interface RacingSimulatorProps {
  onTelemetryUpdate: (telemetry: any) => void;
  activeSession: string;
}

interface RoadSegment {
  index: number;
  p1: { x: number; y: number; z: number; screen: { x: number; y: number; w: number } };
  p2: { x: number; y: number; z: number; screen: { x: number; y: number; w: number } };
  curve: number;
  color: { road: string; grass: string; curb: string };
  scenery: number; // 0 = none, 1 = tree, 2 = warning sign, 3 = billboard
  scenerySide: number; // -1 = left, 1 = right
  tunnel?: boolean;
}

// Normalized 2D track layouts (width and height between 0 and 1)
const silverstonePath = [
  { x: 0.15, y: 0.8 },
  { x: 0.1, y: 0.4 },
  { x: 0.3, y: 0.15 },
  { x: 0.5, y: 0.1 },
  { x: 0.65, y: 0.2 },
  { x: 0.85, y: 0.35 },
  { x: 0.9, y: 0.55 },
  { x: 0.75, y: 0.75 },
  { x: 0.55, y: 0.7 },
  { x: 0.45, y: 0.85 },
  { x: 0.3, y: 0.9 },
  { x: 0.2, y: 0.8 },
];

const monacoPath = [
  { x: 0.1, y: 0.7 },
  { x: 0.15, y: 0.55 },
  { x: 0.28, y: 0.35 },
  { x: 0.5, y: 0.38 },
  { x: 0.62, y: 0.25 },
  { x: 0.75, y: 0.28 },
  { x: 0.85, y: 0.4 },
  { x: 0.76, y: 0.52 },
  { x: 0.82, y: 0.62 },
  { x: 0.9, y: 0.72 },
  { x: 0.82, y: 0.85 },
  { x: 0.65, y: 0.8 },
  { x: 0.52, y: 0.68 },
  { x: 0.35, y: 0.72 },
  { x: 0.2, y: 0.82 },
];

// F1 Track 3D Recipes: [segmentCount, curveSeverity, hillSeverity]
const silverstoneRecipe: [number, number, number][] = [
  [120, 0, 0],       // Hamilton Straight (flat, straight)
  [40, 1.5, 2],      // Abbey (fast right, slight uphill)
  [40, -1.5, 1],     // Farm (fast left)
  [30, 0, 0],        // Straight to Loop
  [50, 4.0, -1],     // The Loop (slow tight left, slight downhill)
  [40, -2.0, 0],     // Aintree (left turn accelerating)
  [100, 0, 0],       // Wellington Straight (flat straight)
  [50, -3.0, 0],     // Brooklands (sweeping left)
  [60, 3.5, 0],      // Luffield (long looping right)
  [30, 0.5, 1],      // Woodcote (gradual right)
  [80, 0, 0],        // National Pit Straight
  [50, 2.5, 0],      // Copse (very fast right)
  [40, 0, 0],        // Straight to Maggots
  [30, -3.0, -2],    // Maggots (fast left, downhill)
  [35, 4.0, 0],      // Becketts 1 (fast right)
  [35, -4.5, 1],     // Becketts 2 (left)
  [30, 3.5, 2],      // Chapel (right leading to straight)
  [120, 0, 0],       // Hangar Straight (long straight)
  [65, 2.5, 0],      // Stowe Corner (fast sweeping right)
  [40, 0, -2],       // Vale Straight (downhill straight)
  [30, -5.0, 0],     // Vale Chicane (tight left)
  [50, 3.0, 1],      // Club Corner (sweeping right, uphill)
  [40, 0, 0],        // Entrance to home straight
];

const monacoRecipe: [number, number, number][] = [
  [80, 0, 0],        // Pit Straight
  [40, 4.5, 4],      // Sainte Devote (sharp right, uphill)
  [80, -0.8, 6],     // Beau Rivage (long uphill sweep left)
  [60, -2.5, 2],     // Massenet (sweeping left at the crest)
  [50, 2.0, -4],     // Casino Square (right turn, starting downhill)
  [40, -1.0, -8],    // Mirabeau Descent (downhill slope)
  [40, 5.0, -5],     // Mirabeau Haute (sharp right, steep downhill)
  [40, -9.0, -4],    // Grand Hotel Hairpin (extremely tight 180 left, downhill)
  [30, 3.5, -2],     // Mirabeau Bas (downhill right)
  [40, 4.5, 0],      // Portier (sharp right leading to tunnel)
  [140, 0.8, 1],     // Tunnel (long sweeping right, dark cover!)
  [30, 0, 0],        // Chicane entry
  [25, -6.0, 0],     // Nouvelle Chicane Left
  [25, 6.0, 0],      // Nouvelle Chicane Right
  [40, 0, 1],        // Tabac straight
  [40, -3.0, 0],     // Tabac (left turn)
  [30, 2.5, 0],      // Piscine (Swimming Pool entry)
  [20, -5.0, 0],     // Chicane left
  [20, 5.0, 0],      // Chicane right
  [30, 0, 0],        // Straight to Rascasse
  [45, 6.5, 0],      // Rascasse (tight right)
  [30, 4.0, 0],      // Anthony Noghes (right turn)
  [30, 0, 0],        // Exit to Pit Straight
];

function getPointOnPath(path: { x: number; y: number }[], progress: number) {
  if (path.length === 0) return { x: 0, y: 0 };
  const totalPoints = path.length;
  const indexFloat = progress * totalPoints;
  const index = Math.floor(indexFloat) % totalPoints;
  const nextIndex = (index + 1) % totalPoints;
  const t = indexFloat - Math.floor(indexFloat);
  
  const p1 = path[index];
  const p2 = path[nextIndex];
  
  return {
    x: p1.x + (p2.x - p1.x) * t,
    y: p1.y + (p2.y - p1.y) * t,
  };
}

function formatSimTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${h}:${pad(m)}:${pad(s)}`;
}

function formatLapTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${m}'${pad(s)}"${pad(ms)}`;
}

const RacingSimulator = memo(function RacingSimulator({ onTelemetryUpdate, activeSession }: RacingSimulatorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Game state controls
  const [isAutoDrive, setIsAutoDrive] = useState(true);
  const [isRunning, setIsRunning] = useState(true);
  const [trackId, setTrackId] = useState<"silverstone" | "monaco">(
    activeSession === "monaco_2022" ? "monaco" : "silverstone"
  );
  
  // Track parameters
  const roadWidth = 160;
  const segmentLength = 200;
  const cameraDepth = 0.85; // Perspective depth
  const visibleSegments = 120;

  // Car state refs to avoid React re-render lag in the animation loop
  const stateRef = useRef({
    speed: 0,
    maxSpeed: 335,
    rpm: 3000,
    throttle: 0,
    brake: 0,
    steering: 0, // -1 to +1
    playerX: 0, // offset from road center (-1 to +1)
    position: 0, // position along track (z)
    trackLength: 0,
    segments: [] as RoadSegment[],
    isAutoDrive: true,
    keys: { w: false, s: false, a: false, d: false },
    
    // Telemetry stats
    tyreWear: [5.0, 5.0, 4.0, 4.0], // FL, FR, RL, RR in %
    tyreTemp: [85.0, 85.0, 85.0, 85.0], // FL, FR, RL, RR in °C
    fuel: 100.0, // kg
    lap: 1,
    lapProgress: 0,
    lastTime: Date.now(),
    gear: 1,
    skyOffset: 0,
    simTime: 0,
    lapStartTime: 0,
  });

  useEffect(() => {
    stateRef.current.isAutoDrive = isAutoDrive;
  }, [isAutoDrive]);

  // Handle keys for manual mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (["w", "s", "a", "d"].includes(key)) {
        stateRef.current.keys[key as "w"|"s"|"a"|"d"] = true;
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (["w", "s", "a", "d"].includes(key)) {
        stateRef.current.keys[key as "w"|"s"|"a"|"d"] = false;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Initialize road segments
  const buildRoad = (track: "silverstone" | "monaco") => {
    const segments: RoadSegment[] = [];
    const recipe = track === "monaco" ? monacoRecipe : silverstoneRecipe;

    const curveValues: number[] = [];
    const hillValues: number[] = [];
    
    let currentCurve = 0;
    let currentHill = 0;
    
    for (let section = 0; section < recipe.length; section++) {
      const [len, targetCurve, targetHill] = recipe[section];
      const transitionLen = Math.min(len / 2, 25);
      const startCurve = currentCurve;
      const startHill = currentHill;
      
      for (let i = 0; i < len; i++) {
        let cVal = targetCurve;
        let hVal = targetHill;
        if (i < transitionLen) {
          const t = i / transitionLen;
          const ease = t * t * (3 - 2 * t);
          cVal = startCurve + (targetCurve - startCurve) * ease;
          hVal = startHill + (targetHill - startHill) * ease;
        }
        curveValues.push(cVal);
        hillValues.push(hVal);
      }
      currentCurve = targetCurve;
      currentHill = targetHill;
    }
    
    // Smooth transition back to the start (which is 0 curve/hill)
    const finalTransition = 25;
    const lastCurveVal = currentCurve;
    const lastHillVal = currentHill;
    for (let i = 0; i < finalTransition; i++) {
      const t = i / finalTransition;
      const ease = t * t * (3 - 2 * t);
      curveValues.push(lastCurveVal + (0 - lastCurveVal) * ease);
      hillValues.push(lastHillVal + (0 - lastHillVal) * ease);
    }

    let lastX = 0;
    let lastDX = 0;
    let lastY = 0;
    let lastDY = 0;
    const loopSize = curveValues.length;

    for (let i = 0; i < loopSize; i++) {
      const curve = curveValues[i];
      const hill = hillValues[i];
      
      // Scale curves down to stay in visual bounds with smaller roadWidth
      lastDX += curve * 0.8;
      lastX += lastDX;
      
      // Scale hill vertical steps slightly smoother
      lastDY = hill * 4.5;
      lastY += lastDY;

      const isMonaco = track === "monaco";
      const roadColor = i % 6 < 3 
        ? (isMonaco ? "#24242c" : "#4b4b54") 
        : (isMonaco ? "#2a2a34" : "#52525c");
      const grassColor = i % 6 < 3 
        ? (isMonaco ? "#0f3a14" : "#27cc40") 
        : (isMonaco ? "#14481b" : "#1ebd35");
      const curbColor = i % 6 < 3 ? "#e10600" : "#ffffff";

      let scenery = 0;
      let scenerySide = i % 2 === 0 ? 1.6 : -1.6;
      
      // Curve warning signs indicators Curve (yellow arrows matching reference screenshot)
      if (Math.abs(curve) > 1.5 && i % 12 === 0) {
        scenery = 2; // Warning sign
        scenerySide = curve > 0 ? -1.35 : 1.35;
      } else if (i % 15 === 0) {
        scenery = 1; // Tree
      } else if (i % 25 === 10) {
        scenery = 3; // Billboard
      }

      const isTunnel = isMonaco && i >= 500 && i < 640;

      segments.push({
        index: i,
        p1: { x: lastX - lastDX, y: lastY - lastDY, z: i * segmentLength, screen: { x: 0, y: 0, w: 0 } },
        p2: { x: lastX, y: lastY, z: (i + 1) * segmentLength, screen: { x: 0, y: 0, w: 0 } },
        curve,
        color: { road: roadColor, grass: grassColor, curb: curbColor },
        scenery: isTunnel ? 0 : scenery,
        scenerySide,
        tunnel: isTunnel
      });
    }

    stateRef.current.segments = segments;
    stateRef.current.trackLength = segments.length * segmentLength;
  };

  useEffect(() => {
    buildRoad(trackId);
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let telemetryTimer = 0;

    // Fixed canvas size for maximum retro look and zero lag
    const resizeCanvas = () => {
      canvas.width = 640;
      canvas.height = 360;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Simulation Game Loop
    const loop = () => {
      const state = stateRef.current;
      const now = Date.now();
      let dt = (now - state.lastTime) / 1000;
      if (dt > 0.1) dt = 0.1; // cap delta time to prevent physics jump/lag spikes
      state.lastTime = now;

      if (!isRunning) {
        animationFrameId = requestAnimationFrame(loop);
        return;
      }

      // 1. UPDATE PHYSICS & CONTROLS
      const currentSegIndex = Math.floor(state.position / segmentLength) % state.segments.length;
      const currentSeg = state.segments[currentSegIndex];
      const targetSpeedSeg = state.segments[(currentSegIndex + 15) % state.segments.length]; // look-ahead for curves

      // Update max speed dynamically based on weather (Monaco is wet/rainy)
      state.maxSpeed = trackId === "monaco" ? 260 : 335;

      if (state.isAutoDrive) {
        // AI AUTO-DRIVE MODE LOGIC
        const curveIntensity = Math.abs(targetSpeedSeg.curve);
        const targetSpeed = curveIntensity > 2 ? 160 - curveIntensity * 12 : state.maxSpeed;
        
        if (state.speed < targetSpeed) {
          state.throttle = 100;
          state.brake = 0;
        } else {
          state.throttle = 0;
          state.brake = Math.min(100, (state.speed - targetSpeed) * 3);
        }

        const upcomingCurve = currentSeg.curve;
        
        // AI targets the middle of the right lane (0.5) on straights,
        // and apexes the inside on curves: 0.7 for right curves, -0.7 for left curves.
        let targetPlayerX = 0.5;
        if (upcomingCurve > 0.5) {
          targetPlayerX = 0.7; // Apex right curve
        } else if (upcomingCurve < -0.5) {
          targetPlayerX = -0.7; // Apex left curve
        } else {
          targetPlayerX = 0.5;
        }

        const targetSteerX = upcomingCurve * 0.15;
        state.steering = state.steering + (targetSteerX - state.steering) * 0.12;
        state.playerX = state.playerX + (targetPlayerX - state.playerX) * 0.08;
      } else {
        // MANUAL MODE CONTROLS
        if (state.keys.w) {
          state.throttle = 100;
          state.brake = 0;
        } else {
          state.throttle = 0;
        }

        if (state.keys.s) {
          state.brake = 100;
        } else {
          state.brake = 0;
        }

        // Steering input smoothly returns to center or goes left/right
        if (state.keys.a) {
          state.steering = Math.max(-1.0, state.steering - 0.08);
        } else if (state.keys.d) {
          state.steering = Math.min(1.0, state.steering + 0.08);
        } else {
          state.steering = state.steering * 0.75;
          if (Math.abs(state.steering) < 0.01) state.steering = 0;
        }

        // Move player laterally based on steering angle and speed (continuous physics)
        const lateralSpeed = state.steering * 0.05 * (state.speed / 150 + 0.35);
        state.playerX = Math.max(-1.8, Math.min(1.8, state.playerX + lateralSpeed));
      }

      const isWet = trackId === "monaco";
      let offRoadSlowdown = 0;
      if (Math.abs(state.playerX) > 1.0) {
        // Heavy grass friction slowing down the car (more severe in wet)
        offRoadSlowdown = isWet ? 120 : 80;
        // Increase tyre wear and temp on grass
        state.tyreWear = state.tyreWear.map(w => Math.min(100, w + (isWet ? 0.15 : 0.08) * dt * state.speed));
        state.tyreTemp = state.tyreTemp.map(t => Math.min(130, t + (isWet ? 0.15 : 0.3) * state.speed * dt));
        // Add random sliding wheel spin in wet grass
        if (isWet && state.speed > 20) {
          state.playerX += (Math.random() - 0.5) * 0.12;
        }
      }

      const accel = state.throttle * 2.5 - state.brake * 7.5 - offRoadSlowdown - (state.speed * 0.1) * (state.speed * 0.005);
      state.speed = Math.max(0, Math.min(state.maxSpeed, state.speed + accel * dt));

      // Wet weather causes significantly more drift/sliding in corners
      const driftMultiplier = isWet ? 2.5 : 1.0;
      const curveSlide = currentSeg.curve * 0.003 * (state.speed / 100) * driftMultiplier;
      state.playerX -= curveSlide;

      state.position += state.speed * (1000 / 360) * dt;
      state.simTime += dt;
      if (state.position >= state.trackLength) {
        state.position -= state.trackLength;
        state.lap += 1;
        state.lapStartTime = state.simTime;
      }

      const speedPct = state.speed / state.maxSpeed;
      state.gear = Math.max(1, Math.min(8, Math.floor(speedPct * 7) + 1));
      const gearBaseSpeed = (state.gear - 1) / 8;
      const gearMaxSpeed = state.gear / 8;
      const gearRangePct = (speedPct - gearBaseSpeed) / (gearMaxSpeed - gearBaseSpeed);
      state.rpm = Math.max(3000, Math.min(13800, 3000 + gearRangePct * 9800 + Math.random() * 200));

      state.fuel = Math.max(0.1, state.fuel - (state.rpm * 0.000002) * dt);
      
      const baseWearMultiplier = isWet ? 0.6 : 1.0; // Water lubricates tires on track, reducing pure friction wear
      const wearMultiplier = (1.0 + (state.brake * 0.05) + Math.abs(state.steering) * 3.0) * baseWearMultiplier;
      state.tyreWear = state.tyreWear.map((w, idx) => {
        const tireBias = idx < 2 ? 0.008 : 0.006;
        return Math.min(100.0, w + tireBias * wearMultiplier * dt);
      });

      state.tyreTemp = state.tyreTemp.map((t, idx) => {
        // Wet track cools the tires down significantly
        const baseTemp = isWet ? 55.0 + (state.speed * 0.03) : 80.0 + (state.speed * 0.05);
        const brakeHeating = idx < 2 ? state.brake * 0.45 : state.brake * 0.2;
        const slideHeating = Math.abs(state.steering) * (isWet ? 25.0 : 45.0); // Less friction heating in wet
        const targetTemp = baseTemp + brakeHeating + slideHeating;
        const coolingRate = isWet ? 0.18 : 0.1; // Fast cooling due to standing water
        return t + (targetTemp - t) * coolingRate;
      });

      // 2. RENDERING SCENE (Road Rash Retro Style)
      const width = canvas.width;
      const height = canvas.height;
      const scaleFactorX = width / 640;
      const scaleFactorY = height / 360;
      
      // Update background sky/hill offset
      // As we drive, the road's curve rotates the camera
      const curveChange = currentSeg.curve * speedPct * 1.8;
      const steerChange = state.steering * speedPct * 3.5;
      state.skyOffset = (state.skyOffset || 0) - (curveChange + steerChange) * scaleFactorX;

      // Draw background sky
      if (trackId === "monaco") {
        // Dark, wet overcast sky for Monaco GP
        ctx.fillStyle = "#333d47";
      } else {
        // Sunny sky for Silverstone
        ctx.fillStyle = "#87ceeb";
      }
      ctx.fillRect(0, 0, width, height);

      // Clouds (only outside tunnel, or if not obscured)
      ctx.fillStyle = trackId === "monaco" ? "rgba(100, 110, 120, 0.5)" : "rgba(255, 255, 255, 0.75)";
      for (let j = 0; j < 3; j++) {
        const cloudX = (((now * 0.015 + j * 200 + state.skyOffset * 0.2) % (width + 120 * scaleFactorX)) + (width + 120 * scaleFactorX)) % (width + 120 * scaleFactorX) - 60 * scaleFactorX;
        const cloudY = (30 + j * 12) * scaleFactorY;
        ctx.beginPath();
        ctx.arc(cloudX, cloudY, 15 * scaleFactorY, 0, Math.PI * 2);
        ctx.arc(cloudX + 12 * scaleFactorX, cloudY - 6 * scaleFactorY, 18 * scaleFactorY, 0, Math.PI * 2);
        ctx.arc(cloudX + 24 * scaleFactorX, cloudY, 15 * scaleFactorY, 0, Math.PI * 2);
        ctx.fill();
      }

      // 1. Distant Blue Mountains (Deep Background)
      const hillScroll3 = (((state.skyOffset * 0.25) % width) + width) % width;
      ctx.fillStyle = trackId === "monaco" ? "#2b343a" : "#1f4c28";
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      for (let x = 0; x <= width + 40 * scaleFactorX; x += 25 * scaleFactorX) {
        const hillY = height / 2 - 45 * scaleFactorY * Math.sin((x + hillScroll3) * 0.003) - 15 * scaleFactorY * Math.cos((x + hillScroll3) * 0.008);
        ctx.lineTo(x, hillY);
      }
      ctx.lineTo(width, height / 2);
      ctx.closePath();
      ctx.fill();

      // 2. Parallax Green rolling mountains (Midground)
      const hillScroll = ((state.skyOffset % width) + width) % width;
      ctx.fillStyle = trackId === "monaco" ? "#16281a" : "#2d6c39";
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      for (let x = 0; x <= width + 40 * scaleFactorX; x += 20 * scaleFactorX) {
        const hillY = height / 2 - 25 * scaleFactorY * Math.sin((x + hillScroll) * 0.006) - 10 * scaleFactorY * Math.cos((x + hillScroll) * 0.015);
        ctx.lineTo(x, hillY);
      }
      ctx.lineTo(width, height / 2);
      ctx.closePath();
      ctx.fill();

      // 3. Second layer of mountains (Lighter Foreground Hills)
      const hillScroll2 = (((state.skyOffset * 0.45) % width) + width) % width;
      ctx.fillStyle = trackId === "monaco" ? "#213d25" : "#459c55";
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      for (let x = 0; x <= width + 40 * scaleFactorX; x += 20 * scaleFactorX) {
        const hillY = height / 2 - 15 * scaleFactorY * Math.sin((x - hillScroll2 + 100 * scaleFactorX) * 0.008) - 5 * scaleFactorY * Math.cos((x - hillScroll2) * 0.02);
        ctx.lineTo(x, hillY);
      }
      ctx.lineTo(width, height / 2);
      ctx.closePath();
      ctx.fill();

      // Project segment positions
      const startSegIndex = Math.floor(state.position / segmentLength);
      const totalSegments = state.segments.length;
      let totalDrift = 0;
      let totalHeightDrift = 0;
      if (totalSegments > 0) {
        totalDrift = state.segments[totalSegments - 1].p2.x;
        totalHeightDrift = state.segments[totalSegments - 1].p2.y;
      }

      // Camera coordinates
      const currentWraps = Math.floor(startSegIndex / totalSegments);
      const currentRoadX = currentSeg.p1.x + currentWraps * totalDrift;
      const currentRoadY = currentSeg.p1.y + currentWraps * totalHeightDrift;
      const nextSegIdx = (startSegIndex + 1) % totalSegments;
      const nextSeg = state.segments[nextSegIdx];
      const nextWraps = Math.floor((startSegIndex + 1) / totalSegments);
      const nextRoadX = nextSeg.p1.x + nextWraps * totalDrift;
      const nextRoadY = nextSeg.p1.y + nextWraps * totalHeightDrift;
      
      const percent = (state.position % segmentLength) / segmentLength;
      const cameraX = (currentRoadX + percent * (nextRoadX - currentRoadX)) + state.playerX * roadWidth;
      // Lower camera to the ground for a level retro feel (800 units above road)
      const cameraY = (currentRoadY + percent * (nextRoadY - currentRoadY)) + 800;

      // Camera rumble shake offsets
      let shakeX = 0;
      let shakeY = 0;
      if (Math.abs(state.playerX) > 1.0 && state.speed > 30) {
        shakeX = (Math.random() - 0.5) * 6 * scaleFactorX;
        shakeY = (Math.random() - 0.5) * 6 * scaleFactorY;
      } else if (Math.abs(state.playerX) > 0.85 && state.speed > 50) {
        shakeX = (Math.random() - 0.5) * 3 * scaleFactorX;
        shakeY = (Math.random() - 0.5) * 3 * scaleFactorY;
      }

      for (let i = 0; i < visibleSegments; i++) {
        const globalSegIdx = startSegIndex + i;
        const segIdx = globalSegIdx % totalSegments;
        const segment = state.segments[segIdx];
        
        const numWraps = Math.floor(globalSegIdx / totalSegments);
        const p1_worldX = segment.p1.x + numWraps * totalDrift;
        const p2_worldX = segment.p2.x + numWraps * totalDrift;
        const p1_worldY = segment.p1.y + numWraps * totalHeightDrift;
        const p2_worldY = segment.p2.y + numWraps * totalHeightDrift;
        
        const loopOffset = numWraps * (totalSegments * segmentLength);
        
        // Use a safe clipping minimum of 20 units to prevent extreme coordinate values and lag
        const dist1 = Math.max(20, segment.p1.z + loopOffset - state.position);
        const dist2 = Math.max(20, segment.p2.z + loopOffset - state.position);
        
        const scale1 = cameraDepth / dist1;
        const scale2 = cameraDepth / dist2;

        segment.p1.screen.x = width / 2 + (p1_worldX - cameraX) * scale1 * (width / 2);
        // Vertical scale factor increased to 45 to keep road depth aligned with lower camera height
        segment.p1.screen.y = height / 2 + (cameraY - p1_worldY) * scale1 * 45 * scaleFactorY;
        segment.p1.screen.w = roadWidth * scale1 * (width / 2);

        segment.p2.screen.x = width / 2 + (p2_worldX - cameraX) * scale2 * (width / 2);
        segment.p2.screen.y = height / 2 + (cameraY - p2_worldY) * scale2 * 45 * scaleFactorY;
        segment.p2.screen.w = roadWidth * scale2 * (width / 2);
      }

      // Pass 1: Draw road, grass, curbs, guardrails, asphalt, centerlines (back-to-front)
      ctx.save();
      ctx.translate(shakeX, shakeY);
      for (let i = visibleSegments - 1; i > 0; i--) {
        const s = state.segments[(startSegIndex + i) % totalSegments];
        const p = state.segments[(startSegIndex + i - 1) % totalSegments];

        if (s.p1.screen.y <= height / 2) continue;

        const loopOffset = Math.floor((startSegIndex + i) / totalSegments) * (totalSegments * segmentLength);
        const dist1 = Math.max(1, s.p1.z + loopOffset - state.position);
        const scale1 = cameraDepth / dist1;
        const scale2 = cameraDepth / Math.max(1, p.p1.z + Math.floor((startSegIndex + i - 1) / totalSegments) * (totalSegments * segmentLength) - state.position);

        if (s.tunnel) {
          // Draw tunnel concrete walls
          ctx.fillStyle = s.index % 6 < 3 ? "#24242d" : "#2c2c35";
          
          const wallOffset = 1.05;
          const ceilingH1 = 1.6 * scale1 * 36000 * scaleFactorY;
          const ceilingH2 = 1.6 * scale2 * 36000 * scaleFactorY;

          // Left Wall
          ctx.beginPath();
          ctx.moveTo(0, p.p1.screen.y);
          ctx.lineTo(p.p1.screen.x - p.p1.screen.w * wallOffset, p.p1.screen.y);
          ctx.lineTo(p.p1.screen.x - p.p1.screen.w * wallOffset, p.p1.screen.y - ceilingH2);
          ctx.lineTo(0, p.p1.screen.y - ceilingH2);
          ctx.fill();

          ctx.beginPath();
          ctx.moveTo(0, p.p1.screen.y - ceilingH2);
          ctx.lineTo(s.p1.screen.x - s.p1.screen.w * wallOffset, s.p1.screen.y - ceilingH1);
          ctx.lineTo(s.p1.screen.x - s.p1.screen.w * wallOffset, s.p1.screen.y);
          ctx.lineTo(0, s.p1.screen.y);
          ctx.fill();

          // Right Wall
          ctx.beginPath();
          ctx.moveTo(width, p.p1.screen.y);
          ctx.lineTo(p.p1.screen.x + p.p1.screen.w * wallOffset, p.p1.screen.y);
          ctx.lineTo(p.p1.screen.x + p.p1.screen.w * wallOffset, p.p1.screen.y - ceilingH2);
          ctx.lineTo(width, p.p1.screen.y - ceilingH2);
          ctx.fill();

          ctx.beginPath();
          ctx.moveTo(width, p.p1.screen.y - ceilingH2);
          ctx.lineTo(s.p1.screen.x + s.p1.screen.w * wallOffset, s.p1.screen.y - ceilingH1);
          ctx.lineTo(s.p1.screen.x + s.p1.screen.w * wallOffset, s.p1.screen.y);
          ctx.lineTo(width, s.p1.screen.y);
          ctx.fill();

          // Ceiling
          ctx.fillStyle = s.index % 6 < 3 ? "#1c1c23" : "#22222b";
          ctx.beginPath();
          ctx.moveTo(p.p1.screen.x - p.p1.screen.w * wallOffset, p.p1.screen.y - ceilingH2);
          ctx.lineTo(p.p1.screen.x + p.p1.screen.w * wallOffset, p.p1.screen.y - ceilingH2);
          ctx.lineTo(s.p1.screen.x + s.p1.screen.w * wallOffset, s.p1.screen.y - ceilingH1);
          ctx.lineTo(s.p1.screen.x - s.p1.screen.w * wallOffset, s.p1.screen.y - ceilingH1);
          ctx.fill();

          // Overhead lights (yellow lines/circles on the ceiling)
          if (s.index % 8 === 0) {
            const lightW = s.p1.screen.w * 0.15;
            const lightH = 4 * scaleFactorY;
            const lightX = s.p1.screen.x - lightW / 2;
            const lightY = s.p1.screen.y - ceilingH1;

            // Draw outer glow rectangle (alpha overlay instead of heavy CPU shadowBlur)
            ctx.fillStyle = "rgba(255, 208, 0, 0.25)";
            ctx.fillRect(lightX - lightW * 0.5, lightY - lightH * 1.5, lightW * 2, lightH * 4);

            // Draw bright core light
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(lightX, lightY, lightW, lightH);
          }
        } else {
          // Draw normal grass
          ctx.fillStyle = s.color.grass;
          ctx.beginPath();
          ctx.moveTo(0, p.p1.screen.y);
          ctx.lineTo(width, p.p1.screen.y);
          ctx.lineTo(width, s.p1.screen.y);
          ctx.lineTo(0, s.p1.screen.y);
          ctx.fill();

          // Curbs
          const curbWidth1 = s.p1.screen.w * 0.12;
          const curbWidth2 = s.p2.screen.w * 0.12;
          ctx.fillStyle = s.color.curb;
          // Left Curb
          ctx.beginPath();
          ctx.moveTo(p.p1.screen.x - p.p1.screen.w - curbWidth1, p.p1.screen.y);
          ctx.lineTo(p.p1.screen.x - p.p1.screen.w, p.p1.screen.y);
          ctx.lineTo(s.p1.screen.x - s.p1.screen.w, s.p1.screen.y);
          ctx.lineTo(s.p1.screen.x - s.p1.screen.w - curbWidth2, s.p1.screen.y);
          ctx.fill();
          // Right Curb
          ctx.beginPath();
          ctx.moveTo(p.p1.screen.x + p.p1.screen.w, p.p1.screen.y);
          ctx.lineTo(p.p1.screen.x + p.p1.screen.w + curbWidth1, p.p1.screen.y);
          ctx.lineTo(s.p1.screen.x + s.p1.screen.w + curbWidth2, s.p1.screen.y);
          ctx.lineTo(s.p1.screen.x + s.p1.screen.w, s.p1.screen.y);
          ctx.fill();

          // Guardrails (brown posts + metallic rail)
          const postH1 = 0.13 * scale1 * 36000 * scaleFactorY;
          const railOffset = 1.15; // place right outside curb
          
          ctx.lineWidth = 1.5;
          if (s.index % 2 === 0) {
            ctx.fillStyle = "#8a5a36"; // Wood post brown
            const postW = Math.max(2, postH1 * 0.08);
            // Left Post
            ctx.fillRect(
              s.p1.screen.x - s.p1.screen.w * railOffset - postW / 2, 
              s.p1.screen.y - postH1, 
              postW, 
              postH1
            );
            // Right Post
            ctx.fillRect(
              s.p1.screen.x + s.p1.screen.w * railOffset - postW / 2, 
              s.p1.screen.y - postH1, 
              postW, 
              postH1
            );
          }

          // Draw horizontal metallic rail
          ctx.fillStyle = "#b0b0b8";
          ctx.strokeStyle = "#808088";
          // Left Rail
          ctx.beginPath();
          ctx.moveTo(p.p1.screen.x - p.p1.screen.w * railOffset, p.p1.screen.y - postH1 * 0.95);
          ctx.lineTo(p.p1.screen.x - p.p1.screen.w * railOffset, p.p1.screen.y - postH1 * 0.7);
          ctx.lineTo(s.p1.screen.x - s.p1.screen.w * railOffset, s.p1.screen.y - postH1 * 0.7);
          ctx.lineTo(s.p1.screen.x - s.p1.screen.w * railOffset, s.p1.screen.y - postH1 * 0.95);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Right Rail
          ctx.beginPath();
          ctx.moveTo(p.p1.screen.x + p.p1.screen.w * railOffset, p.p1.screen.y - postH1 * 0.95);
          ctx.lineTo(p.p1.screen.x + p.p1.screen.w * railOffset, p.p1.screen.y - postH1 * 0.7);
          ctx.lineTo(s.p1.screen.x + s.p1.screen.w * railOffset, s.p1.screen.y - postH1 * 0.7);
          ctx.lineTo(s.p1.screen.x + s.p1.screen.w * railOffset, s.p1.screen.y - postH1 * 0.95);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }

        // Road Asphalt
        ctx.fillStyle = s.color.road;
        ctx.beginPath();
        ctx.moveTo(p.p1.screen.x - p.p1.screen.w, p.p1.screen.y);
        ctx.lineTo(p.p1.screen.x + p.p1.screen.w, p.p1.screen.y);
        ctx.lineTo(s.p1.screen.x + s.p1.screen.w, s.p1.screen.y);
        ctx.lineTo(s.p1.screen.x - s.p1.screen.w, s.p1.screen.y);
        ctx.fill();

        // Edge lines (solid white lines on edges of road)
        ctx.fillStyle = "#ffffff";
        const edgeW1 = p.p1.screen.w * 0.012;
        const edgeW2 = s.p1.screen.w * 0.012;
        // Left Edge Line
        ctx.beginPath();
        ctx.moveTo(p.p1.screen.x - p.p1.screen.w, p.p1.screen.y);
        ctx.lineTo(p.p1.screen.x - p.p1.screen.w + edgeW1, p.p1.screen.y);
        ctx.lineTo(s.p1.screen.x - s.p1.screen.w + edgeW2, s.p1.screen.y);
        ctx.lineTo(s.p1.screen.x - s.p1.screen.w, s.p1.screen.y);
        ctx.fill();
        // Right Edge Line
        ctx.beginPath();
        ctx.moveTo(p.p1.screen.x + p.p1.screen.w - edgeW1, p.p1.screen.y);
        ctx.lineTo(p.p1.screen.x + p.p1.screen.w, p.p1.screen.y);
        ctx.lineTo(s.p1.screen.x + s.p1.screen.w - edgeW2, s.p1.screen.y);
        ctx.lineTo(s.p1.screen.x + s.p1.screen.w, s.p1.screen.y);
        ctx.fill();

        // Single Yellow Dashed Centerline (curves with the road, alternating every 6 segments)
        if (s.index % 6 < 3) {
          ctx.fillStyle = "#ffd000";
          const stripeW1 = p.p1.screen.w * 0.015;
          const stripeW2 = s.p1.screen.w * 0.015;
          ctx.beginPath();
          ctx.moveTo(p.p1.screen.x - stripeW1, p.p1.screen.y);
          ctx.lineTo(p.p1.screen.x + stripeW1, p.p1.screen.y);
          ctx.lineTo(s.p1.screen.x + stripeW2, s.p1.screen.y);
          ctx.lineTo(s.p1.screen.x - stripeW2, s.p1.screen.y);
          ctx.fill();
        }
      }

      // Pass 2: Draw scenery sprites (back-to-front)
      for (let i = visibleSegments - 1; i > 0; i--) {
        const s = state.segments[(startSegIndex + i) % totalSegments];

        if (s.p1.screen.y <= height / 2) continue;

        const loopOffset = Math.floor((startSegIndex + i) / totalSegments) * (totalSegments * segmentLength);
        const dist1 = Math.max(1, s.p1.z + loopOffset - state.position);
        const scale1 = cameraDepth / dist1;
        const spriteCamHeight = 36000 * scaleFactorY;

        if (s.scenery === 1) {
          // Coniferous Pine Tree
          const treeX = s.p1.screen.x + s.p1.screen.w * s.scenerySide;
          const trunkH = 0.9 * scale1 * spriteCamHeight;
          const trunkW = trunkH * 0.12;

          // Draw trunk
          ctx.fillStyle = "#4a2f13";
          ctx.fillRect(treeX - trunkW / 2, s.p1.screen.y - trunkH, trunkW, trunkH);

          // Draw overlapping triangular pine layers
          const layers = 4;
          const baseWidth = trunkH * 0.65;
          const layerH = trunkH * 0.28;
          ctx.fillStyle = s.color.grass === "#0f3a14" ? "#10471c" : "#1b5a26";
          
          for (let l = 0; l < layers; l++) {
            const w = baseWidth * (1.0 - l * 0.22);
            const h = layerH * (1.0 - l * 0.1);
            const y = s.p1.screen.y - trunkH * 0.5 - l * (layerH * 0.5);
            
            ctx.beginPath();
            ctx.moveTo(treeX - w / 2, y);
            ctx.lineTo(treeX, y - h);
            ctx.lineTo(treeX + w / 2, y);
            ctx.closePath();
            ctx.fill();
            
            ctx.fillStyle = s.color.grass === "#0f3a14" ? "#1a5b28" : "#247534";
            ctx.beginPath();
            ctx.moveTo(treeX - w / 2, y);
            ctx.lineTo(treeX, y - h);
            ctx.lineTo(treeX, y);
            ctx.closePath();
            ctx.fill();
            
            ctx.fillStyle = s.color.grass === "#0f3a14" ? "#10471c" : "#1b5a26";
          }
        } else if (s.scenery === 2) {
          // Warning sign
          const signX = s.p1.screen.x + s.p1.screen.w * s.scenerySide;
          const signH = 0.95 * scale1 * spriteCamHeight;
          
          // Signpost
          ctx.fillStyle = "#111116";
          ctx.fillRect(signX - 1.5 * scaleFactorX, s.p1.screen.y - signH, 3 * scaleFactorX, signH);

          // Yellow diamond board
          const boardSize = signH * 0.25;
          const boardY = s.p1.screen.y - signH;

          ctx.save();
          ctx.translate(signX, boardY);
          ctx.rotate(Math.PI / 4);
          ctx.fillStyle = "#ffd000";
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 1.5 * scaleFactorX;
          ctx.fillRect(-boardSize / 2, -boardSize / 2, boardSize, boardSize);
          ctx.strokeRect(-boardSize / 2, -boardSize / 2, boardSize, boardSize);
          ctx.restore();

          // Arrow pointing in turn direction (matching screenshot arrows)
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 2 * scaleFactorX;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.beginPath();
          if (s.curve > 0) {
            ctx.moveTo(signX - boardSize * 0.2, boardY + boardSize * 0.15);
            ctx.lineTo(signX + boardSize * 0.15, boardY);
            ctx.lineTo(signX - boardSize * 0.2, boardY - boardSize * 0.15);
            // Arrowhead tip
            ctx.moveTo(signX, boardY - boardSize * 0.15);
            ctx.lineTo(signX + boardSize * 0.15, boardY);
            ctx.lineTo(signX, boardY + boardSize * 0.15);
          } else {
            ctx.moveTo(signX + boardSize * 0.2, boardY + boardSize * 0.15);
            ctx.lineTo(signX - boardSize * 0.15, boardY);
            ctx.lineTo(signX + boardSize * 0.2, boardY - boardSize * 0.15);
            // Arrowhead tip
            ctx.moveTo(signX, boardY - boardSize * 0.15);
            ctx.lineTo(signX - boardSize * 0.15, boardY);
            ctx.lineTo(signX, boardY + boardSize * 0.15);
          }
          ctx.stroke();
        } else if (s.scenery === 3) {
          // Render Advertising Billboard
          const signX = s.p1.screen.x + s.p1.screen.w * s.scenerySide;
          const signH = 0.9 * scale1 * spriteCamHeight;
          const boardW = 120 * scale1 * (width / 2);
          const boardH = 30 * scale1 * (height / 2);

          // Support Posts
          ctx.fillStyle = "#1c1c22";
          ctx.fillRect(signX - boardW * 0.35 - 2 * scaleFactorX, s.p1.screen.y - signH, 4 * scaleFactorX, signH);
          ctx.fillRect(signX + boardW * 0.35 - 2 * scaleFactorX, s.p1.screen.y - signH, 4 * scaleFactorX, signH);

          // Main board
          const boardY = s.p1.screen.y - signH;
          ctx.fillStyle = s.index % 50 < 25 ? "#9dff00" : "#00f3ff";
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2 * scaleFactorX;
          ctx.fillRect(signX - boardW / 2, boardY, boardW, boardH);
          ctx.strokeRect(signX - boardW / 2, boardY, boardW, boardH);

          // Board text
          ctx.fillStyle = "#ffffff";
          ctx.font = `bold ${Math.max(5, boardH * 0.45)}px "JetBrains Mono", sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          const sponsorText = s.index % 50 < 25 ? "IBM GRANITE" : "APEXION AI";
          ctx.fillText(sponsorText, signX, boardY + boardH / 2);
        }
      }

      // Draw speed streak particles
      if (state.speed > 100) {
        ctx.fillStyle = "rgba(0, 191, 255, 0.15)";
        for (let j = 0; j < 6; j++) {
          const streakX = (width / 2) + Math.sin(now * 0.005 + j) * (width * 0.4);
          const streakY = (height / 2) + ((now * 0.5 * scaleFactorY + j * 50 * scaleFactorY) % (height / 2));
          const size = 1 + (streakY - height / 2) * 0.05 * scaleFactorX;
          ctx.fillRect(streakX, streakY, size * 4, 1.5);
        }
      }

      // Monaco Rain streak overlay
      if (trackId === "monaco") {
        ctx.strokeStyle = "rgba(174, 219, 255, 0.22)";
        ctx.lineWidth = 1 * scaleFactorX;
        for (let r = 0; r < 25; r++) {
          const rx = Math.random() * width;
          const ry = Math.random() * height;
          const rlen = (10 + Math.random() * 20) * scaleFactorY;
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.lineTo(rx - 2 * scaleFactorX, ry + rlen);
          ctx.stroke();
        }
      }

      // 3. DRAW THE FORMULA 1 RACING CAR (HIGH-FIDELITY RETRO RENDER)
      const carX = width / 2 + state.steering * 25 * scaleFactorX;
      const carY = height * 0.86;
      
      const carW = 120 * scaleFactorX;
      const carH = 48 * scaleFactorY;

      // 3D Yaw Perspective Shift based on both steering input and active road curve
      const yawShift = (state.steering * 24 + currentSeg.curve * 12) * scaleFactorX;
      const steerShift = (state.steering * 15 + currentSeg.curve * 5) * scaleFactorX;
      const steerAngle = (state.steering * 0.35 + currentSeg.curve * 0.1);

      // Yaw rotation (pointing the car into the turn)
      const yawAngle = state.steering * 0.12 + currentSeg.curve * 0.045;
      
      // Outward body roll displacement (shifting the upper parts outward under centrifugal Gs)
      const rollShift = (-state.steering * 10 - currentSeg.curve * 3.5) * scaleFactorX;

      ctx.save();
      ctx.translate(carX, carY);
      ctx.rotate(yawAngle);

      // Shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
      ctx.beginPath();
      ctx.ellipse(0, carH * 0.38, carW * 0.55, carH * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();

      // REAR DIFFUSER & CARBON FLOOR
      ctx.fillStyle = "#141416";
      ctx.fillRect(-carW * 0.3, carH * 0.18, carW * 0.6, carH * 0.15);
      
      // Diffuser fins (strakes)
      ctx.fillStyle = "#09090b";
      for (let f = -3; f <= 3; f++) {
        if (f === 0) continue;
        const fx = f * (carW * 0.08);
        ctx.fillRect(fx - 2 * scaleFactorX, carH * 0.18, 4 * scaleFactorX, carH * 0.15);
      }

      // REAR TYRES (Fat slicks with tread contours & Pirelli markings)
      const tyreW = 38 * scaleFactorX;
      const tyreH = 64 * scaleFactorY;
      const leftTyreX = -carW * 0.48;
      const rightTyreX = carW * 0.48 - tyreW;
      const tyreY = -carH * 0.25;

      // Tire body (dark charcoal with rounded corners for 3D feel)
      ctx.fillStyle = "#0c0c0e";
      // Left tyre
      ctx.beginPath();
      ctx.roundRect(leftTyreX, tyreY, tyreW, tyreH, 6 * scaleFactorX);
      ctx.fill();
      // Right tyre
      ctx.beginPath();
      ctx.roundRect(rightTyreX, tyreY, tyreW, tyreH, 6 * scaleFactorX);
      ctx.fill();

      // Tire tread highlights/shadows
      ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
      ctx.fillRect(leftTyreX + 2 * scaleFactorX, tyreY, 4 * scaleFactorX, tyreH);
      ctx.fillRect(rightTyreX + 2 * scaleFactorX, tyreY, 4 * scaleFactorX, tyreH);
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.fillRect(leftTyreX + tyreW - 8 * scaleFactorX, tyreY, 8 * scaleFactorX, tyreH);
      ctx.fillRect(rightTyreX + tyreW - 8 * scaleFactorX, tyreY, 8 * scaleFactorX, tyreH);

      // Pirelli lettering / stripe rings on sidewalls
      let stripeColor = "#e10600"; // Red Soft
      if (trackId === "monaco") {
        stripeColor = "#00ff66"; // Green Intermediate (Monaco wet)
      } else {
        stripeColor = "#ffd000"; // Yellow Medium
      }
      
      // Draw compound ring on sidewall
      ctx.strokeStyle = stripeColor;
      ctx.lineWidth = 3 * scaleFactorX;
      // Left wheel sidewall ring
      ctx.beginPath();
      ctx.arc(leftTyreX + tyreW - 8 * scaleFactorX, tyreY + tyreH / 2, tyreH * 0.28, 0, Math.PI * 2);
      ctx.stroke();
      // Right wheel sidewall ring
      ctx.beginPath();
      ctx.arc(rightTyreX + 8 * scaleFactorX, tyreY + tyreH / 2, tyreH * 0.28, 0, Math.PI * 2);
      ctx.stroke();

      // Tyre branding text
      ctx.save();
      ctx.font = `bold ${5 * scaleFactorY}px "JetBrains Mono", sans-serif`;
      ctx.fillStyle = stripeColor;
      ctx.textAlign = "center";
      ctx.translate(leftTyreX + tyreW - 8 * scaleFactorX, tyreY + tyreH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText("P ZERO", 0, -3 * scaleFactorX);
      ctx.restore();

      ctx.save();
      ctx.font = `bold ${5 * scaleFactorY}px "JetBrains Mono", sans-serif`;
      ctx.fillStyle = stripeColor;
      ctx.textAlign = "center";
      ctx.translate(rightTyreX + 8 * scaleFactorX, tyreY + tyreH / 2);
      ctx.rotate(Math.PI / 2);
      ctx.fillText("P ZERO", 0, -3 * scaleFactorX);
      ctx.restore();

      // Wheel Rims & Wheel Nuts (Red left, Blue right!)
      // Left Rim
      ctx.fillStyle = "#1e1e24";
      ctx.beginPath();
      ctx.arc(leftTyreX + tyreW - 8 * scaleFactorX, tyreY + tyreH / 2, 8 * scaleFactorX, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#3a3a45";
      ctx.fillRect(leftTyreX + tyreW - 14 * scaleFactorX, tyreY + tyreH / 2 - 1 * scaleFactorY, 12 * scaleFactorX, 2 * scaleFactorY);
      ctx.fillRect(leftTyreX + tyreW - 9 * scaleFactorX, tyreY + tyreH / 2 - 6 * scaleFactorY, 2 * scaleFactorX, 12 * scaleFactorY);
      ctx.fillStyle = "#ff3333";
      ctx.beginPath();
      ctx.arc(leftTyreX + tyreW - 8 * scaleFactorX, tyreY + tyreH / 2, 2.5 * scaleFactorX, 0, Math.PI * 2);
      ctx.fill();

      // Right Rim
      ctx.fillStyle = "#1e1e24";
      ctx.beginPath();
      ctx.arc(rightTyreX + 8 * scaleFactorX, tyreY + tyreH / 2, 8 * scaleFactorX, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#3a3a45";
      ctx.fillRect(rightTyreX + 2 * scaleFactorX, tyreY + tyreH / 2 - 1 * scaleFactorY, 12 * scaleFactorX, 2 * scaleFactorY);
      ctx.fillRect(rightTyreX + 7 * scaleFactorX, tyreY + tyreH / 2 - 6 * scaleFactorY, 2 * scaleFactorX, 12 * scaleFactorY);
      ctx.fillStyle = "#3399ff";
      ctx.beginPath();
      ctx.arc(rightTyreX + 8 * scaleFactorX, tyreY + tyreH / 2, 2.5 * scaleFactorX, 0, Math.PI * 2);
      ctx.fill();

      // SUSPENSION WISHBONES (Diagonal carbon arms)
      ctx.strokeStyle = "#1a1a22";
      ctx.lineWidth = 3.0 * scaleFactorX;
      ctx.beginPath();
      // Left wishbones
      ctx.moveTo(-carW * 0.18, carH * 0.05);
      ctx.lineTo(leftTyreX + tyreW - 4 * scaleFactorX, tyreY + tyreH * 0.35);
      ctx.moveTo(-carW * 0.15, -carH * 0.15);
      ctx.lineTo(leftTyreX + tyreW - 4 * scaleFactorX, tyreY + tyreH * 0.65);
      // Right wishbones
      ctx.moveTo(carW * 0.18, carH * 0.05);
      ctx.lineTo(rightTyreX + 4 * scaleFactorX, tyreY + tyreH * 0.35);
      ctx.moveTo(carW * 0.15, -carH * 0.15);
      ctx.lineTo(rightTyreX + 4 * scaleFactorX, tyreY + tyreH * 0.65);
      ctx.stroke();

      // Suspension driveshafts
      ctx.strokeStyle = "#7a7a85";
      ctx.lineWidth = 2.0 * scaleFactorX;
      ctx.beginPath();
      ctx.moveTo(-carW * 0.12, carH * 0.05);
      ctx.lineTo(leftTyreX + tyreW - 8 * scaleFactorX, tyreY + tyreH / 2);
      ctx.moveTo(carW * 0.12, carH * 0.05);
      ctx.lineTo(rightTyreX + 8 * scaleFactorX, tyreY + tyreH / 2);
      ctx.stroke();

      // MAIN COKE-BOTTLE CHASSIS (Red F1 body)
      // FRONT TYRES (Visible on the sides of the chassis, farther forward, smaller, and steerable!)
      const frontTyreW = 24 * scaleFactorX;
      const frontTyreH = 44 * scaleFactorY;
      const frontTyreY = -carH * 0.55;
      
      // Left Front Tyre
      const lfX = -carW * 0.36 + steerShift;
      ctx.save();
      ctx.translate(lfX + frontTyreW / 2, frontTyreY + frontTyreH / 2);
      ctx.rotate(steerAngle);
      ctx.fillStyle = "#0c0c0e";
      ctx.beginPath();
      const lfW = frontTyreW * (1.0 - Math.abs(state.steering) * 0.15);
      ctx.roundRect(-lfW / 2, -frontTyreH / 2, lfW, frontTyreH, 4 * scaleFactorX);
      ctx.fill();
      ctx.restore();

      // Right Front Tyre
      const rfX = carW * 0.36 - frontTyreW + steerShift;
      ctx.save();
      ctx.translate(rfX + frontTyreW / 2, frontTyreY + frontTyreH / 2);
      ctx.rotate(steerAngle);
      ctx.fillStyle = "#0c0c0e";
      ctx.beginPath();
      const rfW = frontTyreW * (1.0 - Math.abs(state.steering) * 0.15);
      ctx.roundRect(-rfW / 2, -frontTyreH / 2, rfW, frontTyreH, 4 * scaleFactorX);
      ctx.fill();
      ctx.restore();

      // FRONT SUSPENSION WISHBONES (Diagonal carbon arms connecting front tires to chassis)
      ctx.strokeStyle = "#1a1a22";
      ctx.lineWidth = 2.0 * scaleFactorX;
      ctx.beginPath();
      // Left front wishbones
      ctx.moveTo(-carW * 0.12 + yawShift * 0.4, -carH * 0.35);
      ctx.lineTo(lfX + frontTyreW / 2, frontTyreY + frontTyreH / 2);
      // Right front wishbones
      ctx.moveTo(carW * 0.12 + yawShift * 0.4, -carH * 0.35);
      ctx.lineTo(rfX + frontTyreW / 2, frontTyreY + frontTyreH / 2);
      ctx.stroke();

      // MAIN COKE-BOTTLE CHASSIS (Volt F1 body - shifted by both yawShift and rollShift)
      ctx.fillStyle = "#9dff00";
      ctx.beginPath();
      ctx.moveTo(-carW * 0.25, carH * 0.15);
      ctx.lineTo(-carW * 0.18 + yawShift * 0.4 + rollShift * 0.3, -carH * 0.22);
      ctx.lineTo(-carW * 0.06 + yawShift * 0.6 + rollShift * 0.8, -carH * 0.62);
      ctx.lineTo(carW * 0.06 + yawShift * 0.6 + rollShift * 0.8, -carH * 0.62);
      ctx.lineTo(carW * 0.18 + yawShift * 0.4 + rollShift * 0.3, -carH * 0.22);
      ctx.lineTo(carW * 0.25, carH * 0.15);
      ctx.lineTo(yawShift * 0.2 + rollShift * 0.1, carH * 0.22);
      ctx.closePath();
      ctx.fill();

      // Shadow overlay on chassis
      const bodyGlow = ctx.createLinearGradient(0, -carH * 0.6, 0, carH * 0.2);
      bodyGlow.addColorStop(0, "rgba(255, 255, 255, 0.15)");
      bodyGlow.addColorStop(0.5, "rgba(0, 0, 0, 0)");
      bodyGlow.addColorStop(1, "rgba(0, 0, 0, 0.45)");
      ctx.fillStyle = bodyGlow;
      ctx.beginPath();
      ctx.moveTo(-carW * 0.25, carH * 0.15);
      ctx.lineTo(-carW * 0.18 + yawShift * 0.4 + rollShift * 0.3, -carH * 0.22);
      ctx.lineTo(-carW * 0.06 + yawShift * 0.6 + rollShift * 0.8, -carH * 0.62);
      ctx.lineTo(carW * 0.06 + yawShift * 0.6 + rollShift * 0.8, -carH * 0.62);
      ctx.lineTo(carW * 0.18 + yawShift * 0.4 + rollShift * 0.3, -carH * 0.22);
      ctx.lineTo(carW * 0.25, carH * 0.15);
      ctx.lineTo(yawShift * 0.2 + rollShift * 0.1, carH * 0.22);
      ctx.closePath();
      ctx.fill();

      // Sidepods louvers (cooling vents - shifted with chassis)
      ctx.strokeStyle = "#121215";
      ctx.lineWidth = 1.5 * scaleFactorX;
      for (let l = 0; l < 4; l++) {
        const ly = -carH * 0.1 + l * (4 * scaleFactorY);
        ctx.beginPath();
        ctx.moveTo(-carW * 0.18 + yawShift * 0.4 + rollShift * 0.3, ly);
        ctx.lineTo(-carW * 0.12 + yawShift * 0.4 + rollShift * 0.3, ly + 1 * scaleFactorY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(carW * 0.18 + yawShift * 0.4 + rollShift * 0.3, ly);
        ctx.lineTo(carW * 0.12 + yawShift * 0.4 + rollShift * 0.3, ly + 1 * scaleFactorY);
        ctx.stroke();
      }

      // DRIVER HELMET & COCKPIT (shifted by yawShift and rollShift)
      const headShift = yawShift * 0.7 + rollShift * 0.75;
      
      // Cockpit opening
      ctx.fillStyle = "#0c0c0e";
      ctx.beginPath();
      ctx.ellipse(headShift, -carH * 0.28, carW * 0.07, carH * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();

      // Driver helmet
      ctx.fillStyle = "#ffdd00"; // yellow helmet shell
      ctx.beginPath();
      ctx.arc(headShift, -carH * 0.32, 7 * scaleFactorY, 0, Math.PI * 2);
      ctx.fill();

      // Visor
      ctx.fillStyle = "#111116";
      ctx.fillRect(-5 * scaleFactorX + headShift, -carH * 0.34, 10 * scaleFactorX, 3 * scaleFactorY);

      // Blue helmet striping
      ctx.fillStyle = "#0066cc";
      ctx.fillRect(-6 * scaleFactorX + headShift, -carH * 0.36, 12 * scaleFactorX, 1.5 * scaleFactorY);

      // Glowing LED steering wheel inside cockpit
      ctx.fillStyle = "#1e1e24";
      ctx.fillRect(-8 * scaleFactorX + headShift, -carH * 0.24, 16 * scaleFactorX, 4 * scaleFactorY);
      // LED shift lights
      for (let d = -3; d <= 3; d++) {
        const dx = d * 2 * scaleFactorX + headShift;
        ctx.fillStyle = d < -1 ? "#00ff00" : d > 1 ? "#ff0000" : "#0055ff";
        ctx.beginPath();
        ctx.arc(dx, -carH * 0.23, 0.7 * scaleFactorX, 0, Math.PI * 2);
        ctx.fill();
      }

      // HALO PROTECTOR
      const haloShift = yawShift * 0.75 + rollShift * 0.75;
      ctx.strokeStyle = "#16161c";
      ctx.lineWidth = 3.0 * scaleFactorX;
      ctx.beginPath();
      ctx.arc(haloShift, -carH * 0.35, 12 * scaleFactorX, Math.PI, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(haloShift, -carH * 0.35);
      ctx.lineTo(yawShift * 0.65 + rollShift * 0.75, -carH * 0.22);
      ctx.stroke();

      // ENGINE AIRBOX SCOOP
      const airboxShift = yawShift * 0.6 + rollShift * 0.9;
      ctx.fillStyle = "#1c1c22";
      ctx.beginPath();
      ctx.moveTo(-carW * 0.035 + airboxShift, -carH * 0.58);
      ctx.lineTo(carW * 0.035 + airboxShift, -carH * 0.58);
      ctx.lineTo(carW * 0.025 + yawShift * 0.55 + rollShift * 0.85, -carH * 0.48);
      ctx.lineTo(-carW * 0.025 + yawShift * 0.55 + rollShift * 0.85, -carH * 0.48);
      ctx.closePath();
      ctx.fill();

      // T-Cam camera pod
      ctx.fillStyle = "#ffd000";
      ctx.fillRect(-7 * scaleFactorX + airboxShift, -carH * 0.65, 14 * scaleFactorX, 3.5 * scaleFactorY);
      ctx.fillStyle = "#111116";
      ctx.fillRect(-2 * scaleFactorX + airboxShift, -carH * 0.65, 4 * scaleFactorX, 4 * scaleFactorY);

      // Sponsor decal
      const decalShift = yawShift * 0.3 + rollShift * 0.4;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-carW * 0.12 + decalShift, -carH * 0.12, carW * 0.24, 7 * scaleFactorY);
      ctx.font = `bold ${5.5 * scaleFactorY}px "JetBrains Mono", monospace`;
      ctx.fillStyle = "#000000";
      ctx.textAlign = "center";
      ctx.fillText("Marlboro", decalShift, -carH * 0.12 + 4.5 * scaleFactorY);

      // Sidepods base
      ctx.fillStyle = "#121215";
      ctx.fillRect(-carW * 0.34, carH * 0.15, carW * 0.68, 8 * scaleFactorY);
      ctx.fillStyle = "#9dff00";
      ctx.fillRect(-carW * 0.34, carH * 0.05, 12 * scaleFactorX, 6 * scaleFactorY);
      ctx.fillRect(carW * 0.34 - 12 * scaleFactorX, carH * 0.05, 12 * scaleFactorX, 6 * scaleFactorY);

      // REAR WING ASSEMBLY
      const wingW = carW * 0.88;
      const wingH = 16 * scaleFactorY;
      const wingY = -carH * 0.64;
      // Shifted opposite for perspective yaw, but shifts outward with rollShift
      const wingX = -yawShift * 0.4 + rollShift * 1.0;

      // Vertical Endplates
      ctx.fillStyle = "#9dff00";
      ctx.beginPath();
      ctx.roundRect(-wingW / 2 + wingX, wingY - 8 * scaleFactorY, 5 * scaleFactorX, wingH + 12 * scaleFactorY, 2 * scaleFactorX);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(wingW / 2 - 5 * scaleFactorX + wingX, wingY - 8 * scaleFactorY, 5 * scaleFactorX, wingH + 12 * scaleFactorY, 2 * scaleFactorX);
      ctx.fill();

      // Endplates aero slots
      ctx.fillStyle = "#0c0c0e";
      ctx.fillRect(-wingW / 2 + 1 * scaleFactorX + wingX, wingY + 4 * scaleFactorY, 3 * scaleFactorX, 1.5 * scaleFactorY);
      ctx.fillRect(-wingW / 2 + 1 * scaleFactorX + wingX, wingY + 7 * scaleFactorY, 3 * scaleFactorX, 1.5 * scaleFactorY);
      ctx.fillRect(wingW / 2 - 4 * scaleFactorX + wingX, wingY + 4 * scaleFactorY, 3 * scaleFactorX, 1.5 * scaleFactorY);
      ctx.fillRect(wingW / 2 - 4 * scaleFactorX + wingX, wingY + 7 * scaleFactorY, 3 * scaleFactorX, 1.5 * scaleFactorY);

      // Support pillars
      ctx.fillStyle = "#141418";
      ctx.fillRect(-14 * scaleFactorX + wingX, wingY + 4 * scaleFactorY, 3 * scaleFactorX, -wingY + carH * 0.1);
      ctx.fillRect(11 * scaleFactorX + wingX, wingY + 4 * scaleFactorY, 3 * scaleFactorX, -wingY + carH * 0.1);

      // DRS Actuator
      ctx.fillStyle = "#1e1e24";
      ctx.fillRect(-4 * scaleFactorX + wingX, wingY - 8 * scaleFactorY, 8 * scaleFactorX, 8 * scaleFactorY);

      // Horizontal Flaps
      ctx.fillStyle = "#121215";
      ctx.fillRect(-wingW / 2 + 5 * scaleFactorX + wingX, wingY - 5 * scaleFactorY, wingW - 10 * scaleFactorX, 5 * scaleFactorY);
      ctx.fillRect(-wingW / 2 + 5 * scaleFactorX + wingX, wingY + 1 * scaleFactorY, wingW - 10 * scaleFactorX, 4 * scaleFactorY);

      // Wing sponsor print
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${6.5 * scaleFactorY}px "JetBrains Mono", sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("APEXION", wingX, wingY - 2 * scaleFactorY);

      // Exhaust tailpipe
      ctx.fillStyle = "#26262b";
      ctx.fillRect(-5 * scaleFactorX, carH * 0.18, 10 * scaleFactorX, 6 * scaleFactorY);
      ctx.fillStyle = "#0d0d0f";
      ctx.beginPath();
      ctx.arc(0, carH * 0.24, 3 * scaleFactorX, 0, Math.PI * 2);
      ctx.fill();

      // Flashing rear rain safety LED light (high performance alpha overlay glow)
      if (now % 200 < 100) {
        // Outer glow
        ctx.fillStyle = "rgba(255, 0, 0, 0.4)";
        ctx.beginPath();
        ctx.arc(0, carH * 0.12, 9 * scaleFactorX, 0, Math.PI * 2);
        ctx.fill();

        // Bright core
        ctx.fillStyle = "#ff1111";
        ctx.beginPath();
        ctx.arc(0, carH * 0.12, 4.5 * scaleFactorX, 0, Math.PI * 2);
        ctx.fill();
      }

      // Exhaust fire flare
      if (state.throttle > 15 && state.speed > 5) {
        const fireW = (8 + (state.throttle * 0.12) * (Math.sin(now * 0.18) * 0.35 + 1.0)) * scaleFactorX;
        const exhaustGlow = ctx.createRadialGradient(0, carH * 0.24, 1, 0, carH * 0.24, fireW);
        exhaustGlow.addColorStop(0, "#ffffff");
        exhaustGlow.addColorStop(0.2, "#ffcc00");
        exhaustGlow.addColorStop(0.6, "#ff3300");
        exhaustGlow.addColorStop(1, "rgba(255, 50, 0, 0)");
        ctx.fillStyle = exhaustGlow;
        ctx.beginPath();
        ctx.arc(0, carH * 0.24, fireW, 0, Math.PI * 2);
        ctx.fill();
      }

      // Orange sparks at high speeds or bumpy crests
      if (state.speed > 220 && Math.random() < 0.45) {
        for (let j = 0; j < 8; j++) {
          const sparkX = (Math.random() - 0.5) * 35 * scaleFactorX;
          const sparkY = carH * 0.25 + Math.random() * 10 * scaleFactorY;
          const sparkLength = (5 + Math.random() * 15) * scaleFactorX;
          const angle = Math.PI / 2 + (Math.random() - 0.5) * 0.45;
          
          ctx.strokeStyle = Math.random() > 0.5 ? "#ff5500" : "#ffcc00";
          ctx.lineWidth = 1.5 * scaleFactorX;
          ctx.beginPath();
          ctx.moveTo(sparkX, sparkY);
          ctx.lineTo(sparkX + Math.cos(angle) * sparkLength, sparkY + Math.sin(angle) * sparkLength);
          ctx.stroke();
        }
      }

      // Tire smoke on heavy cornering
      if (Math.abs(state.steering) > 0.6 && state.speed > 80) {
        ctx.fillStyle = "rgba(220, 220, 220, 0.35)";
        for (let s = 0; s < 3; s++) {
          const smokeR = (5 + Math.random() * 10) * scaleFactorX;
          ctx.beginPath();
          ctx.arc(
            leftTyreX + tyreW / 2 + (Math.random() - 0.5) * 15 * scaleFactorX,
            tyreY + tyreH * 0.9 + (Math.random() - 0.5) * 10 * scaleFactorY,
            smokeR, 0, Math.PI * 2
          );
          ctx.fill();
          ctx.beginPath();
          ctx.arc(
            rightTyreX + tyreW / 2 + (Math.random() - 0.5) * 15 * scaleFactorX,
            tyreY + tyreH * 0.9 + (Math.random() - 0.5) * 10 * scaleFactorY,
            smokeR, 0, Math.PI * 2
          );
          ctx.fill();
        }
      }

      // Glowing red wing brake lights (high performance alpha overlay glow)
      if (state.brake > 0) {
        // Left light glow
        ctx.fillStyle = "rgba(255, 0, 0, 0.4)";
        ctx.fillRect(-wingW / 2 - 2 * scaleFactorX, wingY - 9 * scaleFactorY, 9 * scaleFactorX, 14 * scaleFactorY);
        // Right light glow
        ctx.fillRect(wingW / 2 - 7 * scaleFactorX, wingY - 9 * scaleFactorY, 9 * scaleFactorX, 14 * scaleFactorY);

        // Core bright lights
        ctx.fillStyle = "#ff1111";
        ctx.fillRect(-wingW / 2 + 1 * scaleFactorX, wingY - 6 * scaleFactorY, 3 * scaleFactorX, 8 * scaleFactorY);
        ctx.fillRect(wingW / 2 - 4 * scaleFactorX, wingY - 6 * scaleFactorY, 3 * scaleFactorX, 8 * scaleFactorY);
      }

      ctx.restore(); // Restore car translation & rotation
      ctx.restore(); // Restore camera shake translation

      // ==========================================
      // 3.5. DRAW RETRO HUD OVERLAYS (EXACTLY MATCHING USER SCREENSHOT)
      // ==========================================
      
      // HUD Box (Top Left)
      const hudX = 20 * scaleFactorX;
      const hudY = 20 * scaleFactorY;
      const hudW = 200 * scaleFactorX;
      const hudH = 105 * scaleFactorY;

      // Dark semi-transparent background
      ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 1.5;
      ctx.fillRect(hudX, hudY, hudW, hudH);
      ctx.strokeRect(hudX, hudY, hudW, hudH);

      // Text styling
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.font = `bold ${9.5 * scaleFactorY}px "JetBrains Mono", monospace`;
      
      const textX = hudX + 12 * scaleFactorX;
      const startTextY = hudY + 14 * scaleFactorY;
      const lineHeight = 16 * scaleFactorY;

      // SPEED
      ctx.fillStyle = "#00ff66";
      ctx.fillText("SPEED:", textX, startTextY);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(`${Math.round(state.speed)} km/h`, textX + 55 * scaleFactorX, startTextY);

      // GEAR
      ctx.fillStyle = "#00ff66";
      ctx.fillText("GEAR:", textX, startTextY + lineHeight);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(state.gear.toString(), textX + 55 * scaleFactorX, startTextY + lineHeight);

      // RPM
      ctx.fillStyle = "#00ff66";
      ctx.fillText("RPM:", textX, startTextY + 2 * lineHeight);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(Math.round(state.rpm).toLocaleString(), textX + 55 * scaleFactorX, startTextY + 2 * lineHeight);

      // LAP
      ctx.fillStyle = "#00ff66";
      ctx.fillText("LAP:", textX, startTextY + 3 * lineHeight);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(`${state.lap}/10`, textX + 55 * scaleFactorX, startTextY + 3 * lineHeight);

      // TIME
      ctx.fillStyle = "#00ff66";
      ctx.fillText("TIME:", textX, startTextY + 4 * lineHeight);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(formatSimTime(state.simTime), textX + 55 * scaleFactorX, startTextY + 4 * lineHeight);

      // RPM Segmented Bar
      const rpmBarX = hudX + 12 * scaleFactorX;
      const rpmBarY = hudY + hudH - 12 * scaleFactorY;
      const rpmBarW = hudW - 24 * scaleFactorX;
      const rpmBarH = 5 * scaleFactorY;
      
      ctx.fillStyle = "#1e1e24";
      ctx.fillRect(rpmBarX, rpmBarY, rpmBarW, rpmBarH);
      
      const rpmPct = Math.max(0, Math.min(1, (state.rpm - 3000) / 10800));
      const filledW = rpmBarW * rpmPct;
      
      const grad = ctx.createLinearGradient(rpmBarX, 0, rpmBarX + rpmBarW, 0);
      grad.addColorStop(0, "#00ff66");
      grad.addColorStop(0.6, "#00ff66");
      grad.addColorStop(0.8, "#ffd000");
      grad.addColorStop(0.95, "#ff3300");
      grad.addColorStop(1, "#0055ff");
      
      ctx.fillStyle = grad;
      ctx.fillRect(rpmBarX, rpmBarY, filledW, rpmBarH);

      ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
      ctx.lineWidth = 1 * scaleFactorX;
      const ticks = 15;
      for (let t = 1; t < ticks; t++) {
        const tx = rpmBarX + (rpmBarW / ticks) * t;
        ctx.beginPath();
        ctx.moveTo(tx, rpmBarY);
        ctx.lineTo(tx, rpmBarY + rpmBarH);
        ctx.stroke();
      }

      // TOP-RIGHT LARGE LAP INDICATOR (like screenshot)
      ctx.textAlign = "right";
      ctx.font = `bold ${11 * scaleFactorY}px "JetBrains Mono", monospace`;
      ctx.fillStyle = "#00ff66";
      ctx.fillText("LAP", width - 20 * scaleFactorX, 26 * scaleFactorY);
      
      ctx.font = `bold ${32 * scaleFactorY}px "Orbitron", sans-serif`;
      ctx.fillStyle = "#ffffff";
      ctx.fillText(state.lap.toString(), width - 20 * scaleFactorX, 56 * scaleFactorY);

      // BOTTOM-RIGHT LAP & TIMER DETAILS (like screenshot)
      ctx.textAlign = "right";
      ctx.font = `bold ${11 * scaleFactorY}px "JetBrains Mono", monospace`;
      ctx.fillStyle = "#00ff66";
      ctx.fillText(`LAP ${state.lap}`, width - 20 * scaleFactorX, height - 36 * scaleFactorY);
      
      ctx.font = `bold ${16 * scaleFactorY}px "Orbitron", sans-serif`;
      ctx.fillStyle = "#ffffff";
      const runningLapTime = state.simTime - (state.lapStartTime || 0);
      ctx.fillText(formatLapTime(runningLapTime), width - 20 * scaleFactorX, height - 16 * scaleFactorY);

      // BOTTOM-LEFT TRACK MINIMAP (like screenshot)
      const mapW = 65 * scaleFactorX;
      const mapH = 65 * scaleFactorY;
      const mapX = 20 * scaleFactorX;
      const mapY = height - mapH - 20 * scaleFactorY;

      // Draw shadow background for minimap
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.fillRect(mapX - 5 * scaleFactorX, mapY - 5 * scaleFactorY, mapW + 10 * scaleFactorX, mapH + 10 * scaleFactorY);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.lineWidth = 5 * scaleFactorX;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      
      const activePath = trackId === "monaco" ? monacoPath : silverstonePath;
      
      activePath.forEach((pt, idx) => {
        const px = mapX + pt.x * mapW;
        const py = mapY + pt.y * mapH;
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.stroke();

      // Sharp white line on top
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5 * scaleFactorX;
      ctx.stroke();

      // Interpolate car progress
      const carProgress = (state.position / state.trackLength) % 1;
      const carDot = getPointOnPath(activePath, carProgress);
      const dotX = mapX + carDot.x * mapW;
      const dotY = mapY + carDot.y * mapH;

      // Pulse ring
      const pulseSize = (4 + Math.sin(now * 0.015) * 2) * scaleFactorX;
      ctx.fillStyle = "rgba(225, 6, 0, 0.4)";
      ctx.beginPath();
      ctx.arc(dotX, dotY, pulseSize, 0, Math.PI * 2);
      ctx.fill();

      // Inner blinking core
      ctx.fillStyle = now % 300 < 150 ? "#e10600" : "#ffd000";
      ctx.beginPath();
      ctx.arc(dotX, dotY, 2.5 * scaleFactorX, 0, Math.PI * 2);
      ctx.fill();

      // 4. TELEMETRY TRANSMISSION (throttled to 2Hz / every 500ms to resolve React re-render lag)
      telemetryTimer += dt;
      if (telemetryTimer >= 0.5) {
        telemetryTimer = 0;
        
        const gForceLong = accel / 9.81;
        const lateralCurvature = currentSeg.curve * 0.05;
        const gForceLat = (state.speed * (1000 / 360)) * (state.speed * (1000 / 360)) * (lateralCurvature / 1000);

        onTelemetryUpdate({
          time: Math.round(state.simTime),
          lap: state.lap,
          speed: Math.round(state.speed),
          rpm: Math.round(state.rpm),
          gear: state.gear,
          throttle: Math.round(state.throttle),
          brake: Math.round(state.brake),
          steering_angle: Math.round(state.steering * 28),
          tyre_wear: state.tyreWear.map(w => parseFloat(w.toFixed(1))),
          tyre_temp: state.tyreTemp.map(t => parseFloat(t.toFixed(1))),
          fuel: parseFloat(state.fuel.toFixed(1)),
          engine_temp: Math.round(92 + (state.rpm * 0.001) + (state.speed * 0.02)),
          brake_temp: Math.round(250 + (state.brake * 3.5)),
          g_force_long: parseFloat(gForceLong.toFixed(2)),
          g_force_lat: parseFloat(gForceLat.toFixed(2)),
          session_info: {
            race_name: "Apexion F1 Live Simulator",
            track: trackId === "monaco" ? "Circuit de Monaco" : "Silverstone Circuit",
            weather: trackId === "monaco" ? "Light Rain" : "Dry",
            track_temp: trackId === "monaco" ? 22.0 : 38.5,
          }
        });
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [isRunning, trackId]);

  const resetSimulator = () => {
    stateRef.current.position = 0;
    stateRef.current.speed = 0;
    stateRef.current.tyreWear = [5.0, 5.0, 4.0, 4.0];
    stateRef.current.tyreTemp = [85.0, 85.0, 85.0, 85.0];
    stateRef.current.fuel = 100.0;
    stateRef.current.lap = 1;
    stateRef.current.steering = 0;
    stateRef.current.playerX = 0;
    stateRef.current.skyOffset = 0;
    stateRef.current.simTime = 0;
  };

  useEffect(() => {
    resetSimulator();
  }, [trackId]);

  return (
    <div className="flex flex-col space-y-4">
      {/* Simulator canvas */}
      <div className="relative border border-f1-cardBorder rounded-lg overflow-hidden bg-black aspect-video max-w-full">
        <canvas 
          ref={canvasRef} 
          width={640} 
          height={360} 
          className="w-full h-full object-cover"
          style={{ imageRendering: "pixelated" }}
        />
      </div>

      {/* Simulator Controls */}
      <div className="flex justify-between items-center bg-background border border-f1-cardBorder p-3 rounded-lg font-mono text-xs">
        <div className="flex items-center space-x-3">
          {/* Track Selector */}
          <div className="flex items-center space-x-2 border-r border-f1-cardBorder pr-3">
            <span className="text-[10px] text-f1-textMuted uppercase font-bold">Track:</span>
            <select
              value={trackId}
              onChange={(e) => setTrackId(e.target.value as "silverstone" | "monaco")}
              className="bg-black border border-f1-cardBorder text-white px-2 py-1 rounded text-xs focus:outline-none focus:border-f1-red font-bold font-mono"
            >
              <option value="silverstone">Silverstone GP (Dry)</option>
              <option value="monaco">Monaco GP (Wet)</option>
            </select>
          </div>

          {/* Play/Pause */}
          <button
            onClick={() => setIsRunning(!isRunning)}
            className="bg-f1-red hover:bg-f1-darkRed text-white px-3 py-1.5 rounded transition-all font-bold"
          >
            {isRunning ? "PAUSE SIM" : "RESUME SIM"}
          </button>
          
          {/* Reset */}
          <button
            onClick={resetSimulator}
            className="border border-f1-cardBorder hover:bg-f1-card/50 text-white px-2 py-1.5 rounded transition-all flex items-center space-x-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Track</span>
          </button>

          {/* Controls instructions when in manual mode */}
          {!isAutoDrive && (
            <span className="text-[10px] text-f1-textMuted uppercase pl-3 border-l border-f1-cardBorder hidden md:inline">
              🎮 Use <strong className="text-white">W / A / S / D</strong> to drive
            </span>
          )}
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center space-x-1 bg-black/45 border border-f1-cardBorder p-1 rounded">
          <button
            onClick={() => setIsAutoDrive(true)}
            className={`px-3 py-1.5 rounded transition-all flex items-center space-x-1.5 font-bold ${
              isAutoDrive ? "bg-f1-red text-white" : "text-f1-textMuted hover:text-white"
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>AI Auto</span>
          </button>
          <button
            onClick={() => setIsAutoDrive(false)}
            className={`px-3 py-1.5 rounded transition-all flex items-center space-x-1.5 font-bold ${
              !isAutoDrive ? "bg-f1-blue text-white" : "text-f1-textMuted hover:text-white"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Manual</span>
          </button>
        </div>
      </div>
    </div>
  );
})

export default RacingSimulator;

