// player.js — the firefly warden: movement, aiming, firing and the dash.
//
// The warden is a small ember-orange light in the dark grove. It moves on
// WASD / arrow keys, aims at the mouse, fires ember shots on mouse-hold or
// Space, and dashes on Shift: a short burst of speed with invulnerable
// frames, on a cooldown the HUD shows.

import { held, keys, mouse } from './input.js';
import { dashTrail, muzzleGlow } from './particles.js';
import { sfx } from './audio.js';

export const PLAYER_RADIUS = 14;
const WALK_SPEED = 268;
const FIRE_INTERVAL = 0.145; // seconds between shots while firing
const DASH_TIME = 0.16;
const DASH_SPEED = 940;
const DASH_COOLDOWN = 2.1;
const HURT_INVULN = 0.7; // grace after a hit so one touch is not a melt

export function createPlayer(x, y) {
  return {
    x, y,
    vx: 0, vy: 0,
    radius: PLAYER_RADIUS,
    hp: 100,
    maxHp: 100,
    aimX: x + 1,
    aimY: y,
    fireTimer: 0,
    dashTime: 0,
    dashCd: 0,
    invuln: 0,
    wingPhase: Math.random() * Math.PI * 2,
  };
}

/** The point shots leave from: a lantern held toward the aim. */
export function muzzlePoint(p) {
  const dx = p.aimX - p.x;
  const dy = p.aimY - p.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: p.x + (dx / len) * 20, y: p.y + (dy / len) * 20 };
}

export function isDashing(p) {
  return p.dashTime > 0;
}

/** Dash charge as a 0..1 fraction, for the HUD bar. */
export function dashFraction(p) {
  return 1 - Math.max(0, p.dashCd) / DASH_COOLDOWN;
}

/**
 * Move, aim, dash and fire for one frame. `shoot(x, y, tx, ty)` is called
 * for every shot that leaves the lantern.
 */
export function updatePlayer(p, dt, shoot) {
  p.wingPhase += dt * 26;
  p.fireTimer -= dt;
  p.dashCd = Math.max(0, p.dashCd - dt);
  p.invuln = Math.max(0, p.invuln - dt);
  p.aimX = mouse.x;
  p.aimY = mouse.y;

  let mx = 0;
  let my = 0;
  if (held('KeyA', 'ArrowLeft')) mx -= 1;
  if (held('KeyD', 'ArrowRight')) mx += 1;
  if (held('KeyW', 'ArrowUp')) my -= 1;
  if (held('KeyS', 'ArrowDown')) my += 1;
  const mLen = Math.hypot(mx, my);
  if (mLen > 0) {
    mx /= mLen;
    my /= mLen;
  }

  // Dash: Shift with a direction (or the current facing), while charged.
  const wantDash = keys.has('ShiftLeft') || keys.has('ShiftRight');
  if (wantDash && p.dashCd <= 0 && p.dashTime <= 0) {
    let dx = mx;
    let dy = my;
    if (dx === 0 && dy === 0) {
      dx = p.aimX - p.x;
      dy = p.aimY - p.y;
      const l = Math.hypot(dx, dy) || 1;
      dx /= l;
      dy /= l;
    }
    p.dashTime = DASH_TIME;
    p.dashCd = DASH_COOLDOWN;
    p.vx = dx * DASH_SPEED;
    p.vy = dy * DASH_SPEED;
    sfx.dash();
  }

  if (p.dashTime > 0) {
    p.dashTime -= dt;
    dashTrail(p.x, p.y);
  } else {
    p.vx = mx * WALK_SPEED;
    p.vy = my * WALK_SPEED;
  }

  p.x += p.vx * dt;
  p.y += p.vy * dt;

  // Firing: mouse held, or Space (which fires toward the mouse as well).
  const firing = mouse.down || keys.has('Space');
  if (firing && p.fireTimer <= 0) {
    const m = muzzlePoint(p);
    shoot(m.x, m.y, p.aimX, p.aimY);
    muzzleGlow(m.x, m.y);
    p.fireTimer = FIRE_INTERVAL;
  }
}

/** Keep the warden inside the arena. */
export function clampPlayer(p, width, height) {
  p.x = Math.min(width - p.radius, Math.max(p.radius, p.x));
  p.y = Math.min(height - p.radius, Math.max(p.radius, p.y));
}

/**
 * Apply contact damage. Returns true when the hit lands; dashes and the
 * post-hit grace window pass straight through.
 */
export function hurtPlayer(p, amount) {
  if (p.invuln > 0 || isDashing(p) || p.hp <= 0) return false;
  p.hp = Math.max(0, p.hp - amount);
  p.invuln = HURT_INVULN;
  return true;
}

export function drawPlayer(ctx, p) {
  const blink = p.invuln > 0 && Math.floor(p.invuln * 14) % 2 === 0;
  ctx.save();
  if (blink) ctx.globalAlpha = 0.35;

  // Lantern staff toward the aim, drawn under the body.
  const m = muzzlePoint(p);
  ctx.strokeStyle = '#7a4a21';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(m.x, m.y);
  ctx.stroke();

  // Wings: two pale ellipses fluttering behind the body.
  const flap = Math.sin(p.wingPhase) * 0.5;
  ctx.fillStyle = 'rgba(190, 242, 255, 0.5)';
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(p.x, p.y - 3);
    ctx.rotate(side * (0.7 + flap * 0.35));
    ctx.beginPath();
    ctx.ellipse(side * 10, 0, 11, 4.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // The ember body: a warm radial glow with a bright core.
  const glow = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, 30);
  glow.addColorStop(0, 'rgba(255, 214, 130, 0.85)');
  glow.addColorStop(0.45, 'rgba(255, 140, 40, 0.35)');
  glow.addColorStop(1, 'rgba(255, 110, 20, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 30, 0, Math.PI * 2);
  ctx.fill();

  const body = ctx.createRadialGradient(p.x - 4, p.y - 5, 1, p.x, p.y, p.radius);
  body.addColorStop(0, '#ffe9b0');
  body.addColorStop(0.55, '#ffb347');
  body.addColorStop(1, '#e05e12');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
  ctx.fill();

  // The lantern's bright tip.
  ctx.fillStyle = '#fff3cf';
  ctx.shadowBlur = 14;
  ctx.shadowColor = '#ffb347';
  ctx.beginPath();
  ctx.arc(m.x, m.y, 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
