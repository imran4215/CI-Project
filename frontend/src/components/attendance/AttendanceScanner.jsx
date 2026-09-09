"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { useApp } from "../../context/AppContext";
import { api } from "../../services/api";
import { drawFaceDetections } from "../../utils/faceDrawing";
import { Camera, RefreshCw, Layers, ShieldCheck, Activity } from "lucide-react";

export function AttendanceScanner({ onCandidateDetected, isPaused = false, onUnlockScanner }) {
  const {
    activeRoomId,
    threshold,
    isMirrored,
    selectedDeviceId,
    triggerAudio,
    triggerVoice,
  } = useApp();

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const isProcessingRef = useRef(false);

  const [fps, setFps] = useState(0);
  const [inferenceTime, setInferenceTime] = useState(0);
  const [faceCount, setFaceCount] = useState(0);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const fpsTracker = useRef({ count: 0, lastTime: performance.now() });

  // Start Camera Stream
  const startCamera = useCallback(async () => {
    try {
      setCameraError("");
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const constraints = {
        video: selectedDeviceId
          ? { deviceId: { exact: selectedDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setIsCameraActive(true);
        };
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setCameraError(err.message || "Failed to access webcam");
      setIsCameraActive(false);
    }
  }, [selectedDeviceId]);

  // Process live frame
  const processFrame = useCallback(async () => {
    if (isPaused) {
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      return;
    }

    if (!videoRef.current || !canvasRef.current || isProcessingRef.current) return;
    if (videoRef.current.readyState < 2) return;

    isProcessingRef.current = true;
    const startTime = performance.now();

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
      }

      // Capture frame snapshot to offscreen canvas
      const captureCanvas = document.createElement("canvas");
      captureCanvas.width = 640;
      captureCanvas.height = Math.round((video.videoHeight / video.videoWidth) * 640) || 480;
      const ctx = captureCanvas.getContext("2d");
      ctx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
      const b64Image = captureCanvas.toDataURL("image/jpeg", 0.7);

      // Call API
      const result = await api.recognizeFrame(b64Image, threshold, activeRoomId);
      const faces = result.faces || [];
      const latency = Math.round(performance.now() - startTime);

      setInferenceTime(latency);
      setFaceCount(faces.length);

      // Draw overlay bounding boxes with exact scaling and mirror alignment
      drawFaceDetections(
        canvas,
        faces,
        isMirrored,
        captureCanvas.width,
        captureCanvas.height
      );

      // Notify parent component with detected faces & full video frame snapshot
      onCandidateDetected(faces, video);

      // Calculate FPS
      fpsTracker.current.count++;
      const now = performance.now();
      if (now - fpsTracker.current.lastTime >= 1000) {
        setFps(Math.round((fpsTracker.current.count * 1000) / (now - fpsTracker.current.lastTime)));
        fpsTracker.current.count = 0;
        fpsTracker.current.lastTime = now;
      }
    } catch (err) {
      console.warn("Recognition loop error:", err);
    } finally {
      isProcessingRef.current = false;
    }
  }, [activeRoomId, threshold, isMirrored, onCandidateDetected, isPaused]);

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [startCamera]);

  useEffect(() => {
    let intervalId;
    if (isCameraActive) {
      intervalId = setInterval(processFrame, 220); // ~4.5 FPS recognition rate
    }
    return () => clearInterval(intervalId);
  }, [isCameraActive, processFrame]);

  return (
    <div className="flex flex-col gap-3">
      {/* Video Viewport Container */}
      <div className="relative w-full aspect-video rounded-xl overflow-hidden glass-panel border-2 border-sky-500/30 bg-slate-950 flex items-center justify-center shadow-2xl">
        <video
          ref={videoRef}
          playsInline
          muted
          className={`w-full h-full object-cover ${isMirrored ? "-scale-x-100" : ""}`}
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
        />

        {/* Live HUD Scan Bar */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-cyan-500/0 via-cyan-500/5 to-cyan-500/0 opacity-60 animate-pulse" />

        {/* Camera Status Overlay */}
        {!isCameraActive && (
          <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center gap-3 p-6 text-center z-20">
            <Camera className="w-12 h-12 text-slate-500 animate-bounce" />
            <h3 className="text-base font-bold text-white">Connecting Live Video Stream</h3>
            {cameraError ? (
              <p className="text-xs text-rose-400 font-mono max-w-sm">{cameraError}</p>
            ) : (
              <p className="text-xs text-slate-400">Requesting camera permissions...</p>
            )}
            <button
              onClick={startCamera}
              className="mt-2 px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-2 hover:bg-cyan-400 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reconnect Camera
            </button>
          </div>
        )}

        {/* Top Viewport Header Tag */}
        <div className="absolute top-3 left-3 z-20 flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-950/80 border border-slate-700/80 text-[11px] font-mono text-slate-300 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-bold text-emerald-400">LIVE FEED</span>
          <span className="text-slate-500">•</span>
          <span>{isMirrored ? "MIRRORED" : "NORMAL"}</span>
        </div>

        {/* Locked Verification HUD Badge */}
        {isPaused && (
          <div className="absolute top-3 right-3 z-20 flex items-center gap-2 px-3 py-1 rounded-md bg-cyan-950/90 border border-cyan-500/50 text-[11px] font-mono text-cyan-300 backdrop-blur-md shadow-neon-cyan animate-pulse">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="font-bold">🔒 SCANNER LOCKED • SIGNING MODE</span>
            {onUnlockScanner && (
              <button
                type="button"
                onClick={onUnlockScanner}
                className="ml-1 px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-[10px] transition border border-slate-700"
                title="Unlock camera scanner"
              >
                Unlock
              </button>
            )}
          </div>
        )}
      </div>

      {/* Telemetry Bar Under Video */}
      <div className="w-full glass-card px-4 py-2.5 flex items-center justify-between flex-wrap gap-3 text-xs font-mono">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-cyber-blue" />
          <span className="text-slate-400">HUD FPS:</span>
          <span className="font-bold text-sky-400">{fps}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400">Inference:</span>
          <span className="font-bold text-emerald-400">{inferenceTime} ms</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400">Faces Detected:</span>
          <span className="font-bold text-amber-400">{faceCount}</span>
        </div>
      </div>
    </div>
  );
}
