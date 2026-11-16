// main.js — EMBERFALL's boot, game loop and state machine.
//
// States: title -> playing <-> paused -> gameover -> (restart) playing.
// This module owns the run's state (score, wave, spawn queue, breather,
// screen shake), directs the waves, tests collisions between the shots,
// the blight and the warden, and draws each frame in order: grove, shots,
// blight, warden, particles, HUD, screens.

import { initInput, pressed, mouse, endFrame } from './input.js';
import { initAudio, sfx } from './audio.js';
import {
  createPlayer, updatePlayer, clampPlayer, hurtPlayer, drawPlayer,
  dashFraction, isDashing,
} from './player.js';
import {
  enemies, waveRoster, spawnInterval, spawnEnemy, clearEnemies, removeEnemy,
  hitEnemy, updateEnemies, drawEnemies,
} from './enemies.js';
import { shots, fireShot, clearShots, updateShots, removeShot, drawShots, SHOT_RADIUS } from './projectiles.js';
import {
  hitSparks, deathBurst, floatText, clearParticles, updateParticles,
  drawParticles, drawFloaters,
} from './particles.js';
import { drawHUD, drawTitle, drawPause, drawGameOver, drawWaveBanner } from './ui.js';

const WIDTH = 1280;
const HEIGHT = 800;
const BREATHER = 2.6; // seconds of calm between waves

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// ---------------------------------------------------------------- the grove

/** A seeded random so the grove is the same grove on every visit. */
function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** The still background, painted once: gradient dark, tree silhouettes at
 *  the edges, speckled ground, and a vignette that closes the dark in. */
