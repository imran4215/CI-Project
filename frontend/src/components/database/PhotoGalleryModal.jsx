"use client";

import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import {
  X,
  User,
  CreditCard,
  Building2,
  PenTool,
  Camera,
  CheckCircle2,
  Copy,
  Check,
} from "lucide-react";

export function PhotoGalleryModal({ user, onClose }) {
  const { addToast } = useApp();
  const [copiedRfid, setCopiedRfid] = useState(false);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState(null);

  if (!user) return null;

  const images = user.images || {};
  const firstImg = images ? Object.values(images)[0] : "";
  const avatarUrl = firstImg ? `/api/${firstImg}` : "";
  const signatureUrl = user.signature ? `/api/${user.signature}` : "";

  const handleCopyRfid = () => {
    if (!user.rfid_tag) return;
    navigator.clipboard.writeText(user.rfid_tag);
    setCopiedRfid(true);
    addToast(`Copied RFID Tag "${user.rfid_tag}" to clipboard`, "info");
    setTimeout(() => setCopiedRfid(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="glass-panel w-full max-w-2xl p-6 flex flex-col gap-5 border-sky-500/30 my-auto animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/80">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-cyan-500/40 bg-slate-950 flex items-center justify-center flex-shrink-0 shadow-neon-cyan">
              {avatarUrl ? (
                <img src={avatarUrl} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-6 h-6 text-cyan-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">{user.name}</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  ENROLLED
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                <span>ROLL: <strong className="text-cyan-400">{user.roll_id || "N/A"}</strong></span>
                <span>&bull;</span>
                <span className="text-slate-300">{user.department || "General"}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Grid Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* RFID Smart ID Card Box */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-cyan-400" />
                RFID Student ID Card UID
              </span>
              {user.rfid_tag ? (
                <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  ACTIVE
                </span>
              ) : (
                <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  UNLINKED
                </span>
              )}
            </div>

            <div className="flex items-center justify-between bg-slate-950 p-2 rounded-lg border border-slate-800 font-mono">
              <span className="font-bold text-cyan-300 tracking-wider">
                {user.rfid_tag || "No RFID Card Attached"}
              </span>
              {user.rfid_tag && (
                <button
                  onClick={handleCopyRfid}
                  className="p-1 text-slate-400 hover:text-cyan-300 transition"
                  title="Copy Tag UID"
                >
                  {copiedRfid ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          </div>

          {/* Department & Academic Track */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col gap-1.5">
            <span className="text-slate-400 font-semibold flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-sky-400" />
              Department & Faculty
            </span>
            <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 flex flex-col">
              <span className="font-bold text-white truncate">{user.department || "Computer Science & Eng."}</span>
              <span className="text-[10px] text-slate-500 font-mono">Candidate ID: {user.id}</span>
            </div>
          </div>
        </div>

        {/* 5-Angle Facial Poses Gallery */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-cyber-cyan" />
              5-Angle Biometric Facial Embeddings ({Object.keys(images).length || 5} Poses)
            </span>
            <span className="text-[10px] font-mono text-cyan-400">ArcFace / Cosine Vector</span>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {Object.entries(images).length > 0 ? (
              Object.entries(images).map(([angle, path]) => (
                <div
                  key={angle}
                  onClick={() => setSelectedPreviewImage(`/api/${path}`)}
                  className="flex flex-col gap-1 cursor-pointer group"
                >
                  <div className="w-full aspect-square rounded-lg overflow-hidden border border-slate-700 group-hover:border-cyan-400 bg-slate-950 transition-colors shadow-sm">
                    <img src={`/api/${path}`} alt={angle} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  </div>
                  <span className="text-[10px] font-mono text-center font-bold text-cyan-300 uppercase tracking-wider group-hover:text-cyan-200">
                    {angle}
                  </span>
                </div>
              ))
            ) : (
              <div className="col-span-5 text-center py-4 text-slate-500 font-mono text-xs">
                No individual angle photos found on storage.
              </div>
            )}
          </div>
        </div>

        {/* Official Reference Digital Signature */}
        <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <PenTool className="w-4 h-4 text-emerald-400" />
              Official Reference Digital Signature
            </span>
            {signatureUrl && (
              <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                <CheckCircle2 className="w-3 h-3" /> VERIFIED 50%+ THRESHOLD
              </span>
            )}
          </div>

          <div className="w-full h-24 rounded-xl overflow-hidden border border-emerald-500/40 bg-slate-950 flex items-center justify-center p-2 shadow-inner">
            {signatureUrl ? (
              <img
                src={signatureUrl}
                alt="Registered Signature"
                className="w-full h-full object-contain filter brightness-125 drop-shadow-[0_0_8px_rgba(56,189,248,0.35)]"
              />
            ) : (
              <span className="text-xs font-mono text-slate-500">No Reference Signature Captured</span>
            )}
          </div>
        </div>

        {/* Modal Close Button */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition border border-slate-700 cursor-pointer"
          >
            Close Details
          </button>
        </div>
      </div>

      {/* Large Image Preview Lightbox */}
      {selectedPreviewImage && (
        <div
          className="fixed inset-0 z-60 bg-slate-950/90 backdrop-blur-lg flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setSelectedPreviewImage(null)}
        >
          <div className="relative max-w-lg max-h-[80vh] rounded-2xl overflow-hidden border-2 border-cyan-500/50 shadow-2xl">
            <img src={selectedPreviewImage} alt="Preview" className="w-full h-full object-contain" />
            <button
              onClick={() => setSelectedPreviewImage(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-950/80 text-white hover:bg-rose-600 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
