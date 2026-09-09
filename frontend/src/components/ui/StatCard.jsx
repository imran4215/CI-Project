"use client";

import React from "react";

export function StatCard({ icon: Icon, title, value, color = "blue", subtitle }) {
  const colorMap = {
    blue: { bg: "bg-sky-500/15", text: "text-sky-400", border: "border-sky-500/30" },
    emerald: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30" },
    amber: { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30" },
    rose: { bg: "bg-rose-500/15", text: "text-rose-400", border: "border-rose-500/30" },
    purple: { bg: "bg-purple-500/15", text: "text-purple-400", border: "border-purple-500/30" },
  };

  const scheme = colorMap[color] || colorMap.blue;

  return (
    <div className="glass-card p-4 flex items-center gap-4 transition-all duration-200 hover:border-slate-600">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${scheme.bg} ${scheme.text} ${scheme.border} border`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex flex-col">
        <span className={`text-2xl font-extrabold font-mono ${scheme.text}`}>{value}</span>
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</span>
        {subtitle && <span className="text-[11px] text-slate-500">{subtitle}</span>}
      </div>
    </div>
  );
}
