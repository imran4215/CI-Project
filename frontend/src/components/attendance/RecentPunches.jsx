"use client";

import React from "react";
import { History, LogIn, LogOut, Bath } from "lucide-react";

export function RecentPunches({ punches = [] }) {
  return (
    <div className="glass-card p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
        <History className="w-4 h-4 text-cyber-cyan" />
        <span>Recent Exam Punches</span>
      </div>

      <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
        {punches.length === 0 ? (
          <div className="text-xs text-slate-500 text-center py-4">No recent punches recorded yet</div>
        ) : (
          punches.map((p, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 text-xs"
            >
              <span className="font-semibold text-white">{p.name}</span>
              <span className="font-mono text-cyan-400">{p.type} • {p.time}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
