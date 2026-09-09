// Web Audio & Voice Synthesizer Utility
let audioCtx = null;

export function playSound(type = "beep", enabled = true) {
  if (!enabled || typeof window === "undefined") return;
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === "beep") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === "success") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.08); // A5
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === "warning") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.setValueAtTime(240, now + 0.12);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === "alert" || type === "siren") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(750, now);
      osc.frequency.linearRampToValueAtTime(350, now + 0.2);
      osc.frequency.linearRampToValueAtTime(750, now + 0.4);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.start(now);
      osc.stop(now + 0.45);
    }
  } catch (e) {
    console.warn("WebAudio playback error:", e);
  }
}

const voiceDebounce = {};

export function speakVoice(text, debounceKey = null, cooldownMs = 5000, enabled = true) {
  if (!enabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;

  const now = Date.now();
  if (debounceKey) {
    if (voiceDebounce[debounceKey] && now - voiceDebounce[debounceKey] < cooldownMs) {
      return;
    }
    voiceDebounce[debounceKey] = now;
  }

  try {
    window.speechSynthesis.cancel(); // cancel previous queued speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn("TTS SpeechSynthesis error:", e);
  }
}
