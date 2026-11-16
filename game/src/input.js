// input.js — keyboard and mouse state for EMBERFALL.
//
// The game polls this module each frame: `keys` holds the codes currently
// down, `pressed` holds the codes that went down since the last frame (the
// game clears it after reading), and `mouse` tracks the pointer in canvas
// coordinates plus its button state.

export const keys = new Set();
export const pressed = new Set();

export const mouse = {
  x: 640,
  y: 400,
  down: false,
  clicked: false, // went down since the last frame; the game clears it
};

const HANDLED = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD',
]);

/** Attach the listeners to the canvas. Call once at boot. */
export function initInput(canvas) {
  window.addEventListener('keydown', (event) => {
    if (HANDLED.has(event.code)) event.preventDefault();
    if (!event.repeat) pressed.add(event.code);
    keys.add(event.code);
  });

  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
  });

  window.addEventListener('blur', () => {
    keys.clear();
    mouse.down = false;
  });

  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    mouse.y = ((event.clientY - rect.top) / rect.height) * canvas.height;
  });

  canvas.addEventListener('mousedown', (event) => {
    if (event.button === 0) {
      mouse.down = true;
      mouse.clicked = true;
    }
  });

  window.addEventListener('mouseup', (event) => {
    if (event.button === 0) mouse.down = false;
  });

  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
}

/** True while any of the given key codes is held down. */
export function held(...codes) {
  return codes.some((code) => keys.has(code));
}

/** End-of-frame housekeeping: one-shot signals last exactly one frame. */
export function endFrame() {
  pressed.clear();
  mouse.clicked = false;
}
