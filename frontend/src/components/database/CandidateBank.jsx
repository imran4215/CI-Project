"use client";

import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { api } from "../../services/api";
import { PhotoGalleryModal } from "./PhotoGalleryModal";
import { Users, Search, Trash2, Info, UserPlus, CreditCard } from "lucide-react";

export function CandidateBank() {
  const { users, loadUsers, addToast, setActiveTab } = useApp();
  const [search, setSearch] = useState("");
  const [selectedUserForGallery, setSelectedUserForGallery] = useState(null);

  const filtered = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.roll_id?.toLowerCase().includes(q) ||
      u.department?.toLowerCase().includes(q) ||
      u.rfid_tag?.toLowerCase().includes(q)
    );
  });

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete candidate "${name}" and all facial embeddings from the database?`)) return;
    try {
      await api.deleteUser(id);
      addToast(`Candidate ${name} deleted`, "warning");
      await loadUsers();
    } catch (e) {
      addToast(`Delete error: ${e.message}`, "error");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="glass-panel p-6 flex items-center justify-between flex-wrap gap-4 border-sky-500/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyber-cyan">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Registered Candidate Bank</h2>
            <p className="text-xs text-slate-400">Total {users.length} candidates enrolled with 5-angle biometric facial embeddings & RFID cards.</p>
          </div>
        </div>

        <button
          onClick={() => setActiveTab("register")}
          className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition shadow-neon-cyan"
        >
          <UserPlus className="w-4 h-4" /> Add Candidate
        </button>
      </div>

      {/* Search */}
      <div className="glass-panel p-6 flex flex-col gap-4 border-sky-500/20">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search candidate by name, roll ID, department, or RFID tag..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyber-cyan"
          />
        </div>

        {/* Candidates Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
          {filtered.length === 0 ? (
            <div className="col-span-full text-center py-8 text-slate-500 text-xs font-mono">
              No registered candidates found matching criteria.
            </div>
          ) : (
            filtered.map((u) => {
              const firstImg = u.images ? Object.values(u.images)[0] : "";
              const avatarUrl = firstImg ? `/api/${firstImg}` : "";

              return (
                <div key={u.id} className="glass-card p-4 flex flex-col gap-3 border-slate-700/60 hover:border-cyan-500/40 transition">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl overflow-hidden border border-slate-700 bg-slate-950 flex items-center justify-center flex-shrink-0">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={u.name} className="w-full h-full object-cover" />
                      ) : (
                        <Users className="w-6 h-6 text-slate-600" />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <strong className="text-white text-sm truncate">{u.name}</strong>
                      <span className="font-mono text-cyan-400 text-xs">{u.roll_id || "N/A"}</span>
                      <span className="text-[11px] text-slate-400 truncate">{u.department || "General"}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px]">
                    <span className="flex items-center gap-1 font-mono text-[10px] text-slate-400">
                      <CreditCard className="w-3 h-3 text-cyan-400" />
                      {u.rfid_tag ? (
                        <span className="text-cyan-300 font-bold">{u.rfid_tag}</span>
                      ) : (
                        <span className="text-slate-500 italic">No RFID</span>
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedUserForGallery(u)}
                        className="px-2.5 py-1 rounded bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 font-bold flex items-center gap-1.5 transition cursor-pointer"
                        title="View Full Candidate Info & Biometrics"
                      >
                        <Info className="w-3.5 h-3.5" /> Info
                      </button>
                      <button
                        onClick={() => handleDelete(u.id, u.name)}
                        className="p-1.5 rounded bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 border border-rose-500/20 transition cursor-pointer"
                        title="Delete Candidate"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Gallery Modal */}
      {selectedUserForGallery && (
        <PhotoGalleryModal
          user={selectedUserForGallery}
          onClose={() => setSelectedUserForGallery(null)}
        />
      )}
    </div>
  );
}
