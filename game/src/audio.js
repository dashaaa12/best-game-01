// audio.js — every sound in EMBERFALL is synthesised with WebAudio at the
// moment it plays: short oscillator blips and filtered noise bursts. There
// are no audio files and nothing is fetched.
//
// The context is created lazily on the first user gesture (starting the
// game), which is when browsers allow sound to begin.

let ctx = null;
let master = null;

/** Create the context if needed and make sure it is running. */
export function initAudio() {
  if (ctx === null) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC === undefined) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
}

function ready() {
  return ctx !== null && master !== null;
}

/** One oscillator note with an exponential decay envelope. */
function tone({ type = 'square', from = 440, to = null, dur = 0.12, vol = 0.5, delay = 0 }) {
  if (!ready()) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t0);
  if (to !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(gain).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/** One burst of white noise through a sweeping low-pass filter. */
function noiseBurst({ dur = 0.25, vol = 0.6, from = 3200, to = 240, delay = 0 }) {
  if (!ready()) return;
  const t0 = ctx.currentTime + delay;
  const length = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(from, t0);
  filter.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  source.connect(filter).connect(gain).connect(master);
  source.start(t0);
}

export const sfx = {
  shoot() {
    tone({ type: 'square', from: 880, to: 320, dur: 0.07, vol: 0.16 });
  },
  hit() {
    noiseBurst({ dur: 0.06, vol: 0.22, from: 4000, to: 900 });
  },
  explosion(big = false) {
    noiseBurst({ dur: big ? 0.5 : 0.3, vol: big ? 0.8 : 0.5, from: 2600, to: 120 });
    tone({ type: 'triangle', from: big ? 220 : 300, to: 40, dur: big ? 0.45 : 0.28, vol: 0.4 });
  },
  hurt() {
    tone({ type: 'sawtooth', from: 300, to: 70, dur: 0.25, vol: 0.5 });
    noiseBurst({ dur: 0.18, vol: 0.3, from: 1500, to: 200 });
  },
  dash() {
    noiseBurst({ dur: 0.16, vol: 0.25, from: 600, to: 3600 });
  },
  waveStart() {
    tone({ type: 'triangle', from: 392, dur: 0.14, vol: 0.4 });
    tone({ type: 'triangle', from: 587, dur: 0.2, vol: 0.4, delay: 0.12 });
  },
  waveClear() {
    tone({ type: 'triangle', from: 523, dur: 0.12, vol: 0.35 });
    tone({ type: 'triangle', from: 659, dur: 0.12, vol: 0.35, delay: 0.1 });
    tone({ type: 'triangle', from: 784, dur: 0.22, vol: 0.35, delay: 0.2 });
  },
  gameOver() {
    tone({ type: 'triangle', from: 392, to: 196, dur: 0.7, vol: 0.45 });
    tone({ type: 'triangle', from: 311, to: 155, dur: 0.9, vol: 0.35, delay: 0.25 });
  },
};
