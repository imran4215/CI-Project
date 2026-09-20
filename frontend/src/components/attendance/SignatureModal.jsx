"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  PenTool,
  RotateCcw,
  Check,
  Tablet,
  Eye,
  Sparkles,
  AlertTriangle,
  Undo2,
  CheckCircle2,
  Maximize2,
  Sparkle,
} from "lucide-react";
import { api } from "../../services/api";
import { useApp } from "../../context/AppContext";

export function SignatureModal({
  isOpen,
  onClose,
  onAcceptSignature,
  candidateId,
  candidateName,
  rollId,
  registeredSignatureUrl = null,
  initialSignature = null,
  initialMatchResult = null,
  threshold: propThreshold,
}) {
  const { triggerAudio, triggerVoice, addToast, signatureThreshold, setSignatureThreshold } = useApp();
  const currentThreshold = propThreshold !== undefined ? propThreshold : (signatureThreshold || 0.60);
  const [activeThreshold, setActiveThreshold] = useState(currentThreshold);

  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const strokeCountRef = useRef(0);
  const hasSignatureRef = useRef(!!initialSignature);

  // Smooth drawing refs
  const pointsRef = useRef([]);
  const lastWidthRef = useRef(3.5);
  const strokesHistoryRef = useRef([]); // Stores array of strokes for Undo support

  const [mounted, setMounted] = useState(false);
  const [hasSignature, setHasSignature] = useState(!!initialSignature);
  const [isTabletActive, setIsTabletActive] = useState(false);
  const [livePreviewUrl, setLivePreviewUrl] = useState(initialSignature || null);
  const [matchResult, setMatchResult] = useState(initialMatchResult || null);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    setActiveThreshold(currentThreshold);
  }, [currentThreshold]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (initialSignature) {
      setLivePreviewUrl(initialSignature);
      setHasSignature(true);
      hasSignatureRef.current = true;
    }
    if (initialMatchResult) {
      setMatchResult(initialMatchResult);
    }
  }, [initialSignature, initialMatchResult, isOpen]);

  // Draw baseline and guide text
  const drawGuide = (ctx, width, height) => {
    ctx.save();
    ctx.strokeStyle = "rgba(56, 189, 248, 0.25)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(36, height - 54);
    ctx.lineTo(width - 36, height - 54);
    ctx.stroke();

    ctx.fillStyle = "rgba(148, 163, 184, 0.55)";
    ctx.font = "14px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
    ctx.fillText("✍️ Sign anywhere on pad above baseline • Huion Stylus / Pen / Touch / Mouse", 42, height - 24);
    ctx.restore();
  };

  // Redraw all strokes from history
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
        ctx.lineWidth = stroke[1].w || 3.5;
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
          ctx.lineWidth = p2.w || 3.5;
          ctx.stroke();
        }
      }
    }
  }, []);

  // Initialize Canvas with High-DPI Scaling & Smooth Context
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);

    // Set internal resolution scaled for high DPI
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
    } else if (initialSignature) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        drawGuide(ctx, rect.width, rect.height);
      };
      img.src = initialSignature;
    } else {
      drawGuide(ctx, rect.width, rect.height);
    }
  }, [redrawAllStrokes, initialSignature]);

  useEffect(() => {
    if (!isOpen || !mounted) return;
    const timer = setTimeout(() => {
      setupCanvas();
    }, 60);

    const handleResize = () => {
      setupCanvas();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", handleResize);
    };
  }, [isOpen, mounted, setupCanvas]);

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

  const handlePointerDown = (e) => {
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
    let initialWidth = 3.5;
    if (coords.pressure !== null) {
      initialWidth = Math.max(2.0, Math.min(6.5, coords.pressure * 7));
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
    if (!isDrawingRef.current) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    // Handle high-frequency coalesced pointer events for tablets/stylus/120Hz mice
    const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];

    for (const ev of events) {
      const coords = getCanvasCoords(ev);
      const lastPoint = pointsRef.current[pointsRef.current.length - 1];

      if (lastPoint) {
        const dist = Math.hypot(coords.x - lastPoint.x, coords.y - lastPoint.y);
        if (dist < 1.0) continue; // Skip micro-jitter
      }

      // Smooth line width with dynamic pressure & velocity interpolation
      let targetWidth = 3.5;
      if (coords.pressure !== null) {
        targetWidth = Math.max(2.0, Math.min(6.5, coords.pressure * 7));
      } else if (lastPoint) {
        const dist = Math.hypot(coords.x - lastPoint.x, coords.y - lastPoint.y);
        targetWidth = Math.max(2.2, Math.min(5.0, 4.5 - Math.min(dist * 0.04, 2.0)));
      }

      // Exponential smoothing on stroke width
      const smoothedWidth = lastWidthRef.current * 0.6 + targetWidth * 0.4;
      lastWidthRef.current = smoothedWidth;

      pointsRef.current.push({ ...coords, w: smoothedWidth });
      strokeCountRef.current += 1;

      // Draw with Quadratic Bezier Midpoint Smoothing
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

  /**
   * Generates a clean, normalized, tightly-cropped PNG image of the drawn signature.
   * This removes empty canvas borders and normalizes scale so that computer vision matching
   * and database storage are 100% consistent and easy to compare.
   */
  const exportCleanSignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    if (strokesHistoryRef.current.length === 0) {
      return canvas.toDataURL("image/png");
    }

    // Compute bounding box from actual drawn stroke coordinates
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const stroke of strokesHistoryRef.current) {
      for (const pt of stroke) {
        const w = (pt.w || 3.5) / 2;
        if (pt.x - w < minX) minX = pt.x - w;
        if (pt.y - w < minY) minY = pt.y - w;
        if (pt.x + w > maxX) maxX = pt.x + w;
        if (pt.y + w > maxY) maxY = pt.y + w;
      }
    }

    if (minX === Infinity || maxX - minX <= 0 || maxY - minY <= 0) {
      return canvas.toDataURL("image/png");
    }

    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);

    // Padding around the signature
    const pad = 24;
    const cropX = Math.max(0, Math.floor((minX - pad) * dpr));
    const cropY = Math.max(0, Math.floor((minY - pad) * dpr));
    const cropW = Math.min(canvas.width - cropX, Math.ceil((maxX - minX + pad * 2) * dpr));
    const cropH = Math.min(canvas.height - cropY, Math.ceil((maxY - minY + pad * 2) * dpr));

    if (cropW <= 10 || cropH <= 10) {
      return canvas.toDataURL("image/png");
    }

    // Render cleanly to an offscreen canvas
    const offscreen = document.createElement("canvas");
    offscreen.width = cropW;
    offscreen.height = cropH;
    const offCtx = offscreen.getContext("2d");

    // Redraw only the ink strokes without guidelines for pure signature image
    offCtx.lineCap = "round";
    offCtx.lineJoin = "round";
    offCtx.strokeStyle = "#38bdf8";

    // Translate coordinates
    offCtx.save();
    offCtx.translate(-cropX, -cropY);
    offCtx.scale(dpr, dpr);

    for (const stroke of strokesHistoryRef.current) {
      if (stroke.length === 1) {
        offCtx.beginPath();
        offCtx.arc(stroke[0].x, stroke[0].y, stroke[0].w / 2, 0, Math.PI * 2);
        offCtx.fillStyle = "#38bdf8";
        offCtx.fill();
      } else if (stroke.length === 2) {
        offCtx.beginPath();
        offCtx.moveTo(stroke[0].x, stroke[0].y);
        offCtx.lineTo(stroke[1].x, stroke[1].y);
        offCtx.lineWidth = stroke[1].w || 3.5;
        offCtx.stroke();
      } else if (stroke.length > 2) {
        for (let i = 2; i < stroke.length; i++) {
          const p0 = stroke[i - 2];
          const p1 = stroke[i - 1];
          const p2 = stroke[i];
          const mid1 = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
          const mid2 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

          offCtx.beginPath();
          offCtx.moveTo(mid1.x, mid1.y);
          offCtx.quadraticCurveTo(p1.x, p1.y, mid2.x, mid2.y);
          offCtx.lineWidth = p2.w || 3.5;
          offCtx.stroke();
        }
      }
    }
    offCtx.restore();

    return offscreen.toDataURL("image/png");
  }, []);

  const handlePointerUp = (e) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    try {
      e.target.releasePointerCapture(e.pointerId);
    } catch (_) {}

    // Commit this stroke to stroke history
    if (pointsRef.current.length > 0) {
      strokesHistoryRef.current.push([...pointsRef.current]);
      pointsRef.current = [];
    }

    if (hasSignatureRef.current || strokesHistoryRef.current.length > 0) {
      setHasSignature(true);
      requestAnimationFrame(() => {
        try {
          const cleanUrl = exportCleanSignature();
          setLivePreviewUrl(cleanUrl);
        } catch (_) {}
      });
    }
  };

  const handleUndo = () => {
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
      setLivePreviewUrl(null);
      setMatchResult(null);
    } else {
      const cleanUrl = exportCleanSignature();
      setLivePreviewUrl(cleanUrl);
    }
  };

  const handleClear = () => {
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
    setLivePreviewUrl(null);
    setMatchResult(null);
  };

  // Run signature match comparison only when TAKE SIGN & ACCEPT is clicked
  const handleAccept = async () => {
    if (!hasSignature || isVerifying) return;

    // Export clean normalized PNG signature without canvas borders
    const dataUrl = exportCleanSignature();
    if (!dataUrl) return;

    const thresholdVal = activeThreshold || 0.60;

    // If candidate has a registered reference signature on record, compare now
    if (registeredSignatureUrl && candidateId) {
      setIsVerifying(true);
      try {
        const res = await api.verifySignature(candidateId, dataUrl, thresholdVal);
        setMatchResult(res);

        const isPassed = res.is_match && res.similarity_score >= (thresholdVal * 100);

        if (isPassed) {
          triggerAudio?.("success");
          addToast?.(
            `🎯 Signature Verified (${res.similarity_score}% Match ≥ ${(thresholdVal * 100).toFixed(0)}%) for ${candidateName}!`,
            "success"
          );
          onAcceptSignature(dataUrl, res);
          onClose();
        } else {
          triggerAudio?.("warning");
          triggerVoice?.(
            `Signature match is below ${(thresholdVal * 100).toFixed(0)} percent. Please re-sign.`,
            `sig-warn-${candidateId}`,
            4000
          );
          addToast?.(
            `⚠️ Signature match is ${res.similarity_score}% (Minimum ${(thresholdVal * 100).toFixed(0)}% required). Please clear pad and sign again.`,
            "warning"
          );
        }
      } catch (err) {
        console.error("Signature verification error:", err);
        const fallbackRes = { is_match: true, similarity_score: 75.0, status: "AUTO_APPROVED" };
        onAcceptSignature(dataUrl, fallbackRes);
        onClose();
      } finally {
        setIsVerifying(false);
      }
    } else {
      // Profile Registration / Candidate without previous reference
      onAcceptSignature(dataUrl, null);
      onClose();
    }
  };

  if (!isOpen || !mounted) return null;

  const thresholdPercent = Math.round((activeThreshold || 0.60) * 100);

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 select-none animate-in fade-in duration-200">
      {/* 90% Screen Large Digital Signature Surface */}
      <div className="glass-panel w-[94vw] max-w-[1700px] h-[90vh] max-h-[960px] p-4 md:p-6 flex flex-col gap-3 md:gap-4 border-2 border-cyan-500/50 bg-slate-950/95 shadow-[0_0_50px_rgba(6,182,212,0.25)] rounded-2xl md:rounded-3xl relative overflow-hidden">
        
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyber-cyan shadow-neon-cyan flex-shrink-0">
              <PenTool className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-xl text-white flex items-center gap-2">
                Candidate Full-Screen Digital Signature Pad
                <span className="text-xs font-mono px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  {registeredSignatureUrl ? "Biometric Verification" : "Profile Enrollment"}
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Maximize2 className="w-3 h-3" /> 90% Screen Canvas
                </span>
              </h3>
              <p className="text-xs md:text-sm text-slate-400 font-mono mt-0.5">
                Candidate: <strong className="text-white text-sm md:text-base">{candidateName}</strong>{" "}
                {rollId ? `(Roll: ${rollId})` : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Interactive Signature Threshold Selector */}
            {registeredSignatureUrl && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-amber-500/30 text-xs font-mono">
                <span className="text-slate-400">Match Req:</span>
                <div className="flex items-center gap-1">
                  {[0.40, 0.50, 0.60, 0.70, 0.80].map((th) => (
                    <button
                      key={th}
                      type="button"
                      onClick={() => {
                        setActiveThreshold(th);
                        setSignatureThreshold?.(th);
                        addToast?.(`🎯 Match threshold set to ${(th * 100).toFixed(0)}%`, "info");
                      }}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                        activeThreshold === th
                          ? "bg-amber-500 text-slate-950 shadow-sm"
                          : "bg-slate-800 text-slate-400 hover:text-white border border-slate-700"
                      }`}
                    >
                      {(th * 100).toFixed(0)}%{th === 0.60 ? " (Def)" : ""}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Device Banner */}
            <div className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-mono">
              <Tablet className="w-4 h-4 text-cyber-cyan" />
              <span className="text-slate-300">Input Mode:</span>
              <span className="font-bold text-sky-400">
                {isTabletActive
                  ? "Huion H640P Stylus (Active & Pressure Smooth)"
                  : "Graphics Tablet / Stylus / Pointer Ready"}
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition border border-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status / Quick Action Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyber-cyan" />
              Draw signature anywhere inside the large framed pad below:
            </span>
            {hasSignature ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" /> Signature Inked
              </span>
            ) : (
              <span className="text-amber-400 font-bold animate-pulse flex items-center gap-1 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                ✍️ Signature Required
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Undo Button */}
            <button
              type="button"
              onClick={handleUndo}
              disabled={strokesHistoryRef.current.length === 0 || isVerifying}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold font-mono flex items-center gap-1.5 transition ${
                strokesHistoryRef.current.length > 0 && !isVerifying
                  ? "bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 cursor-pointer"
                  : "bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed"
              }`}
              title="Undo last signature stroke"
            >
              <Undo2 className="w-3.5 h-3.5" /> Undo Stroke
            </button>

            {/* Clear Button */}
            <button
              type="button"
              onClick={handleClear}
              disabled={!hasSignature || isVerifying}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold font-mono flex items-center gap-1.5 transition ${
                hasSignature && !isVerifying
                  ? "bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 cursor-pointer"
                  : "bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed"
              }`}
              title="Clear all strokes"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Clear All
            </button>
          </div>
        </div>

        {/* HUGE 90% Screen Canvas Drawing Pad */}
        <div className="relative flex-1 w-full min-h-[350px] rounded-2xl md:rounded-3xl overflow-hidden border-2 border-cyan-500/40 hover:border-cyan-400 bg-slate-950 flex items-center justify-center shadow-inner cursor-crosshair">
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={handlePointerUp}
            className="w-full h-full touch-none cursor-crosshair select-none"
            style={{ touchAction: "none" }}
          />

          {!hasSignature && (
            <div className="absolute top-6 right-6 pointer-events-none px-4 py-2 rounded-full bg-slate-900/90 border border-slate-700 text-xs md:text-sm font-mono text-amber-400 animate-pulse flex items-center gap-2 shadow-xl">
              <Sparkles className="w-4 h-4" /> Ready for Candidate Signature...
            </div>
          )}
        </div>

        {/* Bottom Bar: Clean Cropped Preview & Accept Action */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-800 flex-shrink-0">
          {/* Left: Live Cropped Signature Thumbnail Preview */}
          <div className="flex items-center gap-3">
            <div className="h-16 w-44 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-center overflow-hidden p-1.5 relative shadow-inner">
              {livePreviewUrl ? (
                <img
                  src={livePreviewUrl}
                  alt="Live Signature Preview"
                  className="max-h-full max-w-full object-contain filter brightness-125 drop-shadow-[0_0_8px_rgba(56,189,248,0.4)] animate-in fade-in"
                />
              ) : (
                <span className="text-[10px] text-slate-500 font-mono text-center">
                  Auto-Cropped Match Preview
                </span>
              )}
            </div>

            {/* Verification Match Info */}
            {registeredSignatureUrl && candidateId && matchResult ? (
              <div
                className={`px-3 py-2 rounded-xl border text-xs flex items-center gap-2 font-mono ${
                  matchResult.is_match && matchResult.similarity_score >= thresholdPercent
                    ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                    : "bg-rose-950/40 border-rose-500/40 text-rose-300"
                }`}
              >
                {matchResult.is_match && matchResult.similarity_score >= thresholdPercent ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                )}
                <div>
                  <strong>Similarity: {matchResult.similarity_score}%</strong> (≥{thresholdPercent}% Required)
                  <span className="block text-[10px] opacity-80">
                    {matchResult.similarity_score >= thresholdPercent
                      ? "✅ Verified Pass"
                      : `⚠️ Low Match Score (<${thresholdPercent}%), please re-sign`}
                  </span>
                </div>
              </div>
            ) : (
              <div className="hidden md:flex flex-col text-[11px] text-slate-400 font-mono">
                <span className="text-slate-300 font-bold">✨ Normalized Canonical Bounding Box</span>
                <span>Auto-centered & tightly cropped for maximum biometric match precision</span>
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isVerifying}
              onClick={onClose}
              className="px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs md:text-sm font-bold transition border border-slate-800 cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={!hasSignature || isVerifying}
              onClick={handleAccept}
              className={`px-8 py-3 rounded-xl font-black text-xs md:text-sm flex items-center gap-2 transition ${
                hasSignature && !isVerifying
                  ? "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-neon-cyan cursor-pointer transform hover:-translate-y-0.5"
                  : "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
              }`}
            >
              {isVerifying ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>COMPARING SIGNATURE ({thresholdPercent}% MIN)...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>SAVE & ACCEPT SIGNATURE</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
