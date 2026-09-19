"use client";

import React from "react";
import { useApp } from "../../context/AppContext";
import { CheckCircle, AlertTriangle, AlertOctagon, Info } from "lucide-react";

export function ToastContainer() {
  const { toasts } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-[100] flex flex-col gap-2.5 pointer-events-none max-w-md w-full sm:w-auto">
      {toasts.map((toast) => {
        let borderClass = "border-cyber-blue";
        let icon = <Info className="w-4 h-4 text-cyber-blue flex-shrink-0" />;

        if (toast.type === "success") {
          borderClass = "border-emerald-500 text-emerald-400";
          icon = <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />;
        } else if (toast.type === "error") {
          borderClass = "border-rose-500 text-rose-400";
          icon = <AlertOctagon className="w-4 h-4 text-rose-400 flex-shrink-0" />;
        } else if (toast.type === "warning") {
          borderClass = "border-amber-500 text-amber-400";
          icon = <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />;
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900/95 border-l-4 ${borderClass} border border-slate-700/80 shadow-2xl backdrop-blur-md text-xs sm:text-sm text-slate-100 min-w-[280px] max-w-md animate-in slide-in-from-top-3 fade-in duration-200`}
          >
            {icon}
            <span className="font-medium text-slate-100 leading-snug">{toast.message}</span>
          </div>
        );
      })}
    </div>
  );
}
