"use client";

import React, { useState, useEffect, useRef } from "react";
import { useApp } from "../../context/AppContext";
import { Bath, CheckCircle2, AlertOctagon } from "lucide-react";

export function WashroomMonitor() {
  const { attendanceData, washroomLimitMinutes, triggerAudio, triggerVoice } = useApp();
  const [nowTime, setNowTime] = useState(Date.now());
  const washroomOvertimeWarningGiven = useRef({});

  useEffect(() => {
    const timer = setInterval(() => setNowTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const activeWashroom = (attendanceData.records || []).filter((r) => r.status === "WASHROOM");

  return (
    <div className="glass-card p-4 flex flex-col gap-3 border-amber-500/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
          <Bath className="w-4 h-4" />
          <span>Currently Out in Washroom</span>
        </div>
        <span className="text-xs font-extrabold font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40">
          {activeWashroom.length}
        </span>
      </div>

      <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
        {activeWashroom.length === 0 ? (
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500 py-4">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>No candidates currently on washroom break</span>
          </div>
        ) : (
          activeWashroom.map((cand) => {
            let elapsedSec = 0;
            if (cand.washroom_out_iso) {
              const outDt = new Date(cand.washroom_out_iso);
              elapsedSec = Math.max(0, Math.floor((nowTime - outDt.getTime()) / 1000));
            }

            const elapsedMins = Math.floor(elapsedSec / 60);
            const remSec = elapsedSec % 60;
            const elapsedStr = `${String(elapsedMins).padStart(2, "0")}:${String(remSec).padStart(2, "0")}`;
            const limit = washroomLimitMinutes || 10;
            const isOvertime = elapsedMins >= limit;

            if (isOvertime && !washroomOvertimeWarningGiven.current[cand.candidate_id]) {
              washroomOvertimeWarningGiven.current[cand.candidate_id] = true;
              triggerAudio("alert");
              triggerVoice(`Alert: Candidate ${cand.name} has exceeded the washroom time limit.`);
            }

            return (
              <div
                key={cand.candidate_id}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-xs transition ${
                  isOvertime
                    ? "bg-rose-500/15 border-rose-500 text-rose-300 animate-violation"
                    : "bg-slate-900/80 border-amber-500/40 text-slate-200"
                }`}
              >
                <div className="flex flex-col">
                  <span className="font-bold text-white">{cand.name}</span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {cand.roll_id || ""} • {cand.room_name} ({cand.seat_number})
                  </span>
                </div>

                <div className="flex items-baseline gap-1 font-mono">
                  <span className={`text-sm font-black ${isOvertime ? "text-rose-400" : "text-amber-400"}`}>
                    {elapsedStr}
                  </span>
                  <span className="text-[10px] text-slate-400">/ {limit}m</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
