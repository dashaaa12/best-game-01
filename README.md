# best-game-01

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/dashaaa12/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/dashaaa12/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**EMBERFALL** — a 2D arena-survival game on a single canvas. You are a lone
firefly warden holding the last light of a dark grove. Blight moths and
beetles creep in from the edges in growing waves; clear each wave to earn a
breather and a bonus, and survive as long as the light holds.

- **Move** with WASD or the arrow keys, **aim** with the mouse, **shoot**
  with the mouse button or Space, **dash** (with invulnerable frames) on
  Shift, **pause** with P, and **restart** with R or Enter once the light
  goes out.
- Moths are quick and frail and flutter in on wobbling paths; beetles are
  slow, armoured and hit hard. Every wave is bigger and faster than the
  last, and the HUD tracks score, wave, HP and dash charge.
- Hits spark, the blight bursts into embers, the screen shakes when the
  warden is hurt, and every sound — shots, bursts, the wave chime — is
  synthesised live with WebAudio. No assets, no libraries, no network:
  everything the page loads lives under `game/`.

## Run it

Serve the `game/` folder with any static file server and open it in a
desktop browser:

```sh
cd game
python3 -m http.server 8080
# then open http://localhost:8080 in your browser
```

To hand the entry in the way the bounty expects, run the packager at the
repository root — it copies `game/` and `screenshots/` into the output
directory and writes `dossier.json` there:

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

<sub>Entered on [make.fun](https://make.fun/?ref=y1enas6g&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