function paintGrove() {
  const off = document.createElement('canvas');
  off.width = WIDTH;
  off.height = HEIGHT;
  const g = off.getContext('2d');
  const rand = seededRandom(20261116);

  const grad = g.createRadialGradient(WIDTH / 2, HEIGHT / 2, 120, WIDTH / 2, HEIGHT / 2, 760);
  grad.addColorStop(0, '#14231b');
  grad.addColorStop(0.55, '#0c1712');
  grad.addColorStop(1, '#05090a');
  g.fillStyle = grad;
  g.fillRect(0, 0, WIDTH, HEIGHT);

  // Ground speckle: moss, stones and fallen leaves.
  for (let i = 0; i < 900; i++) {
    const x = rand() * WIDTH;
    const y = rand() * HEIGHT;
    const r = 1 + rand() * 2.6;
    g.fillStyle = rand() > 0.5 ? 'rgba(70, 110, 80, 0.20)' : 'rgba(0, 0, 0, 0.25)';
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }

  // Tree trunks and canopies crowding the edges.
  const trees = [];
  for (let i = 0; i < 16; i++) {
    const edge = i % 4;
    let x = rand() * WIDTH;
    let y = rand() * HEIGHT;
    if (edge === 0) y = rand() * 90;
    if (edge === 1) y = HEIGHT - rand() * 90;
    if (edge === 2) x = rand() * 90;
    if (edge === 3) x = WIDTH - rand() * 90;
    trees.push({ x, y, r: 44 + rand() * 52 });
  }
  for (const t of trees) {
    g.fillStyle = 'rgba(4, 10, 7, 0.9)';
    g.beginPath();
    g.arc(t.x, t.y, t.r, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(24, 46, 34, 0.55)';
    g.beginPath();
    g.arc(t.x - t.r * 0.22, t.y - t.r * 0.25, t.r * 0.66, 0, Math.PI * 2);
    g.fill();
  }

  // The vignette.
  const vig = g.createRadialGradient(WIDTH / 2, HEIGHT / 2, 340, WIDTH / 2, HEIGHT / 2, 820);
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
  g.fillStyle = vig;
  g.fillRect(0, 0, WIDTH, HEIGHT);

  return off;
}

const grove = paintGrove();

// Ambient fireflies: friendly lights drifting far from the fight.
const fireflies = [];
{
  const rand = seededRandom(777);
  for (let i = 0; i < 26; i++) {
    fireflies.push({
      x: rand() * WIDTH,
      y: rand() * HEIGHT,
      phase: rand() * Math.PI * 2,
      speed: 0.3 + rand() * 0.7,
      drift: 8 + rand() * 22,
    });
  }
}

function drawFireflies(time) {
  ctx.save();
  for (const f of fireflies) {
    const x = f.x + Math.sin(time * f.speed + f.phase) * f.drift;
    const y = f.y + Math.cos(time * f.speed * 0.8 + f.phase) * f.drift * 0.6;
    const glow = 0.35 + 0.3 * Math.sin(time * 1.7 + f.phase * 2);
    ctx.globalAlpha = Math.max(0.08, glow);
    ctx.fillStyle = '#b8f5d0';
    ctx.beginPath();
    ctx.arc(x, y, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- the run

const game = {
  state: 'title', // title | playing | paused | gameover
  time: 0,
  score: 0,
  wave: 0,
  player: createPlayer(WIDTH / 2, HEIGHT / 2),
  queue: [], // kinds still to arrive this wave
  spawnTimer: 0,
  breather: 0, // > 0 while the between-wave calm runs
  banner: null, // { text, sub, t, dur }
  shake: 0,
};

function showBanner(text, sub, dur = 1.7) {
  game.banner = { text, sub, t: 0, dur };
}

function startWave(n) {
  game.wave = n;
  game.queue = waveRoster(n);
  game.spawnTimer = 0.4;
  game.breather = 0;
  showBanner(`WAVE ${n}`, n === 1 ? 'The blight stirs at the grove’s edge…' : 'They come again — hold the light.');
  sfx.waveStart();
}

function startGame() {
  initAudio();
  game.score = 0;
  game.player = createPlayer(WIDTH / 2, HEIGHT / 2);
  clearEnemies();
  clearShots();
  clearParticles();
  game.state = 'playing';
  game.shake = 0;
  startWave(1);
}

function endGame() {
  game.state = 'gameover';
  deathBurst(game.player.x, game.player.y, '#ffb347', true);
  deathBurst(game.player.x, game.player.y, '#ff7847', true);
  game.shake = 14;
  sfx.explosion(true);
  sfx.gameOver();
}

// ---------------------------------------------------------------- updating

function shoot(x, y, tx, ty) {
  fireShot(x, y, tx, ty);
  sfx.shoot();
}

function collideShots() {
  for (let si = shots.length - 1; si >= 0; si--) {
    const s = shots[si];
    let consumed = false;
    for (let ei = enemies.length - 1; ei >= 0; ei--) {
      const e = enemies[ei];
      const rr = e.radius + SHOT_RADIUS;
      if (Math.abs(e.x - s.x) > rr || Math.abs(e.y - s.y) > rr) continue;
      if (Math.hypot(e.x - s.x, e.y - s.y) > rr) continue;

      const len = Math.hypot(s.vx, s.vy) || 1;
      const died = hitEnemy(e, 1, s.vx / len, s.vy / len);
      removeShot(si);
      consumed = true;
      if (died) {
        game.score += e.score;
        floatText(e.x, e.y - e.radius, `+${e.score}`);
        deathBurst(e.x, e.y, e.kind === 'beetle' ? '#c98d4b' : '#a78bfa', e.kind === 'beetle');
        if (e.kind === 'beetle') game.shake = Math.max(game.shake, 4);
        sfx.explosion(e.kind === 'beetle');
        removeEnemy(ei);
      } else {
        hitSparks(s.x, s.y);
        sfx.hit();
      }
      break;
    }
    if (consumed) continue;
  }
}

function collidePlayer() {
  const p = game.player;
  for (const e of enemies) {
    const rr = e.radius + p.radius - 2;
    if (Math.hypot(e.x - p.x, e.y - p.y) > rr) continue;
    if (hurtPlayer(p, e.damage)) {
      game.shake = Math.max(game.shake, 9);
      hitSparks(p.x, p.y, '#ff8a5c');
      sfx.hurt();
      // The creature is spent by its strike and recoils off the light.
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const len = Math.hypot(dx, dy) || 1;
      e.vx += (dx / len) * 320;
      e.vy += (dy / len) * 320;
      if (p.hp <= 0) {
        endGame();
        return;
      }
    }
  }
}

function updatePlaying(dt) {
  const p = game.player;

  // Deal out the wave.
  if (game.queue.length > 0) {
    game.spawnTimer -= dt;
    if (game.spawnTimer <= 0) {
      spawnEnemy(game.queue.shift(), game.wave, WIDTH, HEIGHT);
      game.spawnTimer = spawnInterval(game.wave);
    }
  }

  updatePlayer(p, dt, shoot);
  clampPlayer(p, WIDTH, HEIGHT);
  updateEnemies(dt, p);
  updateShots(dt, WIDTH, HEIGHT);
  collideShots();
  if (game.state === 'playing') collidePlayer();
  updateParticles(dt);

  // Wave cleared: a breather, a bonus, then the next wave.
  if (game.state === 'playing' && game.queue.length === 0 && enemies.length === 0) {
    if (game.breather <= 0) {
      const bonus = 25 * game.wave;
      game.score += bonus;
      showBanner(`WAVE ${game.wave} CLEARED`, `+${bonus} bonus — breathe while you can.`, 1.9);
      sfx.waveClear();
      game.breather = BREATHER;
    } else {
      game.breather -= dt;
      if (game.breather <= 0) startWave(game.wave + 1);
    }
  }
}

function update(dt) {
  game.time += dt;
  if (game.banner !== null) {
    game.banner.t += dt;
    if (game.banner.t >= game.banner.dur) game.banner = null;
  }
  game.shake = Math.max(0, game.shake - dt * 30);

  if (game.state === 'title') {
    if (pressed.has('Enter') || mouse.clicked) startGame();
    updateParticles(dt);
    return;
  }

  if (game.state === 'gameover') {
    updateParticles(dt);
    if (pressed.has('KeyR') || pressed.has('Enter')) startGame();
    return;
  }

  if (pressed.has('KeyP')) {
    game.state = game.state === 'playing' ? 'paused' : 'playing';
    return;
  }
  if (game.state === 'paused') return;

  updatePlaying(dt);
}

// ---------------------------------------------------------------- drawing

function bannerAlpha(b) {
  const fadeIn = 0.18;
  const fadeOut = 0.45;
  if (b.t < fadeIn) return b.t / fadeIn;
  if (b.t > b.dur - fadeOut) return Math.max(0, (b.dur - b.t) / fadeOut);
  return 1;
}

function render() {
  ctx.save();
  if (game.shake > 0.2) {
    ctx.translate((Math.random() - 0.5) * game.shake, (Math.random() - 0.5) * game.shake);
  }
  ctx.drawImage(grove, 0, 0);
  drawFireflies(game.time);

  if (game.state !== 'title') {
    drawShots(ctx);
    drawEnemies(ctx);
    if (game.state !== 'gameover') drawPlayer(ctx, game.player);
    drawParticles(ctx);
    drawFloaters(ctx);
  } else {
    drawParticles(ctx);
  }
  ctx.restore();

  if (game.state === 'playing' || game.state === 'paused') {
    drawHUD(ctx, {
      width: WIDTH,
      score: game.score,
      wave: game.wave,
      hp: game.player.hp,
      maxHp: game.player.maxHp,
      dash: dashFraction(game.player),
      blightLeft: enemies.length + game.queue.length,
    });
    if (game.banner !== null) {
      drawWaveBanner(ctx, WIDTH, HEIGHT, game.banner.text, game.banner.sub, bannerAlpha(game.banner));
    }
  }

  if (game.state === 'title') drawTitle(ctx, WIDTH, HEIGHT, game.time);
  if (game.state === 'paused') drawPause(ctx, WIDTH, HEIGHT);
  if (game.state === 'gameover') {
    drawHUD(ctx, {
      width: WIDTH,
      score: game.score,
      wave: game.wave,
      hp: 0,
      maxHp: game.player.maxHp,
      dash: dashFraction(game.player),
      blightLeft: enemies.length + game.queue.length,
    });
    drawGameOver(ctx, WIDTH, HEIGHT, game.score, game.wave, game.time);
  }
}

// ---------------------------------------------------------------- the loop

let last = performance.now();

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  render();
  endFrame();
  requestAnimationFrame(frame);
}

initInput(canvas);
requestAnimationFrame(frame);

// A handle for the maker's screenshot driver: it plays through the same
// input events a person would, and reads the run's state from here.
window.EMBERFALL = { game, startGame, enemies, WIDTH, HEIGHT };
