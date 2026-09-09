"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, PenTool, RotateCcw, Check, Tablet, Eye, Sparkles } from "lucide-react";

export function SignatureModal({ isOpen, onClose, onAcceptSignature, candidateName, rollId, initialSignature = null }) {
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const strokeCountRef = useRef(0);
  const lastPointRef = useRef({ x: 0, y: 0 });

  const [mounted, setMounted] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [isTabletActive, setIsTabletActive] = useState(false);
  const [livePreviewUrl, setLivePreviewUrl] = useState(initialSignature || null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#38bdf8"; // Cyber sky blue signature ink
    ctx.lineWidth = 3;

    // Draw guidelines
    ctx.save();
    ctx.strokeStyle = "rgba(100, 116, 139, 0.3)";
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(30, rect.height - 36);
    ctx.lineTo(rect.width - 30, rect.height - 36);
    ctx.stroke();

    ctx.fillStyle = "rgba(148, 163, 184, 0.5)";
    ctx.font = "12px sans-serif";
    ctx.fillText("Sign here using Huion H640P Graphics Tablet or Pen / Mouse", 35, rect.height - 14);
    ctx.restore();
  }, []);

  useEffect(() => {
    if (!isOpen || !mounted) return;
    const timer = setTimeout(() => {
      setupCanvas();
    }, 60);
    return () => clearTimeout(timer);
  }, [isOpen, mounted, setupCanvas]);

  if (!isOpen || !mounted) return null;

  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e) => {
    try {
      e.target.setPointerCapture(e.pointerId);
    } catch (_) {}

    if (e.pointerType === "pen") {
      setIsTabletActive(true);
    }

    isDrawingRef.current = true;
    const coords = getCanvasCoords(e);
    lastPointRef.current = coords;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const handlePointerMove = (e) => {
    if (!isDrawingRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const coords = getCanvasCoords(e);

    if (e.pressure && e.pressure > 0) {
      ctx.lineWidth = Math.max(2, Math.min(5.5, e.pressure * 6));
    } else {
      ctx.lineWidth = 3;
    }

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();

    lastPointRef.current = coords;
    strokeCountRef.current += 1;

    if (!hasSignature && strokeCountRef.current > 4) {
      setHasSignature(true);
    }
  };

  const handlePointerUp = (e) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    try {
      e.target.releasePointerCapture(e.pointerId);
    } catch (_) {}

    if (strokeCountRef.current > 4) {
      setHasSignature(true);
      const canvas = canvasRef.current;
      if (canvas) {
        setLivePreviewUrl(canvas.toDataURL("image/png"));
      }
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setupCanvas();

    strokeCountRef.current = 0;
    setHasSignature(false);
    setLivePreviewUrl(null);
  };

  const handleAccept = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;

    const dataUrl = canvas.toDataURL("image/png");
    onAcceptSignature(dataUrl);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-3xl p-6 flex flex-col gap-4 border-2 border-cyan-500/50 bg-slate-950/95 shadow-2xl rounded-2xl relative my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyber-cyan shadow-neon-cyan flex-shrink-0">
              <PenTool className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-white flex items-center gap-2">
                Candidate Digital Signature Pad
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  Step 2 of 2
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Candidate: <strong className="text-white text-sm">{candidateName}</strong> {rollId ? `(Roll: ${rollId})` : ""}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition border border-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tablet Status Banner */}
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono">
          <div className="flex items-center gap-2">
            <Tablet className="w-4 h-4 text-cyber-cyan" />
            <span className="text-slate-300">Input Device:</span>
            <span className="font-bold text-sky-400">
              {isTabletActive ? "Huion H640P Stylus Detected" : "Graphics Tablet / Stylus / Pointer Ready"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClear}
              disabled={!hasSignature}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono flex items-center gap-1.5 transition ${
                hasSignature
                  ? "bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 cursor-pointer"
                  : "bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed"
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" /> Clear Pad
            </button>
          </div>
        </div>

        {/* Main Canvas Pad */}
        <div className="relative w-full h-72 rounded-2xl overflow-hidden border-2 border-dashed border-cyan-500/40 hover:border-cyan-400 bg-slate-950 flex items-center justify-center shadow-inner">
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={handlePointerUp}
            className="w-full h-full touch-none cursor-crosshair"
            style={{ touchAction: "none" }}
          />

          {!hasSignature && (
            <div className="absolute top-4 right-4 pointer-events-none px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-700 text-xs font-mono text-amber-400 animate-pulse flex items-center gap-1.5 shadow-lg">
              <Sparkles className="w-4 h-4" /> Waiting for Signature...
            </div>
          )}
        </div>

        {/* Live Signature Preview Box - Always Visible & Open */}
        <div
          className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-3 transition-all duration-200 ${
            livePreviewUrl
              ? "bg-slate-900/95 border-emerald-500/50 shadow-lg shadow-emerald-950/20"
              : "bg-slate-900/60 border-slate-800/80"
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-bold">
            <Eye
              className={`w-4 h-4 ${
                livePreviewUrl ? "text-emerald-400" : "text-slate-400"
              }`}
            />
            <span
              className={livePreviewUrl ? "text-emerald-400" : "text-slate-300"}
            >
              Live Signature Preview:
            </span>
          </div>

          <div
            className={`h-20 w-full sm:w-80 rounded-xl bg-slate-950 border flex items-center justify-center overflow-hidden p-2 shadow-inner relative transition ${
              livePreviewUrl ? "border-emerald-500/40" : "border-slate-800"
            }`}
          >
            {livePreviewUrl ? (
              <img
                src={livePreviewUrl}
                alt="Live Signature Preview"
                className="w-full h-full object-contain filter brightness-125 drop-shadow-[0_0_8px_rgba(56,189,248,0.35)] animate-in fade-in"
              />
            ) : (
              <div className="flex items-center gap-2 text-slate-500 text-xs font-mono">
                <Sparkles className="w-3.5 h-3.5 text-slate-600 animate-pulse" />
                <span>Sign above to preview live...</span>
              </div>
            )}
          </div>

          <div className="flex items-center">
            {livePreviewUrl ? (
              <span className="text-xs font-mono text-emerald-400 font-bold flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 animate-in fade-in">
                <Check className="w-3.5 h-3.5" /> Ready to Accept
              </span>
            ) : (
              <span className="text-[11px] font-mono text-slate-500 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60">
                Pending Signature
              </span>
            )}
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold transition border border-slate-800"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={!hasSignature}
            onClick={handleAccept}
            className={`px-6 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 transition ${
              hasSignature
                ? "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-neon-cyan cursor-pointer transform hover:-translate-y-0.5"
                : "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
            }`}
          >
            <Check className="w-4 h-4" /> TAKE SIGN & ACCEPT
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
