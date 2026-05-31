"use client";

import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    // Check initial theme from localStorage
    const isLightMode = localStorage.getItem("theme") === "light";
    if (isLightMode) {
      document.body.classList.add("light");
      setIsLight(true);
    } else {
      document.body.classList.remove("light");
      setIsLight(false);
    }
  }, []);

  const toggleTheme = () => {
    if (isLight) {
      document.body.classList.remove("light");
      localStorage.setItem("theme", "dark");
      setIsLight(false);
    } else {
      document.body.classList.add("light");
      localStorage.setItem("theme", "light");
      setIsLight(true);
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center space-x-2 border border-f1-cardBorder rounded px-3 py-1.5 bg-black/20 hover:bg-black/40 transition-all text-xs font-mono text-f1-textMuted hover:text-white"
      title={isLight ? "Switch to Night Mode (Dark Theme)" : "Switch to Day Mode (Light Theme)"}
    >
      {!isLight ? (
        <>
          <Sun className="w-3.5 h-3.5 text-f1-yellow" />
          <span className="hidden sm:inline">DAY MODE</span>
        </>
      ) : (
        <>
          <Moon className="w-3.5 h-3.5 text-f1-blue" />
          <span className="hidden sm:inline">NIGHT MODE</span>
        </>
      )}
    </button>
  );
}
