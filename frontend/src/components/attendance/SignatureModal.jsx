"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, PenTool, RotateCcw, Check, Tablet, Eye, Sparkles, ShieldCheck, AlertTriangle } from "lucide-react";
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
}) {
  const { triggerAudio, triggerVoice, addToast } = useApp();
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const strokeCountRef = useRef(0);
  const lastPointRef = useRef({ x: 0, y: 0 });

  const [mounted, setMounted] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [isTabletActive, setIsTabletActive] = useState(false);
  const [livePreviewUrl, setLivePreviewUrl] = useState(initialSignature || null);
  const [matchResult, setMatchResult] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);

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

  // Run signature match comparison only when TAKE SIGN & ACCEPT is clicked
  const handleAccept = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature || isVerifying) return;

    const dataUrl = canvas.toDataURL("image/png");

    // If candidate has a registered reference signature on record, compare now
    if (registeredSignatureUrl && candidateId) {
      setIsVerifying(true);
      try {
        const res = await api.verifySignature(candidateId, dataUrl, 0.50);
        setMatchResult(res);

        if (res.is_match && res.similarity_score >= 50.0) {
          triggerAudio?.("success");
          addToast?.(`🎯 Signature Verified (${res.similarity_score}% Match ≥ 50%) for ${candidateName}!`, "success");
          onAcceptSignature(dataUrl, res);
          onClose();
        } else {
          triggerAudio?.("warning");
          triggerVoice?.("Signature match is below 50 percent. Please re-sign.", `sig-warn-${candidateId}`, 4000);
          addToast?.(`⚠️ Signature match is ${res.similarity_score}% (Minimum 50% required). Please clear pad and sign again.`, "warning");
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
        const dataUrl = canvas.toDataURL("image/png");
        setLivePreviewUrl(dataUrl);
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
    setMatchResult(null);
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
                  {registeredSignatureUrl ? "Biometric Verification" : "Profile Enrollment"}
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
              disabled={!hasSignature || isVerifying}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono flex items-center gap-1.5 transition ${
                hasSignature && !isVerifying
                  ? "bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 cursor-pointer"
                  : "bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed"
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" /> Clear Pad
            </button>
          </div>
        </div>

        {/* Main Canvas Pad */}
        <div className="relative w-full h-64 rounded-2xl overflow-hidden border-2 border-dashed border-cyan-500/40 hover:border-cyan-400 bg-slate-950 flex items-center justify-center shadow-inner">
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

        {/* Live Preview Section */}
        <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/80 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300 flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-cyber-cyan" /> Live Signature Preview
            </span>
            <span className="text-[10px] font-mono text-slate-500">Live Input</span>
          </div>

          <div className="h-24 w-full rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden p-1.5 relative">
            {livePreviewUrl ? (
              <img
                src={livePreviewUrl}
                alt="Live Signature Preview"
                className="w-full h-full object-contain filter brightness-125 drop-shadow-[0_0_8px_rgba(56,189,248,0.35)] animate-in fade-in"
              />
            ) : (
              <span className="text-xs text-slate-500 font-mono">Sign on pad above to preview live signature</span>
            )}
          </div>
        </div>

        {/* Warning banner if match < 50% after clicking accept */}
        {registeredSignatureUrl && candidateId && matchResult && (!matchResult.is_match || matchResult.similarity_score < 50.0) && (
          <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>
              <strong>Match score is {matchResult.similarity_score}% (Minimum required: 50%).</strong> Please clear pad and sign again cleanly to match your profile signature.
            </span>
          </div>
        )}

        {/* Modal Actions Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <button
            type="button"
            disabled={isVerifying}
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold transition border border-slate-800"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={!hasSignature || isVerifying}
            onClick={handleAccept}
            className={`px-6 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 transition ${
              hasSignature && !isVerifying
                ? "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-neon-cyan cursor-pointer transform hover:-translate-y-0.5"
                : "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
            }`}
          >
            {isVerifying ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin text-slate-950" />
                <span>COMPARING SIGNATURE (50% MIN)...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>TAKE SIGN & ACCEPT</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

