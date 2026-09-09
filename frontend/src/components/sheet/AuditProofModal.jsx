"use client";

import React from "react";
import { useApp } from "../../context/AppContext";
import { X, LogIn, LogOut, Bath, ShieldCheck, AlertOctagon, PenTool } from "lucide-react";

export function AuditProofModal({ candidateId, onClose }) {
  const { attendanceData } = useApp();

  const record = (attendanceData.records || []).find((r) => r.candidate_id === candidateId);
  if (!record) return null;

  const logs = record.washroom_logs || [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-3xl p-6 flex flex-col gap-5 border-sky-500/30 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/80">
          <div className="flex items-center gap-2.5 text-cyber-cyan">
            <ShieldCheck className="w-5 h-5" />
            <div>
              <h3 className="font-bold text-base text-white">{record.name} - Verification Audit</h3>
              <p className="text-xs text-slate-400 font-mono">
                Roll: {record.roll_id || "N/A"} • Hall: {record.room_name} ({record.seat_number})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Snapshots & Signature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* 1. Face Entry Snapshot */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col gap-2">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase">
              <LogIn className="w-3.5 h-3.5" /> Face Entry
            </span>
            <div className="w-full aspect-video rounded-lg overflow-hidden border border-slate-700 bg-slate-950 flex items-center justify-center">
              {record.entry_snapshot ? (
                <img src={`/api/${record.entry_snapshot}`} alt="Entry Snapshot" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs text-slate-500">No Entry Snapshot</span>
              )}
            </div>
            <span className="text-[11px] font-mono text-slate-400 truncate">
              {record.entry_time ? `Time: ${record.entry_time}` : "Not entered"}
            </span>
          </div>

          {/* 2. Digital Signature */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col gap-2">
            <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5 uppercase">
              <PenTool className="w-3.5 h-3.5" /> Digital Signature
            </span>
            <div className="w-full aspect-video rounded-lg overflow-hidden border border-sky-500/40 bg-slate-950 flex items-center justify-center p-1 shadow-inner">
              {record.signature_snapshot ? (
                <img src={`/api/${record.signature_snapshot}`} alt="Digital Signature" className="w-full h-full object-contain filter brightness-110" />
              ) : (
                <span className="text-xs text-slate-500 font-mono">No Signature</span>
              )}
            </div>
            <span className="text-[11px] font-mono text-slate-400 truncate">
              {record.signature_time || (record.signature_snapshot ? "Verified" : "Pending")}
            </span>
          </div>

          {/* 3. Exit Snapshot */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col gap-2">
            <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5 uppercase">
              <LogOut className="w-3.5 h-3.5" /> Face Exit
            </span>
            <div className="w-full aspect-video rounded-lg overflow-hidden border border-slate-700 bg-slate-950 flex items-center justify-center">
              {record.exit_snapshot ? (
                <img src={`/api/${record.exit_snapshot}`} alt="Exit Snapshot" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs text-slate-500">No Exit Snapshot</span>
              )}
            </div>
            <span className="text-[11px] font-mono text-slate-400 truncate">
              {record.exit_time ? `Time: ${record.exit_time} (${record.duration_minutes || 0}m)` : "Not exited"}
            </span>
          </div>
        </div>

        {/* Washroom Breakdown Logs */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col gap-3">
          <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5 uppercase">
            <Bath className="w-4 h-4" /> Washroom Breaks & Violation Logs
          </h4>

          <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
            {logs.length === 0 ? (
              <span className="text-xs text-slate-500">No washroom breaks recorded for this candidate.</span>
            ) : (
              logs.map((log, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-mono ${
                    log.is_overtime
                      ? "bg-rose-500/15 border-rose-500/40 text-rose-300"
                      : "bg-slate-950 border-slate-800 text-slate-300"
                  }`}
                >
                  <div>
                    <strong>Break #{idx + 1}:</strong> Out {log.out_time} ➔ In {log.in_time || "Still Out"} ({log.duration_minutes || 0}m)
                  </div>
                  {log.is_overtime ? (
                    <span className="text-[10px] font-black text-rose-400 flex items-center gap-1">
                      <AlertOctagon className="w-3 h-3" /> OVERTIME (+{log.overtime_minutes}m)
                    </span>
                  ) : (
                    <span className="text-[10px] text-emerald-400 font-bold">On Time</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
