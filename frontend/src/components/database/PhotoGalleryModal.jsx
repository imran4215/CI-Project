"use client";

import React from "react";
import { X, Images } from "lucide-react";

export function PhotoGalleryModal({ user, onClose }) {
  if (!user) return null;

  const images = user.images || {};

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-xl p-6 flex flex-col gap-5 border-sky-500/30">
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/80">
          <div className="flex items-center gap-2 text-cyber-cyan">
            <Images className="w-5 h-5" />
            <div>
              <h3 className="font-bold text-base text-white">{user.name} - Registered Poses</h3>
              <p className="text-xs text-slate-400 font-mono">Roll: {user.roll_id || "N/A"}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Object.entries(images).map(([angle, path]) => (
            <div key={angle} className="flex flex-col gap-1">
              <div className="w-full aspect-square rounded-lg overflow-hidden border border-slate-700 bg-slate-950">
                <img src={`/api/${path}`} alt={angle} className="w-full h-full object-cover" />
              </div>
              <span className="text-[11px] font-mono text-center font-bold text-cyan-400 uppercase tracking-wider">
                {angle}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
