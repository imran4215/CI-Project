"use client";

import React from "react";
import { useApp } from "../../context/AppContext";
import { CheckCircle, AlertTriangle, AlertOctagon, Info } from "lucide-react";

export function ToastContainer() {
  const { toasts } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        let borderClass = "border-cyber-blue";
        let icon = <Info className="w-4 h-4 text-cyber-blue" />;

        if (toast.type === "success") {
          borderClass = "border-cyber-emerald";
          icon = <CheckCircle className="w-4 h-4 text-cyber-emerald" />;
        } else if (toast.type === "error") {
          borderClass = "border-cyber-rose";
          icon = <AlertOctagon className="w-4 h-4 text-cyber-rose" />;
        } else if (toast.type === "warning") {
          borderClass = "border-cyber-amber";
          icon = <AlertTriangle className="w-4 h-4 text-cyber-amber" />;
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-900/95 border-l-4 ${borderClass} border border-slate-700 shadow-2xl backdrop-blur-md text-sm text-slate-100 min-w-[280px] max-w-md animate-fade-in`}
          >
            {icon}
            <span className="font-medium">{toast.message}</span>
          </div>
        );
      })}
    </div>
  );
}
