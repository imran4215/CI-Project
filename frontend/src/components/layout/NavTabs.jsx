"use client";

import React from "react";
import { useApp } from "../../context/AppContext";
import {
  Scan,
  CalendarClock,
  ClipboardList,
  ShieldAlert,
  Layers,
  Users,
  Settings,
  Eye,
} from "lucide-react";

export function NavTabs() {
  const { activeTab, setActiveTab, attendanceData, alerts, users, schedules } = useApp();

  // Calculate actual punched attendance records (INSIDE, WASHROOM, EXITED)
  const actualPunchedCount = (attendanceData.records || []).filter(
    (r) => r.status && r.status !== "ABSENT"
  ).length;

  const tabs = [
    { id: "attendance", label: "Entrance Attendance", icon: Scan, badge: attendanceData.present_inside ? `${attendanceData.present_inside} In` : null, badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" },
    { id: "monitoring", label: "Continuous Hall Monitor", icon: Eye, badge: "AI Surveillance", badgeColor: "bg-cyan-500/20 text-cyber-cyan border-cyan-500/40" },
    { id: "registration_hub", label: "Registration Hub", icon: Layers, badge: "Hub", badgeColor: "bg-cyan-500/20 text-cyber-cyan border-cyan-500/40" },
    { id: "schedules", label: "Exam Timetable", icon: CalendarClock, badge: schedules.length > 0 ? `${schedules.length}` : null, badgeColor: "bg-sky-500/20 text-sky-400 border-sky-500/40" },
    { id: "sheet", label: "Attendance Sheet", icon: ClipboardList, badge: actualPunchedCount > 0 ? `${actualPunchedCount}` : null },
    { id: "alerts", label: "Security Alerts", icon: ShieldAlert, badge: alerts.length > 0 ? `${alerts.length}` : null, badgeColor: "bg-rose-500/20 text-rose-400 border-rose-500/40" },
    { id: "database", label: "Candidate Bank", icon: Users, badge: users.length > 0 ? `${users.length}` : null },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <nav className="w-full flex items-center gap-1.5 p-1.5 rounded-xl glass-panel mb-4 overflow-x-auto">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
              isActive
                ? "bg-cyan-500/20 text-cyber-cyan border border-cyan-500/40 shadow-neon-cyan"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
            }`}
          >
            <Icon className={`w-4 h-4 ${isActive ? "text-cyber-cyan" : "text-slate-400"}`} />
            <span>{tab.label}</span>
            {tab.badge && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full border ${
                  tab.badgeColor || "bg-slate-800 text-slate-300 border-slate-700"
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
