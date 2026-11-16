// particles.js — the particle pool and the floating score texts.
//
// One flat pool of sparks, embers and glow motes covers hit sparks, death
// bursts, dash trails and the muzzle glow, so effects never allocate in the
// hot loop beyond the pool's fixed size. Floating texts ("+50") live in
// their own small list and rise and fade above the thing that died.

const MAX_PARTICLES = 420;

const pool = [];
const floaters = [];

function spawn(props) {
  if (pool.length >= MAX_PARTICLES) pool.shift();
  pool.push({
    x: 0, y: 0, vx: 0, vy: 0,
    life: 0.4, age: 0,
    size: 3, color: '#ffb347',
    drag: 0, gravity: 0, glow: false,
    ...props,
  });
}

/** A quick fan of sparks where a shot lands. */
export function hitSparks(x, y, color = '#ffd98a') {
  for (let i = 0; i < 5; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 60 + Math.random() * 190;
    spawn({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.22 + Math.random() * 0.2,
      size: 1.6 + Math.random() * 2.2,
      color, drag: 4,
    });
  }
}

/** The burst when a blight creature dies: embers out, then drifting down. */
export function deathBurst(x, y, color, big = false) {
  const count = big ? 30 : 18;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * (big ? 320 : 220);
    spawn({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.4 + Math.random() * 0.5,
      size: 2 + Math.random() * 3.4,
      color, drag: 2.2, gravity: 130, glow: true,
    });
  }
}

/** One soft mote trailing the warden while it dashes. */
export function dashTrail(x, y) {
  spawn({
    x: x + (Math.random() - 0.5) * 10,
    y: y + (Math.random() - 0.5) * 10,
    vx: (Math.random() - 0.5) * 30,
    vy: (Math.random() - 0.5) * 30,
    life: 0.32, size: 5 + Math.random() * 5,
    color: '#ff9a3c', glow: true,
  });
}

/** The brief glow at the warden's muzzle when a shot leaves. */
export function muzzleGlow(x, y) {
  spawn({ x, y, life: 0.07, size: 13, color: '#ffe9b0', glow: true });
}

/** A rising "+N" where something was cleared. */
export function floatText(x, y, text, color = '#ffe9b0') {
  floaters.push({ x, y, text, color, age: 0, life: 0.9 });
}

export function clearParticles() {
  pool.length = 0;
  floaters.length = 0;
}

export function updateParticles(dt) {
  for (let i = pool.length - 1; i >= 0; i--) {
    const p = pool[i];
    p.age += dt;
    if (p.age >= p.life) {
      pool.splice(i, 1);
      continue;
    }
    const dragK = Math.max(0, 1 - p.drag * dt);
    p.vx *= dragK;
    p.vy = p.vy * dragK + p.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i];
    f.age += dt;
    f.y -= 44 * dt;
    if (f.age >= f.life) floaters.splice(i, 1);
  }
}

export function drawParticles(ctx) {
  for (const p of pool) {
    const t = 1 - p.age / p.life;
    ctx.globalAlpha = Math.min(1, t * 1.6);
    if (p.glow) {
      ctx.shadowBlur = 12;
      ctx.shadowColor = p.color;
    }
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(0.4, p.size * t), 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  ctx.globalAlpha = 1;
}

export function drawFloaters(ctx) {
  ctx.textAlign = 'center';
  ctx.font = 'bold 17px Georgia, serif';
  for (const f of floaters) {
    const t = 1 - f.age / f.life;
    ctx.globalAlpha = Math.min(1, t * 2);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}
