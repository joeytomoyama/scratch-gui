# Figma editor redesign

Reference: [approved editor view](https://www.figma.com/design/dmVFMsESgTx3IbUBpjf0Hi/Untitled?node-id=4-2).

## Changes

- `target-pane` and `sprite-selector` replace the separate Stage column with a centered Stage tile outside the scrolling sprite list. The stage rendering canvas retains its existing size and behavior.
- `stage-selector` shares the sprite tile styles and displays the current backdrop. Its existing upload, surprise, paint and library actions open above the tile on hover or keyboard focus. The tile stays in front of the menu's lower edge.
- `sprite-info` groups X/Y in a lightly tinted container, uses regular labels and 10px control corners, and spaces the first row around its groups and the second row between its groups.
- `blocks.css` makes the category markers rounded squares with additional vertical spacing.
- `palette-category-backgrounds` adds decorative SVG bands behind each flyout category. Each band mixes 16% of that category's current primary color with white. Adjacent categories retain separate colors during scrolling; blocks, hit targets and execution remain unchanged.

No dependency or lockfile changes are required. Existing assets and VM-backed sprite/backdrop data are reused.

## Validation

Run the local editor with `npm start -- --port 8601` and open `http://localhost:8601/editor.html`.

Passed on 2026-10-10:

```powershell
npm run build
node node_modules/eslint/bin/eslint.js src/lib/palette-category-backgrounds.js src/containers/blocks.jsx src/components/action-menu/action-menu.jsx src/components/target-pane/target-pane.jsx src/components/sprite-selector/sprite-selector.jsx src/components/sprite-info/sprite-info.jsx src/components/stage-selector/stage-selector.jsx
node node_modules/jest/bin/jest.js test/unit/components/stage-tile.test.jsx test/unit/util/palette-category-backgrounds.test.js --runInBand
```

The targeted Jest run passes five tests in two suites. Browser verification covers sprite/Stage selection, backdrop menu expansion, category colors, dragging and executing a Motion block, compact/full Stage layouts, and restoring the saved block program after reload.

`npm run test:unit -- --runInBand` passes 272 tests in 30 suites and fails four existing Courses action-color tests in `test/unit/util/classroom-styling.test.js`. These tests and the Courses/header changes are outside this redesign commit. The legacy sprite-selector suites also encounter existing snapshot differences and a default-project loader configuration failure; their snapshots were not updated.

## Upstream integration

Most changes are confined to GUI component markup and CSS. The palette adapter is the one dependency integration point: it wraps the flyout instance's `recordCategoryScrollPositions_`, reads `categoryScrollPositions` and toolbox category `colour_`, and observes the block canvas transform. It restores the hook and disconnects its observer on disposal.

These members were verified against the lockfile's `scratch-blocks` revision `4113c5348e6b4c76da9071a1800a62ab96ef793f`. When upgrading scratch-blocks, check these members and repeat the category scrolling/zoom tests and a browser drag check. No scratch-blocks source is patched or forked.
