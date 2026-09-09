"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { PenTool, RotateCcw, CheckCircle2, Tablet } from "lucide-react";

export function SignaturePad({ onSignatureChange, disabled = false }) {
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const strokeCountRef = useRef(0);
  const lastPointRef = useRef({ x: 0, y: 0 });
  const [hasSignature, setHasSignature] = useState(false);
  const [isTabletActive, setIsTabletActive] = useState(false);

  // Initialize Canvas & High DPI Scaling
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Internal resolution scaled for retina/high-DPI
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#38bdf8"; // Cyber sky blue signature ink
    ctx.lineWidth = 2.5;

    // Draw baseline guide
    drawGuide(ctx, rect.width, rect.height);
  }, []);

  const drawGuide = (ctx, width, height) => {
    ctx.save();
    ctx.strokeStyle = "rgba(100, 116, 139, 0.25)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(20, height - 24);
    ctx.lineTo(width - 20, height - 24);
    ctx.stroke();

    ctx.fillStyle = "rgba(148, 163, 184, 0.4)";
    ctx.font = "10px sans-serif";
    ctx.fillText("Sign here / Huion Graphics Pad", 24, height - 10);
    ctx.restore();
  };

  useEffect(() => {
    setupCanvas();
    const handleResize = () => setupCanvas();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setupCanvas]);

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
    if (disabled) return;
    // Capture pointer events for tablets like Huion H640P
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
    if (!isDrawingRef.current || disabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const coords = getCanvasCoords(e);

    // Pressure sensitivity for pen / Huion graphics tablet
    if (e.pressure && e.pressure > 0) {
      ctx.lineWidth = Math.max(1.5, Math.min(4.5, e.pressure * 5));
    } else {
      ctx.lineWidth = 2.5;
    }

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();

    lastPointRef.current = coords;
    strokeCountRef.current += 1;

    if (!hasSignature && strokeCountRef.current > 5) {
      setHasSignature(true);
      emitSignature(true);
    }
  };

  const handlePointerUp = (e) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    try {
      e.target.releasePointerCapture(e.pointerId);
    } catch (_) {}

    if (strokeCountRef.current > 5) {
      emitSignature(true);
    }
  };

  const emitSignature = (valid) => {
    const canvas = canvasRef.current;
    if (!canvas || !valid) {
      if (onSignatureChange) onSignatureChange({ hasSignature: false, dataUrl: null });
      return;
    }

    // Export clean PNG
    const dataUrl = canvas.toDataURL("image/png");
    if (onSignatureChange) {
      onSignatureChange({ hasSignature: true, dataUrl });
    }
  };

  const handleClear = (e) => {
    if (e) e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setupCanvas();

    strokeCountRef.current = 0;
    setHasSignature(false);
    emitSignature(false);
  };

  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl bg-slate-900/90 border border-slate-800 shadow-inner">
      {/* Signature Header & Tablet Indicator */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-bold">
          <PenTool className="w-3.5 h-3.5 text-cyber-cyan" />
          <span className="text-white">Candidate Digital Signature</span>
          <span className="text-rose-400">*</span>
        </div>

        <div className="flex items-center gap-2">
          {isTabletActive ? (
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyber-cyan border border-cyan-500/30 text-[10px] font-mono flex items-center gap-1">
              <Tablet className="w-3 h-3" /> Huion Stylus Ready
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-mono flex items-center gap-1">
              <Tablet className="w-3 h-3" /> Pen / Tablet / Mouse
            </span>
          )}

          {hasSignature ? (
            <span className="text-emerald-400 text-[11px] font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Signed
            </span>
          ) : (
            <span className="text-amber-400 text-[11px] font-bold animate-pulse">
              ✍️ Sign Required
            </span>
          )}
        </div>
      </div>

      {/* Signature Canvas Area */}
      <div className="relative w-full h-28 rounded-lg overflow-hidden border-2 border-dashed border-slate-700 hover:border-cyber-cyan/60 bg-slate-950 flex items-center justify-center transition">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className={`w-full h-full touch-none cursor-crosshair ${
            disabled ? "opacity-40 pointer-events-none" : ""
          }`}
          style={{ touchAction: "none" }}
        />

        {/* Clear Button */}
        {hasSignature && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute top-2 right-2 px-2 py-1 rounded-md bg-slate-900/90 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 text-[10px] font-mono font-bold flex items-center gap-1 transition shadow-lg backdrop-blur-sm"
            title="Clear signature to sign again"
          >
            <RotateCcw className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
        <span>Use Huion H640P tablet stylus or pointer to sign</span>
        <span>Step 2 of 2 Verification</span>
      </div>
    </div>
  );
}
