"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { 
  Activity, 
  Cpu, 
  MessageSquare, 
  History, 
  BookOpen, 
  Gauge, 
  Wind, 
  Droplet, 
  Sun,
  ShieldAlert
} from "lucide-react";
import Logo from "../components/Logo";

export default function Home() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  const dashboardFeatures = [
    {
      title: "Live Telemetry Dashboard",
      description: "Real-time pit-wall interface showing vehicle speeds, engine RPM, throttle/brake inputs, and carcass temperature heatmaps.",
      href: "/dashboard",
      icon: Activity,
      color: "text-f1-red",
      borderColor: "border-f1-red/20 hover:border-f1-red"
    },
    {
      title: "Strategy Time Machine",
      description: "Interactive tyre compound and pit stop planner. Simulate alternate race outcomes, position gains, and tyre degradation curves.",
      href: "/simulator",
      icon: Cpu,
      color: "text-f1-yellow",
      borderColor: "border-f1-yellow/20 hover:border-f1-yellow"
    },
    {
      title: "AI Race Engineer Copilot",
      description: "WatsonX IBM Granite-powered expert reasoning. Get radio updates in simplified Fan Mode or high-fidelity Engineering Mode.",
      href: "/copilot",
      icon: MessageSquare,
      color: "text-f1-blue",
      borderColor: "border-f1-blue/20 hover:border-f1-blue"
    },
    {
      title: "Historical Replays",
      description: "Load telemetry logs from famous Grand Prix battles: Hamilton's Silverstone puncture, Monaco tyre strategy chaos.",
      href: "/replay",
      icon: History,
      color: "text-f1-green",
      borderColor: "border-f1-green/20 hover:border-f1-green"
    }
  ];

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 max-w-7xl mx-auto"
    >
      {/* Hero Welcome banner */}
      <motion.div 
        variants={itemVariants}
        className="relative overflow-hidden rounded-xl border border-f1-cardBorder bg-gradient-to-r from-f1-card via-f1-card/95 to-background p-6 md:p-10 flex flex-col md:flex-row justify-between items-center gap-6"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-f1-red/5 rounded-full filter blur-3xl -mr-20 -mt-20 pointer-events-none" />
        
        <div className="max-w-2xl space-y-4">
          <span className="inline-block bg-f1-red/10 border border-f1-red/30 text-f1-red text-xs px-3 py-1 rounded-full font-mono uppercase tracking-widest">
            F1 Pit-Wall Decision Support
          </span>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight f1-font-telemetry">
            APEXION <span className="text-f1-red">AI</span>
          </h1>
          <p className="text-f1-textMuted text-base md:text-lg leading-relaxed">
            Welcome to the explainable AI Race Engineering cockpit. Run real-time physics simulations, 
            analyse compound degradation curves, and query regulations using an intelligent retrieval agent.
          </p>
          <div className="pt-2 flex flex-wrap gap-4">
            <Link 
              href="/dashboard"
              className="bg-f1-red hover:bg-f1-darkRed text-white font-semibold text-sm px-6 py-3 rounded-md transition-colors"
            >
              Access Telemetry Deck
            </Link>
            <Link 
              href="/simulator"
              className="border border-f1-cardBorder hover:bg-f1-card/50 text-white font-semibold text-sm px-6 py-3 rounded-md transition-colors"
            >
              Open Simulator
            </Link>
          </div>
        </div>

        {/* Large glowing Logo */}
        <div className="shrink-0 md:mr-6 relative">
          <Logo size="lg" className="animate-pulse duration-[4000ms]" />
        </div>
      </motion.div>

      {/* Environmental & Track Conditions */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="f1-panel p-4 flex items-center space-x-4">
          <Sun className="w-8 h-8 text-f1-yellow" />
          <div>
            <div className="text-xs text-f1-textMuted uppercase font-mono">Track Temp</div>
            <div className="text-lg font-bold font-mono f1-font-telemetry">38.5 °C</div>
          </div>
        </div>
        <div className="f1-panel p-4 flex items-center space-x-4">
          <Wind className="w-8 h-8 text-f1-blue" />
          <div>
            <div className="text-xs text-f1-textMuted uppercase font-mono">Wind Speed</div>
            <div className="text-lg font-bold font-mono f1-font-telemetry">12.4 km/h</div>
          </div>
        </div>
        <div className="f1-panel p-4 flex items-center space-x-4">
          <Droplet className="w-8 h-8 text-f1-blue" />
          <div>
            <div className="text-xs text-f1-textMuted uppercase font-mono">Air Humidity</div>
            <div className="text-lg font-bold font-mono f1-font-telemetry">42.0 %</div>
          </div>
        </div>
        <div className="f1-panel p-4 flex items-center space-x-4">
          <ShieldAlert className="w-8 h-8 text-f1-red animate-pulse" />
          <div>
            <div className="text-xs text-f1-textMuted uppercase font-mono">Grip Index</div>
            <div className="text-lg font-bold font-mono f1-font-telemetry text-f1-green">OPTIMAL</div>
          </div>
        </div>
      </motion.div>

      {/* Core Features Navigation Grid */}
      <motion.div variants={itemVariants} className="space-y-4">
        <h2 className="text-xl font-bold uppercase tracking-wider font-mono text-f1-textMuted">
          ENGINEERING OPERATIONS
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {dashboardFeatures.map((feat) => {
            const Icon = feat.icon;
            return (
              <motion.div
                key={feat.href}
                whileHover={{ y: -4 }}
                className={`f1-panel p-6 border ${feat.borderColor} transition-colors flex flex-col justify-between`}
              >
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-f1-card rounded-md border border-f1-cardBorder">
                      <Icon className={`w-6 h-6 ${feat.color}`} />
                    </div>
                    <h3 className="text-lg font-bold uppercase font-mono">{feat.title}</h3>
                  </div>
                  <p className="text-sm text-f1-textMuted leading-relaxed">
                    {feat.description}
                  </p>
                </div>
                <div className="pt-6 flex justify-end">
                  <Link 
                    href={feat.href}
                    className="text-xs font-bold font-mono uppercase text-f1-red hover:underline flex items-center space-x-1"
                  >
                    <span>Launch Module</span>
                    <span>&rarr;</span>
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Quick FIA Reg RAG Panel */}
      <motion.div 
        variants={itemVariants}
        className="f1-panel p-6 border border-f1-cardBorder flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
      >
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-f1-blue" />
            <h3 className="text-md font-bold uppercase font-mono">Sporting & Technical Regulations RAG</h3>
          </div>
          <p className="text-sm text-f1-textMuted max-w-3xl">
            Docling processes the latest sporting directives directly into our local semantic index. Ask our AI engineer copilot 
            questions about double yellow flags, tyre compound usage rules, or VSC pit lane guidelines.
          </p>
        </div>
        <Link 
          href="/docs"
          className="border border-f1-blue/30 hover:border-f1-blue text-f1-blue bg-f1-blue/5 text-xs font-bold font-mono uppercase px-4 py-2.5 rounded transition-all whitespace-nowrap"
        >
          Check Regulations Database
        </Link>
      </motion.div>
    </motion.div>
  );
}
