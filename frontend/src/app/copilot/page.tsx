"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bot, 
  Send, 
  Settings, 
  BookOpen, 
  CheckSquare, 
  HelpCircle,
  Activity, 
  Radio, 
  ChevronDown, 
  ChevronUp, 
  AlertTriangle,
  Volume2,
  VolumeX,
  Square
} from "lucide-react";
import { audioManager } from "../../components/audioManager";

interface Message {
  id: string;
  sender: "user" | "copilot";
  text: string;
  thoughts?: string[];
  citations?: string[];
  assumptions?: string[];
  action?: string;
  mode?: "engineering" | "fan";
}

export default function AICopilot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "copilot",
      text: "Apexion AI online. I have analyzed active race telemetry and indexed the FIA Sporting Regulations database. Select Engineering or Fan mode, or ask a question regarding pit stop timing, tyre degradation, or race rules.",
      thoughts: ["Initialize AI Copilot", "Connect to RegulationRAG", "Await driver telemetry query"],
      action: "MONITOR",
      mode: "engineering"
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [mode, setMode] = useState<"engineering" | "fan">("engineering");
  const [loading, setLoading] = useState(false);
  const [expandedThoughts, setExpandedThoughts] = useState<Record<string, boolean>>({});

  // Voice Text-to-Speech settings (accessible / hearing-aid friendly)
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [speechRate, setSpeechRate] = useState(0.85); // slower speech rate helps hearing aid users
  const [speechPitch, setSpeechPitch] = useState(0.9); // lower tone frequency is easier to hear
  const [speechVolume, setSpeechVolume] = useState(1.0);
  const [isPlayingId, setIsPlayingId] = useState<string | null>(null);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Active mock telemetry to send with chat requests for realistic context
  const activeTelemetryContext = {
    lap: 45,
    speed: 285,
    gear: 6,
    rpm: 11800,
    tyre_compound: "Hard",
    tyre_age: 32,
    tyre_wear_fl: 78.4,
    tyre_wear_fr: 75.1,
    tyre_wear_rl: 71.0,
    tyre_wear_rr: 69.8,
    tyre_temp_fl: 122.5, // slightly overheating
    tyre_temp_fr: 114.2,
    tyre_temp_rl: 108.0,
    tyre_temp_rr: 107.4,
    fuel_left: 21.4,
    fuel_consumption: 1.6,
    drs_enabled: false,
    track_temp: 38.5,
    weather: "Dry"
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Speech synthesis logic optimized for walkie-talkie pit-wall radio
  const speakText = async (text: string, msgId: string) => {
    if (isPlayingId === msgId) {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setIsPlayingId(null);
      return;
    }

    setIsPlayingId(msgId);
    try {
      await audioManager.speak(text);
    } catch (err) {
      console.error("Audio playback error:", err);
    } finally {
      setIsPlayingId(null);
    }
  };

  // Auto-speak new incoming bot responses if voice is activated
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.sender === "copilot" && voiceEnabled) {
      const t = setTimeout(() => {
        speakText(lastMsg.text, lastMsg.id);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [messages, voiceEnabled]);

  // Cancel speech on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsgId = `user-${Date.now()}`;
    const userMsg: Message = {
      id: userMsgId,
      sender: "user",
      text: text
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText("");
    setLoading(true);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${backendUrl}/api/copilot/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          question: text,
          mode: mode,
          current_telemetry: activeTelemetryContext
        })
      });

      if (!response.ok) {
        throw new Error("AI Race Engineer failed to respond.");
      }

      const data = await response.json();
      
      const copilotMsg: Message = {
        id: `copilot-${Date.now()}`,
        sender: "copilot",
        text: data.answer,
        thoughts: data.thoughts,
        citations: data.citations,
        assumptions: data.assumptions,
        action: data.action,
        mode: mode
      };

      setMessages(prev => [...prev, copilotMsg]);
    } catch (err: any) {
      console.error(err);
      const errorMsg: Message = {
        id: `error-${Date.now()}`,
        sender: "copilot",
        text: "Error communicating with pit-wall reasoning core. Please check if the FastAPI backend server is running on port 8000."
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const toggleThoughts = (msgId: string) => {
    setExpandedThoughts(prev => ({
      ...prev,
      [msgId]: !prev[msgId]
    }));
  };

  const promptChips = [
    "Should we pit now?",
    "Why are lap times increasing?",
    "How does VSC affect pit stops?",
    "Explain undercut advantage",
    "What are the rules on tyre compounds?"
  ];

  return (
    <div className="flex-1 flex flex-col max-w-5xl mx-auto h-[calc(100vh-100px)]">
      
      {/* Copilot Header controls */}
      <div className="f1-panel p-4 flex flex-col sm:flex-row justify-between items-center gap-4 mb-4 border-b border-f1-cardBorder shrink-0">
        <div className="flex items-center space-x-2.5">
          <div className="relative">
            <Radio className="w-5 h-5 text-f1-red animate-pulse" />
            <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-f1-green rounded-full" />
          </div>
          <div>
            <h2 className="text-sm font-bold font-mono uppercase tracking-wider text-white">
              RADIO LINK: RACE ENGINEER
            </h2>
            <div className="text-[10px] text-f1-textMuted font-mono">
              STREAM CONTEXT: LAP {activeTelemetryContext.lap} // T-TEMP: {activeTelemetryContext.track_temp}°C
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Mode Selector */}
          <div className="flex items-center space-x-2 border border-f1-cardBorder rounded p-1 bg-black/40">
            <button
              onClick={() => setMode("engineering")}
              className={`
                font-mono text-xs px-3 py-1.5 rounded transition-all uppercase font-bold
                ${mode === "engineering" 
                  ? "bg-f1-red text-white" 
                  : "text-f1-textMuted hover:text-white"
                }
              `}
            >
              Engineering Deck
            </button>
            <button
              onClick={() => setMode("fan")}
              className={`
                font-mono text-xs px-3 py-1.5 rounded transition-all uppercase font-bold
                ${mode === "fan" 
                  ? "bg-f1-blue text-white" 
                  : "text-f1-textMuted hover:text-white"
                }
              `}
            >
              Fan Deck
            </button>
          </div>

          {/* Voice Accessibility Controller */}
          <div className="relative flex items-center space-x-2 border border-f1-cardBorder rounded p-1 bg-black/40">
            <button
              onClick={() => {
                setVoiceEnabled(prev => !prev);
                if (!voiceEnabled) {
                  // Speak last message if enabled
                  const lastMsg = messages[messages.length - 1];
                  if (lastMsg && lastMsg.sender === "copilot") {
                    speakText(lastMsg.text, lastMsg.id);
                  }
                } else if (typeof window !== "undefined" && window.speechSynthesis) {
                  window.speechSynthesis.cancel();
                  setIsPlayingId(null);
                }
              }}
              title={voiceEnabled ? "Mute Radio Voice" : "Enable Radio Voice"}
              className={`p-1.5 rounded hover:bg-white/5 transition-colors ${voiceEnabled ? "text-f1-yellow" : "text-f1-textMuted"}`}
            >
              {voiceEnabled ? <Volume2 className="w-4.5 h-4.5" /> : <VolumeX className="w-4.5 h-4.5" />}
            </button>

            <button
              onClick={() => setShowVoiceSettings(prev => !prev)}
              title="Voice Tone & Speed (Hearing Assist Settings)"
              className={`p-1.5 rounded hover:bg-white/5 transition-colors ${showVoiceSettings ? "text-white bg-white/10" : "text-f1-textMuted"}`}
            >
              <Settings className="w-4.5 h-4.5" />
            </button>

            {showVoiceSettings && (
              <div className="absolute right-0 top-10 w-64 bg-[#121218] border border-f1-cardBorder p-4 rounded-md shadow-2xl z-50 space-y-4 text-xs font-mono">
                <div className="border-b border-[#22222d] pb-1.5 flex justify-between items-center">
                  <span className="text-white font-bold uppercase tracking-wider text-[10px]">VOICE ASSIST SETTINGS</span>
                  <button 
                    onClick={() => setShowVoiceSettings(false)}
                    className="text-f1-textMuted hover:text-white text-[10px]"
                  >
                    ✕
                  </button>
                </div>
                
                {/* Volume Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-f1-textMuted">
                    <span>VOLUME</span>
                    <span>{Math.round(speechVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={speechVolume}
                    onChange={(e) => setSpeechVolume(parseFloat(e.target.value))}
                    className="w-full accent-f1-yellow bg-[#09090d] h-1 rounded"
                  />
                </div>

                {/* Speed Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-f1-textMuted">
                    <span>SPEED (COMPREHENSION)</span>
                    <span>{speechRate.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.05"
                    value={speechRate}
                    onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                    className="w-full accent-f1-yellow bg-[#09090d] h-1 rounded"
                  />
                  <div className="text-[9px] text-f1-textMuted leading-tight italic">
                    Slower rates (e.g. 0.8x) significantly help hearing aid wearers.
                  </div>
                </div>

                {/* Pitch/Tone Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-f1-textMuted">
                    <span>TONE / PITCH (FREQUENCY)</span>
                    <span>{speechPitch.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.2"
                    step="0.05"
                    value={speechPitch}
                    onChange={(e) => setSpeechPitch(parseFloat(e.target.value))}
                    className="w-full accent-f1-yellow bg-[#09090d] h-1 rounded"
                  />
                  <div className="text-[9px] text-f1-textMuted leading-tight italic">
                    Lower tones (e.g. 0.9x) bypass high-frequency hearing deficits.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Flow Window */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-4 mb-4 min-h-0">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`
                max-w-[85%] rounded-lg p-4 space-y-3
                ${msg.sender === "user" 
                  ? "bg-f1-card border border-f1-cardBorder text-white rounded-tr-none" 
                  : "bg-background border border-f1-cardBorder text-foreground rounded-tl-none"
                }
              `}>
                {/* Sender Tag */}
                <div className="flex items-center justify-between border-b border-[#22222f]/40 pb-1.5 text-[10px] font-mono text-f1-textMuted uppercase tracking-wider">
                  <div className="flex items-center space-x-1.5">
                    {msg.sender === "copilot" ? (
                      <>
                        <Bot className="w-3.5 h-3.5 text-f1-red" />
                        <span className="font-bold text-white">RACE_ENG_BOT</span>
                        <button
                          onClick={() => speakText(msg.text, msg.id)}
                          title={isPlayingId === msg.id ? "Stop voice" : "Speak voice (Hearing Assist)"}
                          className="ml-2 p-0.5 rounded text-f1-textMuted hover:text-white transition-colors"
                        >
                          {isPlayingId === msg.id ? (
                            <Square className="w-3 h-3 text-f1-red animate-pulse" />
                          ) : (
                            <Volume2 className="w-3 h-3" />
                          )}
                        </button>
                      </>
                    ) : (
                      <span className="font-bold text-f1-textMuted">PIT_WALL_USER</span>
                    )}
                  </div>
                  {msg.mode && (
                    <span className={`px-1.5 rounded text-[8px] uppercase ${
                      msg.mode === "engineering" ? "bg-f1-red/10 text-f1-red" : "bg-f1-blue/10 text-f1-blue"
                    }`}>
                      {msg.mode} mode
                    </span>
                  )}
                </div>

                {/* Message Body Text */}
                <p className="text-sm leading-relaxed whitespace-pre-line font-sans font-medium text-slate-100">
                  {msg.text}
                </p>

                {/* Copilot Reasoning & Metadata blocks */}
                {msg.sender === "copilot" && msg.thoughts && msg.thoughts.length > 0 && (
                  <div className="space-y-2 border-t border-[#22222f]/60 pt-3">
                    
                    {/* Collapsible Thoughts Chain */}
                    <div className="bg-black/35 rounded border border-[#22222d] overflow-hidden">
                      <button
                        onClick={() => toggleThoughts(msg.id)}
                        className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-mono uppercase tracking-widest text-f1-textMuted hover:text-white"
                      >
                        <span className="flex items-center space-x-1.5">
                          <Activity className="w-3.5 h-3.5 text-f1-yellow" />
                          <span>AI Reason Trace Graph</span>
                        </span>
                        {expandedThoughts[msg.id] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                      
                      {expandedThoughts[msg.id] && (
                        <div className="px-3 pb-3 pt-1 space-y-1.5 text-[10px] font-mono text-f1-textMuted border-t border-[#22222d] bg-black/20">
                          {msg.thoughts.map((thought, idx) => (
                            <div key={idx} className="flex items-start space-x-1.5">
                              <span className="text-f1-yellow shrink-0">&raquo;</span>
                              <span>{thought}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Action directive badge */}
                    {msg.action && (
                      <div className="flex items-center space-x-2 text-[10px] font-mono">
                        <span className="text-f1-textMuted uppercase">DIRECTIVE:</span>
                        <span className={`px-2 py-0.5 rounded font-black tracking-wider uppercase border ${
                          msg.action.includes("PIT") || msg.action.includes("BOX")
                            ? "bg-f1-red/10 border-f1-red/30 text-f1-red animate-pulse"
                            : "bg-f1-green/10 border-f1-green/30 text-f1-green"
                        }`}>
                          {msg.action}
                        </span>
                      </div>
                    )}

                    {/* RAG Regulations Citation */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="space-y-1 font-mono text-[9px] text-f1-textMuted">
                        <div className="flex items-center space-x-1 uppercase tracking-wider text-[8px]">
                          <BookOpen className="w-3 h-3 text-f1-blue" />
                          <span>RAG Document Grounding References</span>
                        </div>
                        <ul className="list-disc pl-3.5 space-y-0.5">
                          {msg.citations.map((cit, idx) => (
                            <li key={idx} className="italic text-f1-textMuted hover:text-white transition-colors">
                              {cit}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {loading && (
          <div className="flex justify-start">
            <div className="bg-[#0f0f15] border border-f1-cardBorder rounded-lg rounded-tl-none p-4 space-y-2">
              <div className="flex items-center space-x-2 text-[10px] font-mono text-f1-textMuted">
                <Bot className="w-4 h-4 text-f1-red animate-spin" />
                <span>RACE ENGINEER GENERATING DEGRADATION ANALYSES...</span>
              </div>
              <div className="h-1.5 w-48 bg-f1-cardBorder overflow-hidden rounded">
                <div className="bg-f1-red h-full w-1/3 animate-[pulse_1s_infinite]" />
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Quick Action prompt chips */}
      <div className="flex flex-wrap gap-2 mb-4 shrink-0">
        {promptChips.map((chip) => (
          <button
            key={chip}
            onClick={() => handleSendMessage(chip)}
            disabled={loading}
            className="bg-f1-card border border-f1-cardBorder hover:border-f1-red/30 hover:bg-f1-red/5 text-f1-textMuted hover:text-white font-mono text-xs px-3 py-1.5 rounded-full transition-all"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Input Message box */}
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage(inputText);
        }}
        className="f1-panel p-2 flex items-center space-x-2 border border-f1-cardBorder shrink-0 bg-black/60"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={loading ? "Telemetry solver busy..." : "Request telemetry analysis or cite rules (e.g. 'Should we pit under VSC?')..."}
          disabled={loading}
          className="flex-1 bg-transparent border-0 ring-0 focus:ring-0 focus:outline-none text-sm font-mono px-3 text-white placeholder-f1-textMuted"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || loading}
          className="bg-f1-red hover:bg-f1-darkRed text-white p-2.5 rounded transition-all disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
