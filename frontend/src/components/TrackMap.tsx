"use client";

import React, { useRef, useState, useEffect } from "react";
import { Compass, Flag, Map } from "lucide-react";

interface TrackMapProps {
  distance: number;
  sessionKey: string;
}

interface CornerLabel {
  name: string;
  progressRange: [number, number];
}

const SILVERSTONE_CORNERS: CornerLabel[] = [
  { name: "Abbey & Farm Straight", progressRange: [0.0, 0.15] },
  { name: "Village & Loop", progressRange: [0.15, 0.25] },
  { name: "Wellington Straight", progressRange: [0.25, 0.38] },
  { name: "Luffield & Woodcote", progressRange: [0.38, 0.50] },
  { name: "Copse Corner", progressRange: [0.50, 0.62] },
  { name: "Maggots & Becketts S-Curves", progressRange: [0.62, 0.75] },
  { name: "Hangar Straight & Stowe", progressRange: [0.75, 0.88] },
  { name: "Vale & Club Corner", progressRange: [0.88, 1.0] },
];

const MONACO_CORNERS: CornerLabel[] = [
  { name: "Sainte Devote (Turn 1)", progressRange: [0.0, 0.12] },
  { name: "Beau Rivage Hill", progressRange: [0.12, 0.24] },
  { name: "Massenet & Casino Square", progressRange: [0.24, 0.38] },
  { name: "Grand Hotel Hairpin", progressRange: [0.38, 0.50] },
  { name: "Portier & The Tunnel", progressRange: [0.50, 0.65] },
  { name: "Nouvelle Chicane & Tabac", progressRange: [0.65, 0.80] },
  { name: "Swimming Pool chicane", progressRange: [0.80, 0.90] },
  { name: "La Rascasse & Pit Entry", progressRange: [0.90, 1.0] },
];

export default function TrackMap({ distance, sessionKey }: TrackMapProps) {
  const pathRef = useRef<SVGPathElement | null>(null);
  const [dotPos, setDotPos] = useState({ x: 50, y: 150 });
  const [currentSector, setCurrentSector] = useState("Hamilton Straight");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isMonaco = sessionKey === "monaco_2022";
  const lapLength = isMonaco ? 3337 : 5891; // Monaco is ~3.3km, Silverstone is ~5.9km

  // SVG Paths
  // Silverstone: Stylized loop inside 400x300 viewBox
  const silverstonePath = `
    M 50 150 
    C 55 100, 100 40, 180 30 
    C 230 25, 270 40, 270 70 
    C 270 95, 220 120, 200 140
    C 170 170, 240 210, 310 180
    C 360 160, 375 220, 320 260 
    C 280 290, 230 260, 180 260 
    C 130 260, 60 250, 50 150 Z
  `;

  // Monaco: Stylized twisty layout inside 400x300 viewBox
  const monacoPath = `
    M 40 200
    C 40 140, 80 80, 160 80
    C 195 80, 210 110, 220 130
    C 230 150, 260 140, 280 100
    C 300 60, 340 70, 350 110
    C 360 160, 330 190, 280 200
    C 240 210, 250 250, 210 260
    C 160 270, 140 210, 100 210
    C 60 210, 40 230, 40 200 Z
  `;

  const activePath = isMonaco ? monacoPath : silverstonePath;
  const currentCorners = isMonaco ? MONACO_CORNERS : SILVERSTONE_CORNERS;

  useEffect(() => {
    if (!mounted || !pathRef.current) return;

    try {
      const path = pathRef.current;
      const totalLength = path.getTotalLength();
      
      // Calculate lap progress percentage [0.0 - 1.0]
      const progress = (distance % lapLength) / lapLength;
      
      // Get point along SVG path
      const point = path.getPointAtLength(progress * totalLength);
      setDotPos({ x: point.x, y: point.y });

      // Determine corner label
      const activeCorner = currentCorners.find(
        (c) => progress >= c.progressRange[0] && progress < c.progressRange[1]
      );
      if (activeCorner) {
        setCurrentSector(activeCorner.name);
      }
    } catch (err) {
      console.error("Error calculating track path position:", err);
    }
  }, [distance, isMonaco, lapLength, mounted, activePath]);

  if (!mounted) {
    return <div className="h-48 w-full bg-f1-card/30 animate-pulse border border-f1-cardBorder rounded" />;
  }

  return (
    <div className="f1-panel p-5 space-y-4 flex flex-col justify-between relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-f1-red/5 rounded-full filter blur-xl pointer-events-none" />
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-f1-cardBorder pb-2">
        <div className="flex items-center space-x-2">
          <Map className="w-4 h-4 text-f1-red" />
          <h4 className="text-xs font-bold uppercase font-mono tracking-wider">
            2D Track Position Map
          </h4>
        </div>
        <div className="flex items-center space-x-1.5 text-[10px] font-mono text-f1-textMuted bg-black/30 px-2 py-0.5 rounded border border-f1-cardBorder">
          <Compass className="w-3.5 h-3.5 text-f1-yellow animate-spin-slow" />
          <span className="uppercase">{isMonaco ? "Monaco Layout" : "Silverstone Layout"}</span>
        </div>
      </div>

      {/* SVG Canvas Map */}
      <div className="relative flex-1 h-44 w-full flex items-center justify-center bg-black/20 rounded border border-f1-cardBorder/30">
        <svg 
          viewBox="0 0 400 300" 
          className="w-full h-full p-2 max-w-[280px] md:max-w-none"
        >
          {/* Main Track Gray Outline */}
          <path
            d={activePath}
            fill="none"
            stroke="#1d1d27"
            strokeWidth="18"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Main Track Accent Overlay */}
          <path
            ref={pathRef}
            d={activePath}
            fill="none"
            stroke="#2d2d3d"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-all duration-300"
          />

          {/* Start / Finish line indicator */}
          <g transform={`translate(${isMonaco ? "40, 200" : "50, 150"})`}>
            <line x1="-12" y1="0" x2="12" y2="0" stroke="#fff" strokeWidth="2.5" />
            <line x1="-12" y1="-4" x2="12" y2="-4" stroke="#fff" strokeWidth="1" strokeDasharray="2 2" />
          </g>

          {/* Car dot position indicator */}
          <circle
            cx={dotPos.x}
            cy={dotPos.y}
            r="8"
            fill="#9dff00"
            className="neon-glow-green animate-pulse"
          />
          <circle
            cx={dotPos.x}
            cy={dotPos.y}
            r="4"
            fill="#fff"
          />
        </svg>
      </div>

      {/* Live Sector Dashboard */}
      <div className="bg-black/30 border border-f1-cardBorder rounded p-3 flex justify-between items-center text-xs font-mono">
        <div>
          <span className="text-[10px] text-f1-textMuted uppercase block">Current Sector</span>
          <span className="font-bold text-white uppercase text-sm truncate max-w-[170px] inline-block mt-0.5">
            {currentSector}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-f1-textMuted uppercase block">Telemetry Pos</span>
          <span className="font-bold text-f1-yellow text-sm mt-0.5 inline-block">
            {Math.round(distance % lapLength)}m <span className="text-xs text-f1-textMuted">/ {lapLength}m</span>
          </span>
        </div>
      </div>
    </div>
  );
}
