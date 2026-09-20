"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { PenTool, RotateCcw, CheckCircle2, Tablet, Undo2 } from "lucide-react";

export function SignaturePad({ onSignatureChange, disabled = false }) {
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const strokeCountRef = useRef(0);
  const hasSignatureRef = useRef(false);

  // Smooth drawing refs
  const pointsRef = useRef([]);
  const lastWidthRef = useRef(2.5);
  const strokesHistoryRef = useRef([]);

  const [hasSignature, setHasSignature] = useState(false);
  const [isTabletActive, setIsTabletActive] = useState(false);

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

  const redrawAllStrokes = useCallback((ctx, width, height) => {
    ctx.clearRect(0, 0, width, height);
    drawGuide(ctx, width, height);

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#38bdf8";

    for (const stroke of strokesHistoryRef.current) {
      if (stroke.length === 1) {
        ctx.beginPath();
        ctx.arc(stroke[0].x, stroke[0].y, stroke[0].w / 2, 0, Math.PI * 2);
        ctx.fillStyle = "#38bdf8";
        ctx.fill();
      } else if (stroke.length === 2) {
        ctx.beginPath();
        ctx.moveTo(stroke[0].x, stroke[0].y);
        ctx.lineTo(stroke[1].x, stroke[1].y);
        ctx.lineWidth = stroke[1].w || 2.5;
        ctx.stroke();
      } else if (stroke.length > 2) {
        for (let i = 2; i < stroke.length; i++) {
          const p0 = stroke[i - 2];
          const p1 = stroke[i - 1];
          const p2 = stroke[i];
          const mid1 = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
          const mid2 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

          ctx.beginPath();
          ctx.moveTo(mid1.x, mid1.y);
          ctx.quadraticCurveTo(p1.x, p1.y, mid2.x, mid2.y);
          ctx.lineWidth = p2.w || 2.5;
          ctx.stroke();
        }
      }
    }
  }, []);

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);

    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    const ctx = canvas.getContext("2d", { willReadFrequently: true, alpha: true });
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    if (strokesHistoryRef.current.length > 0) {
      redrawAllStrokes(ctx, rect.width, rect.height);
    } else {
      drawGuide(ctx, rect.width, rect.height);
    }
  }, [redrawAllStrokes]);

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
      pressure: e.pressure && e.pressure > 0 ? e.pressure : null,
    };
  };

  const emitSignature = useCallback(
    (valid) => {
      const canvas = canvasRef.current;
      if (!canvas || !valid) {
        if (onSignatureChange) onSignatureChange({ hasSignature: false, dataUrl: null });
        return;
      }
      try {
        const dataUrl = canvas.toDataURL("image/png");
        if (onSignatureChange) {
          onSignatureChange({ hasSignature: true, dataUrl });
        }
      } catch (_) {}
    },
    [onSignatureChange]
  );

  const handlePointerDown = (e) => {
    if (disabled) return;
    e.preventDefault();
    try {
      e.target.setPointerCapture(e.pointerId);
    } catch (_) {}

    if (e.pointerType === "pen") {
      setIsTabletActive(true);
    }

    isDrawingRef.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const coords = getCanvasCoords(e);
    let initialWidth = 2.5;
    if (coords.pressure !== null) {
      initialWidth = Math.max(1.5, Math.min(4.5, coords.pressure * 5));
    }
    lastWidthRef.current = initialWidth;
    pointsRef.current = [{ ...coords, w: initialWidth }];

    const ctx = canvas.getContext("2d");
    ctx.beginPath();
    ctx.arc(coords.x, coords.y, initialWidth / 2, 0, Math.PI * 2);
    ctx.fillStyle = "#38bdf8";
    ctx.fill();
  };

  const handlePointerMove = (e) => {
    if (!isDrawingRef.current || disabled) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];

    for (const ev of events) {
      const coords = getCanvasCoords(ev);
      const lastPoint = pointsRef.current[pointsRef.current.length - 1];

      if (lastPoint) {
        const dist = Math.hypot(coords.x - lastPoint.x, coords.y - lastPoint.y);
        if (dist < 1.0) continue;
      }

      let targetWidth = 2.5;
      if (coords.pressure !== null) {
        targetWidth = Math.max(1.5, Math.min(4.5, coords.pressure * 5));
      } else if (lastPoint) {
        const dist = Math.hypot(coords.x - lastPoint.x, coords.y - lastPoint.y);
        targetWidth = Math.max(1.8, Math.min(3.5, 3.2 - Math.min(dist * 0.03, 1.2)));
      }

      const smoothedWidth = lastWidthRef.current * 0.6 + targetWidth * 0.4;
      lastWidthRef.current = smoothedWidth;

      pointsRef.current.push({ ...coords, w: smoothedWidth });
      strokeCountRef.current += 1;

      const len = pointsRef.current.length;
      if (len >= 3) {
        const p0 = pointsRef.current[len - 3];
        const p1 = pointsRef.current[len - 2];
        const p2 = pointsRef.current[len - 1];

        const mid1 = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
        const mid2 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

        ctx.beginPath();
        ctx.moveTo(mid1.x, mid1.y);
        ctx.quadraticCurveTo(p1.x, p1.y, mid2.x, mid2.y);
        ctx.lineWidth = smoothedWidth;
        ctx.strokeStyle = "#38bdf8";
        ctx.stroke();
      } else if (len === 2) {
        const p0 = pointsRef.current[0];
        const p1 = pointsRef.current[1];
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.lineWidth = smoothedWidth;
        ctx.strokeStyle = "#38bdf8";
        ctx.stroke();
      }
    }

    if (!hasSignatureRef.current && strokeCountRef.current > 3) {
      hasSignatureRef.current = true;
    }
  };

  const handlePointerUp = (e) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    try {
      e.target.releasePointerCapture(e.pointerId);
    } catch (_) {}

    if (pointsRef.current.length > 0) {
      strokesHistoryRef.current.push([...pointsRef.current]);
      pointsRef.current = [];
    }

    if (hasSignatureRef.current || strokesHistoryRef.current.length > 0) {
      setHasSignature(true);
      emitSignature(true);
    }
  };

  const handleUndo = (e) => {
    if (e) e.preventDefault();
    if (strokesHistoryRef.current.length === 0) return;
    strokesHistoryRef.current.pop();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");

    redrawAllStrokes(ctx, rect.width, rect.height);

    if (strokesHistoryRef.current.length === 0) {
      strokeCountRef.current = 0;
      hasSignatureRef.current = false;
      setHasSignature(false);
      emitSignature(false);
    } else {
      emitSignature(true);
    }
  };

  const handleClear = (e) => {
    if (e) e.preventDefault();
    strokesHistoryRef.current = [];
    pointsRef.current = [];
    strokeCountRef.current = 0;
    hasSignatureRef.current = false;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, rect.width, rect.height);
    drawGuide(ctx, rect.width, rect.height);

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
          className={`w-full h-full touch-none cursor-crosshair select-none ${
            disabled ? "opacity-40 pointer-events-none" : ""
          }`}
          style={{ touchAction: "none" }}
        />

        {/* Undo & Clear Buttons */}
        {hasSignature && !disabled && (
          <div className="absolute top-2 right-2 flex items-center gap-1">
            <button
              type="button"
              onClick={handleUndo}
              className="px-2 py-1 rounded-md bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-mono font-bold flex items-center gap-1 transition shadow-lg backdrop-blur-sm cursor-pointer"
              title="Undo last stroke"
            >
              <Undo2 className="w-3 h-3" /> Undo
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="px-2 py-1 rounded-md bg-slate-900/90 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 text-[10px] font-mono font-bold flex items-center gap-1 transition shadow-lg backdrop-blur-sm cursor-pointer"
              title="Clear signature"
            >
              <RotateCcw className="w-3 h-3" /> Clear
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
        <span>Use Huion H640P tablet stylus or pointer to sign</span>
        <span>Smooth Vector Ink</span>
      </div>
    </div>
  );
}
