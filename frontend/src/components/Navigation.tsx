"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Home, 
  Activity, 
  Cpu, 
  MessageSquare, 
  History, 
  BookOpen, 
  Terminal,
  Menu,
  X
} from "lucide-react";
import Logo from "./Logo";

export default function Navigation() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [time, setTime] = useState("");

  // F1 pit wall clock
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      const hrs = String(d.getUTCHours()).padStart(2, '0');
      const mins = String(d.getUTCMinutes()).padStart(2, '0');
      const secs = String(d.getUTCSeconds()).padStart(2, '0');
      setTime(`${hrs}:${mins}:${secs} UTC`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { label: "Engineering Deck", href: "/", icon: Home },
    { label: "Live Telemetry", href: "/dashboard", icon: Activity },
    { label: "Strategy Simulator", href: "/simulator", icon: Cpu },
    { label: "AI Race Copilot", href: "/copilot", icon: MessageSquare },
    { label: "Race Replay", href: "/replay", icon: History },
    { label: "Regulations RAG", href: "/docs", icon: BookOpen },
  ];

  return (
    <>
      {/* Mobile Nav Header */}
      <div className="md:hidden w-full bg-f1-card border-b border-f1-cardBorder p-4 flex justify-between items-center z-30">
        <Link href="/" className="flex items-center space-x-2">
          <Logo size="sm" />
          <span className="font-extrabold text-sm tracking-wider uppercase f1-font-telemetry">
            APEXION <span className="text-f1-red">AI</span>
          </span>
        </Link>
        <button onClick={() => setIsOpen(!isOpen)} className="text-white">
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <nav className={`
        fixed inset-y-0 left-0 transform ${isOpen ? "translate-x-0" : "-translate-x-full"}
        md:relative md:translate-x-0 transition-transform duration-300 ease-in-out
        w-64 bg-f1-card border-r border-f1-cardBorder flex flex-col justify-between z-40
        min-h-screen pt-16 md:pt-0
      `}>
        <div className="px-6 py-6">
          {/* Logo Section */}
          <div className="hidden md:flex items-center space-x-2 mb-10 group cursor-pointer">
            <Logo size="md" className="transition-transform duration-300 group-hover:scale-105" />
            <span className="font-black text-lg tracking-wider uppercase f1-font-telemetry group-hover:text-f1-red transition-colors duration-300">
              APEXION <span className="text-f1-red group-hover:text-white transition-colors duration-300">AI</span>
            </span>
          </div>

          {/* Nav Items */}
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`
                    relative flex items-center space-x-3 px-4 py-3 rounded-md text-sm font-medium transition-all duration-200 group
                    ${isActive 
                      ? "text-f1-red bg-f1-red/5 font-semibold" 
                      : "text-f1-textMuted hover:text-white"
                    }
                  `}
                >
                  {/* Sliding active left bar */}
                  {isActive && (
                    <motion.div
                      layoutId="activeNavIndicator"
                      className="absolute left-0 top-2 bottom-2 w-0.5 bg-f1-red rounded-r"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}

                  {/* Hover bg pill */}
                  <div className="absolute inset-0 rounded-md bg-f1-card/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none -z-10" />

                  <Icon className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 ${isActive ? "text-f1-red" : "text-f1-textMuted group-hover:text-white"}`} />
                  <span className="font-mono transition-transform duration-200 group-hover:translate-x-1">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Footer clock */}
        <div className="p-6 border-t border-f1-cardBorder bg-background flex flex-col space-y-2">
          <div className="text-[10px] text-f1-textMuted uppercase font-mono tracking-widest">
            PIT-WALL LOCAL TIME
          </div>
          <div className="text-lg font-bold text-white font-mono f1-font-telemetry neon-text-red">
            {time || "00:00:00 UTC"}
          </div>
          <div className="text-[9px] text-f1-textMuted font-mono">
            VER: 1.0.2 // GRANITE ENGINE
          </div>
        </div>
      </nav>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
