let ctx: AudioContext | null = null; let master: GainNode | null = null; let muted = false; let drone: OscillatorNode | null = null;
function ensure() { if (!ctx) { try { ctx = new AudioContext(); master = ctx.createGain(); master.gain.value = muted ? 0 : 0.5; master.connect(ctx.destination); } catch { return null; } } if (ctx.state === 'suspended') ctx.resume(); return ctx; }
export function setMuted(m: boolean) { muted = m; if (master) master.gain.value = m ? 0 : 0.5; }
function tone(f: number, dur: number, type: OscillatorType = 'sine', vol = 0.2, slide = 0, delay = 0) {
  const c = ensure(); if (!c || !master || muted) return; const o = c.createOscillator(), g = c.createGain(); const t = c.currentTime + delay; o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f + slide), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
}
export function sfx(n: string) {
  switch (n) {
    case 'ping': tone(1200, 1.2, 'sine', 0.22, -700); break; case 'click': tone(600, 0.06, 'square', 0.05); break;
    case 'coin': tone(880, 0.1, 'triangle', 0.12); tone(1320, 0.18, 'triangle', 0.12, 0, 0.08); break; case 'mine': tone(110, 0.15, 'sawtooth', 0.06, -30); break;
    case 'machine': tone(80, 0.4, 'sawtooth', 0.07, 30); break; case 'dock': tone(220, 0.3, 'triangle', 0.12); tone(330, 0.3, 'triangle', 0.1, 0, 0.15); break;
    case 'upgrade': [440, 554, 659, 880].forEach((f, i) => tone(f, 0.25, 'triangle', 0.1, 0, i * 0.09)); break;
    case 'alarm': tone(500, 0.2, 'square', 0.08); tone(400, 0.2, 'square', 0.08, 0, 0.22); break;
    case 'discovery': [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.6, 'sine', 0.13, 0, i * 0.12)); break;
    case 'mystery': tone(55, 3, 'sine', 0.25, -10); tone(311, 2.5, 'sine', 0.08, 8, 0.4); tone(317, 2.5, 'sine', 0.06, -8, 0.4); break;
  }
}
export function startAmbience() { const c = ensure(); if (!c || !master || drone) return; drone = c.createOscillator(); const g = c.createGain(); drone.type = 'sine'; drone.frequency.value = 48; g.gain.value = 0.05; drone.connect(g); g.connect(master); drone.start(); }
export function setAmbienceDepth(depth: number) { if (drone && ctx) { drone.frequency.setTargetAtTime(Math.max(30, 55 - depth / 400), ctx.currentTime, 1); } }
