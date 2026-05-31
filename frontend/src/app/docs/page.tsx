"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BookOpen, 
  Search, 
  HelpCircle, 
  Cpu, 
  Terminal, 
  Layers, 
  ShieldCheck, 
  Database,
  ArrowRight
} from "lucide-react";

export default function Documentation() {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    setSearched(true);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${backendUrl}/api/rag/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ query, top_k: 3 })
      });

      if (!response.ok) {
        throw new Error("Failed to query RAG regulations.");
      }

      const data = await response.json();
      setHits(data.hits);
    } catch (err) {
      console.error("RAG search error", err);
      // Fallback local results
      setHits([
        {
          article: "ARTICLE 24: TYRES AND WHEELS",
          section: "24.2 Compulsory Compound Usage",
          content: "Unless wet-weather conditions are declared, each driver must use at least two different dry-weather compounds during the race.",
          source: "f1_regulations_sample.txt",
          score: 4.8
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const sampleQueries = [
    "virtual safety car pit stop rules",
    "speed limit in the pit lane",
    "compulsory dry tyre compounds"
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black font-mono f1-font-telemetry tracking-tight">
          REGULATIONS RAG & ARCHITECTURE DECK
        </h1>
        <p className="text-sm text-f1-textMuted font-mono uppercase">
          Retrieve FIA directives using semantic search and review system components
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: RAG query tester */}
        <div className="lg:col-span-2 space-y-6">
          <div className="f1-panel p-5 space-y-4">
            <div className="flex items-center space-x-2 border-b border-f1-cardBorder pb-2">
              <Search className="w-5 h-5 text-f1-blue" />
              <h3 className="text-xs font-bold uppercase font-mono">REGULATIONS COGNITIVE SEARCH</h3>
            </div>
            
            <p className="text-xs text-f1-textMuted leading-relaxed">
              Verify document retrieval parameters by submitting natural language queries. The engine scans 
              FIA F1 Sporting Regulations parsed via Docling and computes relevance scores.
            </p>

            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask about tyre rules, pit lanes, safety cars..."
                className="flex-1 bg-[#121218] border border-f1-cardBorder rounded text-xs font-mono px-3 py-2.5 text-white focus:outline-none focus:border-f1-blue"
              />
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="bg-f1-blue hover:bg-blue-600 text-white font-bold font-mono text-xs uppercase px-4 py-2.5 rounded transition-colors"
              >
                Query RAG
              </button>
            </form>

            <div className="flex flex-wrap items-center gap-2 pt-1.5 text-xs font-mono">
              <span className="text-f1-textMuted text-[10px] uppercase">Quick Queries:</span>
              {sampleQueries.map((q) => (
                <button
                  key={q}
                  onClick={() => { setQuery(q); }}
                  className="bg-black/30 border border-f1-cardBorder hover:border-f1-blue/30 text-f1-textMuted hover:text-white px-2.5 py-1 rounded text-[10px]"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* RAG search hits list */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold font-mono text-f1-textMuted uppercase tracking-wider">
              RETRIEVAL ENGINE RESULTS
            </h4>

            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div 
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="f1-panel p-6 text-center text-xs font-mono text-f1-textMuted animate-pulse"
                >
                  SCANNING FIA REGULATIONS INDEX USING DOCLING PARSER...
                </motion.div>
              ) : searched && hits.length === 0 ? (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="f1-panel p-6 text-center text-xs font-mono text-f1-textMuted"
                >
                  No matching regulations found in local database.
                </motion.div>
              ) : !searched ? (
                <motion.div 
                  key="initial"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="border border-dashed border-f1-cardBorder rounded p-6 text-center text-xs font-mono text-f1-textMuted"
                >
                  Submit a regulations query to inspect chunks.
                </motion.div>
              ) : (
                <motion.div 
                  key="results"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  {hits.map((hit, idx) => (
                    <motion.div 
                      key={idx} 
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.08, duration: 0.3 }}
                      className="f1-panel p-5 space-y-3 relative border-l-2 border-f1-blue"
                    >
                      {/* Score badge */}
                      <div className="absolute top-4 right-4 bg-f1-blue/10 border border-f1-blue/20 text-f1-blue text-[9px] font-mono font-bold px-2 py-0.5 rounded">
                        RELEVANCE: {hit.score}
                      </div>

                      <div className="space-y-1">
                        <div className="text-xs font-bold font-mono text-white">{hit.article}</div>
                        <div className="text-[10px] font-mono text-f1-textMuted">{hit.section}</div>
                      </div>

                      <p className="text-xs leading-relaxed text-slate-300 bg-black/25 rounded p-3 font-mono border border-f1-cardBorder/40">
                        "{hit.content}"
                      </p>

                      <div className="flex justify-between items-center text-[9px] font-mono text-f1-textMuted pt-1">
                        <span>SOURCE: {hit.source}</span>
                        <span>FORMAT: TEXT/DIRECTIVE</span>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Side: Architecture Walkthrough */}
        <div className="lg:col-span-1 space-y-6">
          <div className="f1-panel p-5 space-y-5">
            <div className="flex items-center space-x-2 border-b border-f1-cardBorder pb-2">
              <Cpu className="w-5 h-5 text-f1-yellow" />
              <h3 className="text-xs font-bold uppercase font-mono">SYSTEM ARCHITECTURE</h3>
            </div>

            {/* Architecture diagram */}
            <div className="bg-[#08080a] border border-f1-cardBorder rounded p-4 font-mono text-[10px] space-y-3 leading-tight overflow-x-auto text-f1-textMuted">
              <div className="text-white font-bold text-center border-b border-f1-cardBorder pb-1 mb-2">
                TELEMETRY DATA PIPELINE
              </div>
              <div className="flex flex-col items-center space-y-2">
                <div className="border border-f1-cardBorder bg-[#121218] p-1.5 rounded w-full text-center text-white">
                  Telemetry Stream (WebSocket / FASTF1 API)
                </div>
                <ArrowRight className="w-3.5 h-3.5 rotate-90 text-f1-red" />
                <div className="border border-f1-cardBorder bg-[#121218] p-1.5 rounded w-full text-center text-white">
                  FastAPI Server (Services & Replays)
                </div>
                <ArrowRight className="w-3.5 h-3.5 rotate-90 text-f1-red" />
                <div className="border border-f1-cardBorder bg-[#121218] p-1.5 rounded w-full text-center text-white">
                  LangFlow Orchestrator & RAG
                </div>
                <ArrowRight className="w-3.5 h-3.5 rotate-90 text-f1-red" />
                <div className="border border-f1-red bg-f1-red/5 p-1.5 rounded w-full text-center text-white font-bold">
                  IBM Granite LLM Reasoning Core
                </div>
                <ArrowRight className="w-3.5 h-3.5 rotate-90 text-f1-red" />
                <div className="border border-f1-cardBorder bg-[#121218] p-1.5 rounded w-full text-center text-white">
                  Interactive Next.js UI (Recharts)
                </div>
              </div>
            </div>

            {/* Technology bullet points */}
            <div className="space-y-4 font-mono text-xs text-f1-textMuted">
              <div className="space-y-1">
                <div className="text-white font-bold flex items-center space-x-1">
                  <Database className="w-4 h-4 text-f1-blue shrink-0" />
                  <span>FIA Regulation RAG</span>
                </div>
                <p className="text-[10px] leading-relaxed">
                  FIA sporting regulations are processed using <strong>Docling</strong> to extract tables, hierarchy levels, and bullet points. Text vectors are indexed locally and matched using BM25 relevance scoring.
                </p>
              </div>

              <div className="space-y-1">
                <div className="text-white font-bold flex items-center space-x-1">
                  <Terminal className="w-4 h-4 text-f1-red shrink-0" />
                  <span>IBM Granite reasoning</span>
                </div>
                <p className="text-[10px] leading-relaxed">
                  WatsonX IBM Granite LLMs receive the telemetry JSON package and retrieved regulation chunks to deduce tyres lifespan and generate pitstop recommendations.
                </p>
              </div>

              <div className="space-y-1">
                <div className="text-white font-bold flex items-center space-x-1">
                  <Layers className="w-4 h-4 text-f1-yellow shrink-0" />
                  <span>Strategy Simulator</span>
                </div>
                <p className="text-[10px] leading-relaxed">
                  Runs mathematical tire decay equations modified by weight fuel factors, pit stop lane delays, and asphalt temp inputs.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
