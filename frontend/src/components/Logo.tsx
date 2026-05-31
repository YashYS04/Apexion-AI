"use client";

import React from "react";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export default function Logo({ className = "", size = "md" }: LogoProps) {
  const dimensions = {
    sm: { width: 22, height: 22, strokeWidth: 8, glow: false },
    md: { width: 32, height: 32, strokeWidth: 7, glow: false },
    lg: { width: 90, height: 90, strokeWidth: 5, glow: true },
  };

  const config = dimensions[size];

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Ambient background glow for large hero version */}
      {config.glow && (
        <div className="absolute inset-0 bg-f1-red/15 rounded-full filter blur-2xl animate-pulse pointer-events-none" />
      )}
      
      <svg
        width={config.width}
        height={config.height}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="select-none"
      >
        <defs>
          {/* High-Contrast Midnight Emerald Gradient */}
          <linearGradient id="apexRedGrad" x1="20" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#7FFFD4" />
            <stop offset="100%" stopColor="#00C389" />
          </linearGradient>

          {/* High-Contrast Telemetry Mint Gradient */}
          <linearGradient id="telemetryBlueGrad" x1="80" y1="20" x2="20" y2="80" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#7FFFD4" />
            <stop offset="100%" stopColor="#008c5c" />
          </linearGradient>

          {/* Intense Neon Glow Filter (Used only for large presentation) */}
          <filter id="neonGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Orbit Telemetry Rings (Pulsing and rotating) */}
        <circle
          cx="50"
          cy="50"
          r="42"
          stroke="url(#telemetryBlueGrad)"
          strokeWidth="2.5"
          strokeDasharray="6 8"
          strokeOpacity={config.glow ? "0.6" : "0.4"}
          className={`origin-center ${config.glow ? "animate-spin-slow" : ""}`}
        />

        {/* Sweeping Neon Telemetry Racing Curve */}
        <path
          d="M 12 78 C 28 45, 52 30, 88 22"
          stroke="url(#telemetryBlueGrad)"
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
          filter={config.glow ? "url(#neonGlow)" : undefined}
          className="opacity-95"
        />

        {/* The Delta Apex Chevron (Vibrant Red-Orange, high-contrast) */}
        <path
          d="M 50 15 L 84 76 L 68 76 L 50 40 L 32 76 L 16 76 Z"
          fill="url(#apexRedGrad)"
          filter={config.glow ? "url(#neonGlow)" : undefined}
          stroke="#ffffff"
          strokeWidth={config.glow ? "0.5" : "1.8"}
          strokeLinejoin="round"
        />

        {/* Bright White Central Core Node (representing vertex apex/core AI) */}
        <circle
          cx="50"
          cy="50"
          r="5.5"
          fill="#ffffff"
          stroke="#7FFFD4"
          strokeWidth="1.8"
          filter={config.glow ? "url(#neonGlow)" : undefined}
        />
      </svg>
    </div>
  );
}
