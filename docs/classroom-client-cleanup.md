# Classroom client scope

The application builds five web entries: `editor.html`, `index.html` (player and featured projects), `fullscreen.html`, `courses.html`, and `course-player.html`. The package/library build remains available for integrations. Credits are a static HTML document, with the GPL text distributed alongside it; they no longer require a React bundle.

Removed: unused Scratch tutorial decks/cards, all 81 optional add-ons and their configuration system, novelty modes, the arbitrary project URL input and `project_url` loader, cloud-variable networking and change-username UI, external extension gallery/custom loading and permission dialogs, upstream telemetry submission, desktop settings/window UI, and the embed/add-on settings/credits JavaScript entries. Source and asset license notices are retained. The historical contributor acknowledgments were moved into `static/credits.html`.

Retained: featured project cards, the studio reader they depend on, public project metadata and project-ID routing, Packager handoff, core VM/blocks/rendering/paint/audio, local project save/load, asset libraries, restore points/backpack, fullscreen playback, language selection and accessible/high-contrast themes. Pen, Music, Video Sensing, Text to Speech, Translate and built-in TurboWarp blocks remain available. Existing translation infrastructure and browser compatibility helpers remain.

Hardware source, assets, firmware, dependencies and connection dialogs remain installed. `src/lib/classroom-extension-policy.js` excludes micro:bit, EV3, WeDo, Boost, Go Direct and Makey Makey from the picker and rejects loading them. Re-enabling hardware for a course requires deliberately changing this policy. External JavaScript extensions are rejected for project imports as well as direct loading; URL parameters cannot enable them. Projects requiring disabled extensions cannot be opened successfully. Cloud variables have no network provider, so online functionality in some featured projects will not work.

## Development and checks

Use Node 24 (see `.nvmrc`), `npm ci`, then `npm start`. Open `http://localhost:8601/editor.html`. Run `npm run build` for the application build. Restart the development server after changing webpack entry points.

`npm run test:unit -- --runInBand` runs the maintained reducer tests and new classroom tests. The previous default ran only the now-removed add-on tests. `npm run test:unit:legacy -- --runInBand` exposes the retained older full suite; it currently has missing browser environment/webpack loader setup and stale snapshots and is not a passing acceptance check. Those unrelated tests have not been deleted or silently rewritten. Repository-wide lint also has existing errors in monitor.jsx, sound-library.jsx and file-uploader.js; changed application files are checked separately.

Classroom tests exercise hardware/custom-extension denial, retained built-ins, cloud disconnection, policy idempotence, and actual VM execution plus SB3 serialization/reload. Browser checks cover editor rendering and extension picker contents. Full live export through the external Packager and every featured project are not acceptance-tested by these checks.

## Upstream maintenance

The follow-up dead-code cleanup removes unused Scratch account/sharing widgets,
the old numeric hash loader and metadata fetcher, unused browser/selector wrappers,
and tests specific to those removed flows or tutorial decks. Shared icons, save
styles, translation infrastructure, and the working language/theme controls remain.
Private persistence owns its autosave timer; the unused Redux timeout slice is gone.
Block workspace events now reach the VM directly, without an unread cosmetic-event
classification. Maintained real-VM tests still cover saving position, field, and
connection changes.

Deferred decisions: disabled hardware/firmware tooling, featured-project homepage,
legacy saving state-machine consolidation, unconnected tutor voice recorder, and
dependency candidates whose build/compatibility role is not yet established.
These were deliberately preserved pending a product decision.

This is an intentional product fork cleanup, with large asset-only deletions. Future TurboWarp merges may reintroduce the removed imports, menus or webpack entries. Review extension-policy installation before project loading, tutorial/add-on imports, cloud connections, and entry points during each merge. Lower-level dependencies have not been forked or upgraded.
