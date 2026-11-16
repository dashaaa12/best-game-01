// projectiles.js — the warden's ember shots: small, fast, short-lived
// bolts of bottled firelight. This module owns the shot list; the game loop
// in main.js moves them and tests them against the blight.

export const SHOT_SPEED = 640;
export const SHOT_RADIUS = 4;
export const SHOT_DAMAGE = 1;
const SHOT_LIFE = 1.1; // seconds before a missed shot burns out

export const shots = [];

/** Fire one shot from (x, y) toward the aim point (tx, ty). */
export function fireShot(x, y, tx, ty) {
  const dx = tx - x;
  const dy = ty - y;
  const len = Math.hypot(dx, dy) || 1;
  shots.push({
    x, y,
    vx: (dx / len) * SHOT_SPEED,
    vy: (dy / len) * SHOT_SPEED,
    age: 0,
  });
}

export function clearShots() {
  shots.length = 0;
}

/** Move every shot; drop the ones that burned out or left the arena. */
export function updateShots(dt, width, height) {
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i];
    s.age += dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    if (s.age > SHOT_LIFE || s.x < -20 || s.x > width + 20 || s.y < -20 || s.y > height + 20) {
      shots.splice(i, 1);
    }
  }
}

/** Remove one shot by index (it hit something). */
export function removeShot(index) {
  shots.splice(index, 1);
}

export function drawShots(ctx) {
  ctx.save();
  ctx.shadowBlur = 10;
  ctx.shadowColor = '#ffb347';
  for (const s of shots) {
    // A short comet streak behind the bolt, along its direction of travel.
    const back = 0.028;
    const grad = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * back, s.y - s.vy * back);
    grad.addColorStop(0, 'rgba(255, 233, 176, 0.95)');
    grad.addColorStop(1, 'rgba(255, 122, 26, 0)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x - s.vx * back, s.y - s.vy * back);
    ctx.stroke();

    ctx.fillStyle = '#ffe9b0';
    ctx.beginPath();
    ctx.arc(s.x, s.y, SHOT_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
