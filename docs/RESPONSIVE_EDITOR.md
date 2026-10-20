# Responsive editor

The same editor URL selects its layout by available width: mobile at 1023 CSS
pixels or less, desktop above that. Fullscreen/player embeds retain their existing
behavior. No device detection, React upgrade, UI framework migration, or runtime
fork is required.

The phone layout implements Figma **02 Workspace first** (134:643 / 156:458).
The actual game renders above a resizable Code drawer. Hide collapses the preview;
Expand opens the playing view. Code returns to the mounted workspace. Sprites and
Tutor open bottom sheets; the project menu opens from the left. The Blocks button
inside Code opens the existing category rail and palette. Costume/backdrop and
sound editing tabs, including blank Paint shortcuts, are desktop-only. Mobile
keeps the supplied assets and all costume/sound programming blocks. Switching to
mobile while an asset editor is selected returns to Code without replacing the
workspace. Sprite libraries, settings, file actions and account controls retain
their existing handlers. There is no hardcoded game art or demo caption.

## Integration boundaries

- `src/components/editor-layout/` owns panel state, focus handling, touch-sized
  navigation and responsive CSS. Focus changes use preventScroll; the mobile
  shell clips hidden panels so focusing a sheet cannot scroll navigation away.
  Editor context carries display geometry only.
- `src/lib/editor-layout.js` calculates uniform stage scaling from native project
  dimensions. Neither changing panels nor resizing changes VM stage dimensions.
- Blockly, the VM and the renderer remain mounted across layouts and Code/Play.
  Hidden Code panels retain their dimensions and workspace scroll/zoom state.
- `ResponsiveBlockPalette` reserves zero toolbox width on phones. Its
  `classroom-palette-toggle` / `classroom-palette-change` window events are local
  UI signals. Opening/collapsing the palette never changes a live drag's origin.
  Phone palettes are not deletion targets. Deferred pickup handling and rebuild
  cleanup from the existing adapter remain intact.
- The mobile tutor sheet uses a portal so closing the project menu cannot hide
  chat. Existing transcripts, bounded session context, auth, intentional Ask,
  retries, Deepgram recording, and audio transport remain in use. Leaving the
  sheet cancels an active recording. Empty composers show a microphone; typing
  reveals Send. A small next-step hint action retains optional-question support.
- Phosphor SVGs are checked in with their MIT license and provenance in
  `src/components/editor-layout/icons/`. Original add-sprite, add-backdrop and
  extension icons are retained. Game assets still belong to the loaded project.

## Verification

Run the frontend with `npm start` (port 8601 in this checkout).
For the current phone development example, use
`http://localhost:8601/editor.html?size=480x980` or set Advanced Settings → Custom
Stage Size to **480 × 980**. This is a project/test setting, not a mobile viewport
rule: opening an existing project on a phone preserves its saved dimensions.

```
node node_modules/jest/bin/jest.js test/unit/util/classroom-editor-layout.test.jsx test/unit/util/responsive-block-palette.test.js test/unit/tutor/menu.test.jsx test/integration/responsive-palette.test.js --runInBand
npm run test:unit -- --runInBand
npm run build
```

Focused tests cover portrait/landscape aspect ratios, panel/layout transitions
without remounting, phone/RTL palette origins, drag pickup and disposal, and tutor
recording cancellation/draft retention. The Chromium integration regression uses
real Blockly hit testing and dragging.

The broader configured unit suite currently has four existing failures in
`classroom-styling.test.js`: its course-header fixture uses a `.header` rule that
is absent from the unchanged course stylesheet. Do not describe that suite as
fully passing. Account/project restoration and tutor request tests still run in
that configured suite.

Browser checks cover responsive geometry, palette dragging, preview collapse,
playing view, sprite properties, and menu/tutor sheets. Native file-picker and
download automation were inconclusive in the in-app browser. Authenticated live
voice, physical iPhone Safari and Android Chrome need separate hands-on checks.
This change does not implement swipe/tilt game-input blocks.
