"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { Settings, Sliders, Camera, Volume2, ShieldCheck } from "lucide-react";

export function SystemSettings() {
  const {
    threshold,
    setThreshold,
    selectedDeviceId,
    setSelectedDeviceId,
    isMirrored,
    setIsMirrored,
    voiceAnnounce,
    setVoiceAnnounce,
    audioBeep,
    setAudioBeep,
    addToast,
  } = useApp();

  const [devices, setDevices] = useState([]);

  useEffect(() => {
    async function getDevices() {
      try {
        const devs = await navigator.mediaDevices.enumerateDevices();
        setDevices(devs.filter((d) => d.kind === "videoinput"));
      } catch (e) {
        console.error("Device enum error:", e);
      }
    }
    getDevices();
  }, []);

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="glass-panel p-6 flex items-center justify-between flex-wrap gap-4 border-sky-500/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyber-cyan">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">System Settings & Biometric Parameters</h2>
            <p className="text-xs text-slate-400">Configure face recognition sensitivity, audio feedback, and camera inputs.</p>
          </div>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Biometrics */}
        <div className="glass-panel p-6 flex flex-col gap-4 border-sky-500/20">
          <h3 className="font-bold text-sm text-white flex items-center gap-2 pb-3 border-b border-slate-800">
            <Sliders className="w-4 h-4 text-cyber-cyan" /> ArcFace Matching Threshold
          </h3>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Cosine Distance:</span>
              <strong className="text-cyan-400">{threshold}</strong>
            </div>
            <input
              type="range"
              min="0.20"
              max="0.60"
              step="0.01"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="w-full accent-cyan-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0.20 (Strict)</span>
              <span>0.363 (Recommended)</span>
              <span>0.60 (Lenient)</span>
            </div>
          </div>
        </div>

        {/* Camera Inputs */}
        <div className="glass-panel p-6 flex flex-col gap-4 border-sky-500/20">
          <h3 className="font-bold text-sm text-white flex items-center gap-2 pb-3 border-b border-slate-800">
            <Camera className="w-4 h-4 text-cyber-blue" /> Video Input & Mirror
          </h3>

          <div className="flex flex-col gap-3 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Select Video Device</label>
              <select
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-cyber-cyan"
              >
                <option value="">Default System Camera</option>
                {devices.map((d, i) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Camera ${i + 1}`}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center justify-between cursor-pointer pt-2">
              <span className="text-slate-300 font-semibold">Mirror Webcam Preview</span>
              <input
                type="checkbox"
                checked={isMirrored}
                onChange={(e) => setIsMirrored(e.target.checked)}
                className="rounded accent-cyan-500 w-4 h-4"
              />
            </label>
          </div>
        </div>

        {/* Audio Feedback */}
        <div className="glass-panel p-6 flex flex-col gap-4 border-sky-500/20 md:col-span-2">
          <h3 className="font-bold text-sm text-white flex items-center gap-2 pb-3 border-b border-slate-800">
            <Volume2 className="w-4 h-4 text-cyber-amber" /> Audio Feedback & Announcements
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <label className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer">
              <div className="flex flex-col">
                <span className="text-white font-bold">Voice Guidance (TTS)</span>
                <span className="text-slate-400 text-[11px]">Speaks candidate names and wrong room alerts.</span>
              </div>
              <input
                type="checkbox"
                checked={voiceAnnounce}
                onChange={(e) => setVoiceAnnounce(e.target.checked)}
                className="rounded accent-cyan-500 w-4 h-4"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer">
              <div className="flex flex-col">
                <span className="text-white font-bold">Audio Siren / Alerts</span>
                <span className="text-slate-400 text-[11px]">Plays audio beeps and violation sirens.</span>
              </div>
              <input
                type="checkbox"
                checked={audioBeep}
                onChange={(e) => setAudioBeep(e.target.checked)}
                className="rounded accent-cyan-500 w-4 h-4"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
