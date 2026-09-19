// Web Audio API sound generator (no asset files needed)

let audioCtx: AudioContext | null = null;

export function initAudio() {
  if (typeof window === 'undefined') return;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      return;
    }
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// Auto-init on first user interaction (any pointer/key event)
if (typeof window !== 'undefined') {
  const handler = () => {
    initAudio();
    window.removeEventListener('pointerdown', handler);
    window.removeEventListener('keydown', handler);
    window.removeEventListener('touchstart', handler);
  };
  window.addEventListener('pointerdown', handler, { once: true, passive: true });
  window.addEventListener('touchstart', handler, { once: true, passive: true });
  window.addEventListener('keydown', handler, { once: true, passive: true });
}

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.2, attack = 0.005) {
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + attack);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

export const sfx = {
  place: () => playTone(440, 0.08, 'triangle', 0.15),
  pickup: () => playTone(660, 0.05, 'sine', 0.1),
  clear: () => {
    playTone(523, 0.12, 'triangle', 0.25);
    setTimeout(() => playTone(659, 0.12, 'triangle', 0.25), 60);
    setTimeout(() => playTone(784, 0.18, 'triangle', 0.3), 120);
  },
  bigClear: () => {
    playTone(523, 0.1, 'triangle', 0.3);
    setTimeout(() => playTone(659, 0.1, 'triangle', 0.3), 50);
    setTimeout(() => playTone(784, 0.1, 'triangle', 0.3), 100);
    setTimeout(() => playTone(1047, 0.2, 'triangle', 0.35), 150);
  },
  combo: () => {
    for (let i = 0; i < 4; i++) {
      setTimeout(() => playTone(800 + i * 200, 0.08, 'sine', 0.25), i * 50);
    }
  },
  gameOver: () => {
    playTone(400, 0.2, 'sawtooth', 0.2);
    setTimeout(() => playTone(300, 0.2, 'sawtooth', 0.2), 200);
    setTimeout(() => playTone(200, 0.4, 'sawtooth', 0.25), 400);
  },
  win: () => {
    const notes = [523, 659, 784, 1047, 1319];
    notes.forEach((n, i) => setTimeout(() => playTone(n, 0.15, 'triangle', 0.3), i * 100));
  },
  click: () => playTone(800, 0.04, 'sine', 0.08),
  error: () => playTone(200, 0.2, 'sawtooth', 0.15),
};
