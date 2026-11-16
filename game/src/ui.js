// ui.js — everything the player reads: the HUD while playing and the
// title, pause, wave-banner and game-over screens. All drawn on the canvas
// so a screenshot of the game shows the whole loop.
//
// Palette: teal for friendly information, ember orange for the warden and
// its score, soft parchment for words.

const TEAL = '#2dd4bf';
const EMBER = '#ffb347';
const PARCHMENT = '#f3e9cf';
const DIM = 'rgba(243, 233, 207, 0.62)';

function bar(ctx, x, y, w, h, fraction, fill) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.fillRect(x, y, w, h);
  if (fraction > 0) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w * Math.min(1, fraction), h);
  }
}

/** The in-play HUD: score and wave up top, HP and dash charge at the left. */
export function drawHUD(ctx, view) {
  const { width, score, wave, hp, maxHp, dash, blightLeft } = view;

  ctx.save();
  ctx.textBaseline = 'top';

  // Score, top-left.
  ctx.textAlign = 'left';
  ctx.font = 'bold 15px Georgia, serif';
  ctx.fillStyle = TEAL;
  ctx.fillText('SCORE', 22, 16);
  ctx.font = 'bold 34px Georgia, serif';
  ctx.fillStyle = EMBER;
  ctx.fillText(String(score), 22, 36);

  // HP bar under the score.
  const hpFraction = Math.max(0, hp / maxHp);
  const hpColor = hpFraction > 0.45 ? '#7dd069' : hpFraction > 0.22 ? '#ffb347' : '#ff5d47';
  bar(ctx, 22, 82, 210, 13, hpFraction, hpColor);
  ctx.font = 'bold 12px Georgia, serif';
  ctx.fillStyle = PARCHMENT;
  ctx.fillText(`HP ${Math.ceil(hp)} / ${maxHp}`, 22, 99);

  // Dash charge under the HP.
  bar(ctx, 22, 122, 210, 8, dash, dash >= 1 ? TEAL : 'rgba(45, 212, 191, 0.45)');
  ctx.font = 'bold 12px Georgia, serif';
  ctx.fillStyle = dash >= 1 ? TEAL : DIM;
  ctx.fillText(dash >= 1 ? 'DASH READY — SHIFT' : 'DASH CHARGING…', 22, 134);

  // Wave, top-centre.
  ctx.textAlign = 'center';
  ctx.font = 'bold 15px Georgia, serif';
  ctx.fillStyle = TEAL;
  ctx.fillText('WAVE', width / 2, 16);
  ctx.font = 'bold 34px Georgia, serif';
  ctx.fillStyle = PARCHMENT;
  ctx.fillText(String(wave), width / 2, 36);

  // Blight remaining, top-right.
  ctx.textAlign = 'right';
  ctx.font = 'bold 15px Georgia, serif';
  ctx.fillStyle = TEAL;
  ctx.fillText('BLIGHT LEFT', width - 22, 16);
  ctx.font = 'bold 34px Georgia, serif';
  ctx.fillStyle = PARCHMENT;
  ctx.fillText(String(blightLeft), width - 22, 36);

  ctx.restore();
}

function veil(ctx, width, height, alpha) {
  ctx.fillStyle = `rgba(3, 8, 6, ${alpha})`;
  ctx.fillRect(0, 0, width, height);
}

function centreLines(ctx, width, lines) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const line of lines) {
    ctx.font = line.font;
    ctx.fillStyle = line.color;
    if (line.glow) {
      ctx.shadowBlur = 26;
      ctx.shadowColor = line.glow;
    } else {
      ctx.shadowBlur = 0;
    }
    ctx.fillText(line.text, width / 2, line.y);
  }
  ctx.restore();
}

/** The title screen: the name, the premise, the controls, the way in. */
export function drawTitle(ctx, width, height, time) {
  veil(ctx, width, height, 0.45);
  const pulse = 0.72 + Math.sin(time * 3.2) * 0.28;
  centreLines(ctx, width, [
    { text: 'E M B E R F A L L', y: height * 0.30, font: 'bold 84px Georgia, serif', color: EMBER, glow: '#ff7a1a' },
    { text: 'The blight has come for the grove’s last light.', y: height * 0.42, font: 'italic 23px Georgia, serif', color: PARCHMENT },
    { text: 'You are its warden. Hold the dark back, wave after wave.', y: height * 0.465, font: 'italic 23px Georgia, serif', color: PARCHMENT },
    { text: 'WASD / arrows — move      Mouse — aim      Click / Space — shoot      Shift — dash      P — pause', y: height * 0.60, font: '19px Georgia, serif', color: TEAL },
    { text: 'Clear each wave of moths and beetles before they reach you.', y: height * 0.645, font: '19px Georgia, serif', color: DIM },
  ]);
  ctx.save();
  ctx.globalAlpha = pulse;
  centreLines(ctx, width, [
    { text: '— Click or press Enter to begin —', y: height * 0.76, font: 'bold 26px Georgia, serif', color: '#ffe9b0', glow: '#ffb347' },
  ]);
  ctx.restore();
}

/** The big wave number that flashes as a wave begins or is cleared. */
export function drawWaveBanner(ctx, width, height, text, sub, alpha) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  centreLines(ctx, width, [
    { text, y: height * 0.40, font: 'bold 64px Georgia, serif', color: EMBER, glow: '#ff7a1a' },
    { text: sub, y: height * 0.40 + 58, font: 'italic 21px Georgia, serif', color: PARCHMENT },
  ]);
  ctx.restore();
}

export function drawPause(ctx, width, height) {
  veil(ctx, width, height, 0.6);
  centreLines(ctx, width, [
    { text: 'PAUSED', y: height * 0.42, font: 'bold 58px Georgia, serif', color: PARCHMENT, glow: TEAL },
    { text: 'Press P to return to the grove', y: height * 0.52, font: '21px Georgia, serif', color: DIM },
  ]);
}

/** The end: the light goes out, the tally stands, the way back is offered. */
export function drawGameOver(ctx, width, height, score, wave, time) {
  veil(ctx, width, height, 0.68);
  const pulse = 0.72 + Math.sin(time * 3.2) * 0.28;
  centreLines(ctx, width, [
    { text: 'THE LIGHT GOES OUT', y: height * 0.30, font: 'bold 58px Georgia, serif', color: '#ff8a5c', glow: '#ff5d47' },
    { text: `The grove held for ${wave} wave${wave === 1 ? '' : 's'}.`, y: height * 0.42, font: 'italic 23px Georgia, serif', color: PARCHMENT },
    { text: 'FINAL SCORE', y: height * 0.52, font: 'bold 15px Georgia, serif', color: TEAL },
    { text: String(score), y: height * 0.585, font: 'bold 64px Georgia, serif', color: EMBER, glow: '#ff7a1a' },
  ]);
  ctx.save();
  ctx.globalAlpha = pulse;
  centreLines(ctx, width, [
    { text: '— Press R or Enter to kindle a new light —', y: height * 0.72, font: 'bold 24px Georgia, serif', color: '#ffe9b0', glow: '#ffb347' },
  ]);
  ctx.restore();
}
