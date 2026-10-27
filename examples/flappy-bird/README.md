# Little Wings — Scratch game

Open **Little Wings.sb3** using **File → Load from your computer** in the editor
or Scratch 3. Loading replaces the current workspace, so save existing work first.
Click the green flag. Press **Space**, click, or tap the stage to start and flap.
Release between flaps. Pass a pair of pipes for one point. Hitting a pipe, the
ground or the ceiling ends the round. Press again to restart after a short pause.

The game now uses a **360 × 640 portrait stage**, two animated bird costumes, paired
pipe clones, random gaps, a score monitor and ready/game-over cards. It has no
audio, extensions, network requests, account requirements or course integration.
All logic is editable standard Scratch blocks. It is a playable reference game,
not a lesson starter or an implemented curriculum.

## Files and rebuilding

- `Little Wings.sb3`: playable project, with every costume embedded.
- `assets/`: four original downloaded PNGs and the CC0 license text.
- `build.cjs`: generates the SB3 using this repository's installed JSZip.
- `verify.cjs`: real-browser verification using the existing `build/` editor.
- `stage-preview.png` / `preview.png`: verified game and editor screenshots.
- `SOURCES.md`: asset authorship, download URLs and license record.

From the repository root, run `node examples/flappy-bird/build.cjs` to rebuild.
No editor source changes or additional application dependencies are needed.

Set the editor's native stage size to **360 × 640** before playing; in this
checkout this setting is carried by `?size=360x640` in the editor URL, not by
standard Scratch's SB3 format. Standard Scratch's fixed 480 × 360 stage does not
display this portrait version correctly.

With port 8601 free, `node examples/flappy-bird/serve.cjs` serves the existing
editor build with a local preview at
`http://127.0.0.1:8601/little-wings.html?size=360x640`.
Use that preview URL to reload the supplied game; the editor may canonicalize
its address to `editor.html` after loading. The launcher never saves to an account.

To verify, run `node examples/flappy-bird/verify.cjs` with Playwright available
through Node resolution (`NODE_PATH` may point to the Codex bundled runtime).
It serves the existing `build/` on an ephemeral local port, launches headless
Chrome and closes both afterward. Set `CHROME_BIN` for a different Chrome path.
The checked-out editor build must already exist.

## Verification

On 2026-10-21, the installed Scratch VM loaded the SB3. The existing editor build
then rendered every costume in Chrome. Browser checks passed for ready/start,
flapping, three scored gaps using input-driven autopilot, bounded clones,
boundary game over, one-press restart, score reset, real pipe collision and
VM save/reload. The stage screenshot was visually inspected.

Physical touchscreen/device behavior has not been tested. The browser checks
exercise this game, not the application's full unit suite. No upstream editor
files changed; the example is isolated from application functionality.

On 2026-10-22 the same browser checks passed at 360 × 640 after adapting the
sky/ground, boundary checks, bird position, obstacle spawning, scrolling and
instruction placement. The original pipe caps retain their proportions; SVG
costumes compose the original PNG cap and an extended shaft. Source PNGs remain
intact. The portrait stage screenshot was visually checked for full coverage.

On 2026-10-23 the Bird's long script was split into six named My Blocks:
Reset round, Start flying, Read flap input, Move bird, Check collisions and
Wait for restart. The green-flag script shows the round sequence and the
per-frame input → movement → collision loop. Wing animation stays independent.
The short input/movement helpers run without screen refresh so extracting them
does not introduce extra frames; Wait for restart yields normally. The same
real-browser gameplay and save/reload checks passed after the refactor.
