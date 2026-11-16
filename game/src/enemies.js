// enemies.js — the blight: moths and beetles that creep in from the grove's
// edge in waves and make straight for the warden's light.
//
//   moth    quick and frail; flutters in on a wobbling path, stings lightly
//   beetle  slow and armoured; shrugs off knockback, hits hard
//
// Each wave is a roster of kinds; the game loop in main.js deals them out
// over time and this module moves and draws them.

export const enemies = [];

const KINDS = {
  moth: {
    hp: 3,
    radius: 13,
    baseSpeed: 96,
    speedPerWave: 6,
    damage: 10,
    score: 50,
    knockResist: 0,
    body: '#7d6ba8',
    wing: 'rgba(196, 181, 253, 0.55)',
    accent: '#b8f53d',
  },
  beetle: {
    hp: 10,
    radius: 21,
    baseSpeed: 50,
    speedPerWave: 3,
    damage: 18,
    score: 120,
    knockResist: 0.75,
    body: '#4c3a26',
    wing: 'rgba(120, 90, 50, 0.8)',
    accent: '#ff7847',
  },
};

/** The roster for a wave: more blight each time, beetles joining from wave 2. */
export function waveRoster(wave) {
  const count = 5 + wave * 3;
  const roster = [];
  for (let i = 0; i < count; i++) {
    const beetleSlot = wave >= 2 && i % 4 === 3;
    roster.push(beetleSlot ? 'beetle' : 'moth');
  }
  return roster;
}

/** How many seconds apart a wave's creatures arrive. */
export function spawnInterval(wave) {
  return Math.max(0.38, 0.95 - wave * 0.06);
}

/** A point just outside a random edge of the arena. */
function edgePoint(width, height) {
  const side = Math.floor(Math.random() * 4);
  if (side === 0) return { x: Math.random() * width, y: -30 };
  if (side === 1) return { x: width + 30, y: Math.random() * height };
  if (side === 2) return { x: Math.random() * width, y: height + 30 };
  return { x: -30, y: Math.random() * height };
}

export function spawnEnemy(kind, wave, width, height) {
  const def = KINDS[kind];
  const at = edgePoint(width, height);
  const enemy = {
    kind,
    x: at.x,
    y: at.y,
    vx: 0,
    vy: 0,
    hp: def.hp,
    maxHp: def.hp,
    radius: def.radius,
    speed: def.baseSpeed + wave * def.speedPerWave + Math.random() * 14,
    damage: def.damage,
    score: def.score,
    knockResist: def.knockResist,
    flash: 0,
    phase: Math.random() * Math.PI * 2,
  };
  enemies.push(enemy);
  return enemy;
}

export function clearEnemies() {
  enemies.length = 0;
}

export function removeEnemy(index) {
  enemies.splice(index, 1);
}

/**
 * Damage one enemy, with knockback along (kx, ky). Returns true when it
 * dies. The hit-flash timer is set either way.
 */
export function hitEnemy(enemy, damage, kx, ky) {
  enemy.hp -= damage;
  enemy.flash = 0.09;
  const push = 130 * (1 - enemy.knockResist);
  enemy.vx += kx * push;
  enemy.vy += ky * push;
  return enemy.hp <= 0;
}

/** Move every enemy toward the player; moths wobble, beetles march. */
export function updateEnemies(dt, target) {
  for (const e of enemies) {
    e.flash = Math.max(0, e.flash - dt);
    e.phase += dt * (e.kind === 'moth' ? 9 : 3);

    const dx = target.x - e.x;
    const dy = target.y - e.y;
    const len = Math.hypot(dx, dy) || 1;
    let ux = dx / len;
    let uy = dy / len;

    if (e.kind === 'moth') {
      // Flutter: weave side to side across the line to the warden.
      const wobble = Math.sin(e.phase) * 0.55;
      const px = -uy;
      const py = ux;
      ux += px * wobble;
      uy += py * wobble;
      const l = Math.hypot(ux, uy) || 1;
      ux /= l;
      uy /= l;
    }

    // Knockback velocity decays back into the creature's own march.
    e.vx *= Math.max(0, 1 - 6 * dt);
    e.vy *= Math.max(0, 1 - 6 * dt);
    e.x += (ux * e.speed + e.vx) * dt;
    e.y += (uy * e.speed + e.vy) * dt;
  }
}

function drawMoth(ctx, e) {
  const def = KINDS.moth;
  const flap = Math.sin(e.phase * 2.2) * 0.45;
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.fillStyle = def.wing;
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.rotate(side * (0.9 + flap));
    ctx.beginPath();
    ctx.ellipse(side * 11, 0, 12, 5.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = e.flash > 0 ? '#ffffff' : def.body;
  ctx.beginPath();
  ctx.ellipse(0, 0, 8.5, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  // Blight-green eyes, the only cold light on it.
  ctx.fillStyle = def.accent;
  ctx.beginPath();
  ctx.arc(-3.4, -5, 1.9, 0, Math.PI * 2);
  ctx.arc(3.4, -5, 1.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBeetle(ctx, e) {
  const def = KINDS.beetle;
  ctx.save();
  ctx.translate(e.x, e.y);
  // Legs: three strokes a side, scuttling with the phase.
  ctx.strokeStyle = '#2c2013';
  ctx.lineWidth = 3;
  const step = Math.sin(e.phase * 4) * 4;
  for (const side of [-1, 1]) {
    for (let leg = -1; leg <= 1; leg++) {
      ctx.beginPath();
      ctx.moveTo(side * 14, leg * 9);
      ctx.lineTo(side * 24, leg * 12 + (leg % 2 === 0 ? step : -step));
      ctx.stroke();
    }
  }
  // Shell: a dark dome with a centre seam and a horn.
  ctx.fillStyle = e.flash > 0 ? '#ffffff' : def.body;
  ctx.beginPath();
  ctx.ellipse(0, 0, 17, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -19);
  ctx.lineTo(0, 19);
  ctx.stroke();
  ctx.fillStyle = def.accent;
  ctx.beginPath();
  ctx.moveTo(-4, -18);
  ctx.lineTo(0, -29);
  ctx.lineTo(4, -18);
  ctx.closePath();
  ctx.fill();
  // A sliver of health lost, shown as a crack arc once it is hurt.
  if (e.hp < e.maxHp) {
    ctx.strokeStyle = 'rgba(255, 233, 176, 0.85)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(0, 0, 24, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (e.hp / e.maxHp));
    ctx.stroke();
  }
  ctx.restore();
}

export function drawEnemies(ctx) {
  for (const e of enemies) {
    if (e.kind === 'moth') drawMoth(ctx, e);
    else drawBeetle(ctx, e);
  }
}
