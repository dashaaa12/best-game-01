// EMBERFALL — entry packager for the make.fun best-game-01 bounty.
//
// Copies the static game (game/) and its screenshots (screenshots/) from this
// repository into the output directory, then writes dossier.json there with
// the kit's buildDossier so the sealed scorer can rebuild it byte for byte.
//
//   node main.ts
//   MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Node 22 standard library only; the TypeScript here is erasable syntax, so
// Node runs the file as-is with no build step and nothing installed.

import { cpSync, existsSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildDossier } from './vendor/makefun-game.ts';

// The repository root is the directory this file lives in.
const repoRoot = dirname(fileURLToPath(import.meta.url));

// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output.
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The caps the scorer grades with: pass them all so this program refuses
// exactly where the scorer would refuse.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
} as const;

/** Copy one payload directory into the output, replacing any older copy. */
function copyPayload(name: string): void {
  const from = join(repoRoot, name);
  const to = join(outputDir, name);
  if (!existsSync(from)) throw new Error(`main.ts: ${name}/ is missing from the repository`);
  rmSync(to, { recursive: true, force: true });
  cpSync(from, to, { recursive: true });
}

/** Count the regular files under a directory, for the summary line. */
function countFiles(dir: string): number {
  let n = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) n += countFiles(join(dir, entry.name));
    else if (entry.isFile()) n += 1;
  }
  return n;
}

// The one file the whole entry hangs on: refuse early, with a clear word,
// when the game's page is not where it must be.
if (!existsSync(join(repoRoot, 'game', 'index.html'))) {
  throw new Error('main.ts: game/index.html is missing from the repository');
}

copyPayload('game');
copyPayload('screenshots');

// The dossier is built from the copies in the output directory, so what is
// graded is exactly what was handed in.
const dossier = buildDossier(outputDir, DOSSIER_CAPS);
writeFileSync(join(outputDir, 'dossier.json'), dossier);

const gameFiles = countFiles(join(outputDir, 'game'));
const shotFiles = countFiles(join(outputDir, 'screenshots'));
console.log(
  `main.ts: handed in ${gameFiles} game files and ${shotFiles} screenshots; ` +
  `dossier.json is ${dossier.length} bytes in ${outputDir}`,
);
