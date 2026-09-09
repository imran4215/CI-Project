"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { ShieldCheck, Video, Cpu, Database, Clock, Calendar } from "lucide-react";

export function Header() {
  const { rooms, activeRoomId, attendanceData } = useApp();
  const [timeStr, setTimeStr] = useState("");

  useEffect(() => {
    function updateClock() {
      const now = new Date();
      setTimeStr(
        now.toLocaleDateString([], { month: "short", day: "numeric" }) +
        " • " +
        now.toLocaleTimeString()
      );
    }
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="w-full glass-panel px-6 py-3.5 mb-4 flex items-center justify-between flex-wrap gap-4 border-b border-sky-500/20">
      {/* Logo & Brand */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-neon-cyan">
          <ShieldCheck className="w-6 h-6 text-slate-950 stroke-[2.5]" />
        </div>
        <div>
          <h1 className="text-lg font-black tracking-wider text-white uppercase font-sans">
            DigiHall
          </h1>
          <p className="text-[11px] text-slate-400 font-mono tracking-tight">
            Intelligent Exam Verification & Hall Security HUD
          </p>
        </div>
      </div>

      {/* Telemetry Indicator Badges */}
      <div className="flex items-center gap-3 flex-wrap">


        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-700/60 text-xs">
          <Database className="w-3.5 h-3.5 text-cyber-cyan" />
          <span className="text-slate-400">Halls:</span>
          <span className="font-semibold text-cyber-cyan">{rooms.length} Active</span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-700/60 text-xs font-mono text-slate-300">
          <Clock className="w-3.5 h-3.5 text-cyber-amber" />
          <span>{timeStr || "Syncing..."}</span>
        </div>
      </div>
    </header>
  );
}
