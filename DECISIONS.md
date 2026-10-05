# Development decisions

## How we use this log

Record important product and technical decisions made by the project owner during development here, including scope changes, removed features, architecture choices, and explicit decisions to defer work. Add a dated entry with the decision, a short reason, what changed, and enough context to revisit it. Distinguish owner decisions from implementation details; do not record suggestions as approved decisions. If a decision changes, add a superseding entry rather than erasing the history.

## 2026-10-02 — Simplify the inherited TurboWarp client

**Decision:** Remove inherited features that are unnecessary for the initial classroom game-creation product. Keep the codebase simple while preserving the core editor and the owner's explicit exceptions below.

### Removed features

| Feature | What was removed / why it may matter later |
| --- | --- |
| Scratch tutorials | Floating tutorial cards, tutorial library, URL handling, and roughly 59 MB of illustrated/localized decks. Already inactive in TurboWarp; our structured courses will provide lesson guidance. |
| Optional add-ons | All 81 bundled add-ons, their runtime hooks, settings, manifests, and translations. Included cosmetic tweaks, alternative layouts, gamepad support, recording, and debugging/editor conveniences. Individual useful features can be reconsidered later. |
| Novelty modes | Old-timey, prehistoric, nineties, and cat-mode UI/assets and time-travel state. Decorative features outside the course workflow. |
| Arbitrary project URL loading | Public project ID/URL input and the `project_url` query loader. Local file import and the project-ID routing required by featured projects remain. |
| Custom extensions | External extension gallery, arbitrary URL/file/JavaScript loading, unsandboxed trust persistence, and associated permission dialogs. A small extension policy now rejects external extensions, including those requested by imported projects. |
| Cloud variables | TurboWarp cloud networking, connection controls/badge, and the change-username UI/random persistent username flow. Local Scratch variable behavior remains; networked games would need an explicitly designed service. |
| Inherited telemetry | Windchime submissions, the unused Google Analytics dependency, telemetry UI and reporting callbacks. Future analytics should be a separate product decision. |
| Public-site news and feedback | TurboWarp news notices and upstream feedback links. Product-specific support can be added later. |
| Desktop-only UI | Packaged desktop application settings and new-window controls. The browser editor remains the target. Hardware connection code was not removed. |
| Extra web entries | Embed and add-on settings pages, embed demo pages, and the credits JavaScript entry. Credits were converted to static HTML rather than discarded. |

### Explicit exceptions and deferred features

- **Keep featured public TurboWarp projects and metadata.** The Scratch studio reader stays because featured cards depend on it, along with project-ID loading and descriptions/creator information.
- **Keep the TurboWarp Packager integration.** Students may export finished games through the separate Packager website.
- **Disable hardware; retain its code.** micro:bit, LEGO EV3/WeDo/Boost, Vernier Go Direct and Makey Makey are hidden and blocked from loading. Their implementations, dependencies, firmware, assets and connection UI remain for possible future courses. See `src/lib/classroom-extension-policy.js` when revisiting this choice.
- **Keep core editing and playback.** VM, blocks, renderer, paint/audio editors, sprite/costume/sound/backdrop libraries, local SB3 save/load, restore points, backpack, fullscreen playback, languages and high-contrast/accessibility support remain.
- **Keep attribution and licenses.** Historical contributor acknowledgments remain in static `credits.html`; license text and source/asset notices are preserved.

**Tradeoff:** Some featured or imported projects require custom extensions or cloud networking. Their metadata/cards may still be visible, but those games may fail to load or lose online functionality. Removing UI also does not remove the corresponding internals from the separately maintained Scratch/TurboWarp dependencies.

### Local URLs before and after

These are frontend pages/routes, not backend API endpoints. Use `http://localhost:8601` as the local base URL. Removed routes no longer have a dedicated build output; the development server's history fallback can still return the player page with HTTP 200, so status alone does not prove a route still exists.

| URL / route | Before cleanup | After cleanup |
| --- | --- | --- |
| `/` or `/index.html` | Player, public project input, featured projects | Player and featured projects retained; arbitrary project input removed |
| `/editor.html` | Full TurboWarp editor with optional integrations | Simplified editor retained |
| `/fullscreen.html` | Fullscreen player | Retained |
| `/addons.html` | Configurable add-on settings | Removed |
| `/addons` | Rewrite to add-on settings | Rewrite removed |
| `/embed.html` | Embeddable project player | Removed |
| `/<project-id>/embed` | Rewrite to embedded player | Rewrite removed |
| `/embedtest.html` | Embed demonstration page | Removed |
| `/embedtestbad.html` | Invalid-embedding demonstration page | Removed |
| `/credits.html` | Standalone React credits application | Retained as static About/Licenses HTML; no credits JS bundle |
| `/editor.html?project_url=<url>` | Fetch project data from an arbitrary URL | Parameter no longer loads a project |
| `/editor.html?extension=<url>` | Load an external extension from a URL parameter | Parameter no longer loads an extension |
| `/<project-id>`, `/<project-id>/editor`, `/<project-id>/fullscreen` | Project route rewrites for wildcard routing | Retained; full path-based behavior requires `ROUTING_STYLE=wildcard` |

Default local routing still uses file paths and project hashes, for example `/editor.html#<project-id>`.

### External connections removed or retained

| External URL | Previous purpose | Decision |
| --- | --- | --- |
| `wss://clouddata.turbowarp.org` | Cloud-variable WebSocket service | Client connection removed |
| `https://windchimes.turbowarp.org/api/chime` | Windchime telemetry submissions | Submission code removed |
| `https://extensions.turbowarp.org/generated-metadata/extensions-v0.json` | Fetch external extension catalog | Catalog fetching removed |
| `https://packager.turbowarp.org` | Export project through the Packager | Retained |

These external services were not deleted; this decision changes our client's use of them.

### Implementation and restoration notes

Implemented on `codex/classroom-client-cleanup`. Source files dropped from approximately 70 MB to 4.2 MB; this measures the working source tree, not dependencies or the downloaded browser bundle. Removed tracked files can be recovered from Git history. Reintroduce a feature with its imports, routes, dependencies and tests, rather than copying only its directory. Preserve the extension restrictions and review upstream merges for accidental reintroduction of removed features.

See [the cleanup implementation notes](docs/classroom-client-cleanup.md) for run commands, validation, known legacy test limitations, and upstream merge considerations.

## 2026-10-02 — Start Supabase accounts with a local development environment

**Owner decision:** use Supabase for the initial account integration, exposed by
a general Account dropdown in the editor's top-right corner. The usual account
flows must be testable locally and security must be considered from the start.

**Initial implementation:** email/password registration, verification/resend,
sign-in/out, password recovery, editable display name, email/password changes,
and sign-out across sessions. Supabase is isolated behind an account-service
adapter and the existing editor remains usable without signing in. Docker runs
local Auth/PostgreSQL and a test-email inbox; only public configuration enters
the browser build.

**Not decided or implemented by this milestone:** online project saving,
classroom roles/permissions, social login, MFA, account deletion, billing, or
production deployment. Account security is a continuing engineering/review
requirement, not a “bulletproof” guarantee. See [accounts setup and security
boundaries](docs/accounts.md), including the local current-password enforcement
limitation and production checklist.

## 2026-10-03 — HTTP-only, opt-in AI tutor client

Owner decision: send full project JSON (without binary assets) after meaningful
edits with a 1-second debounce and a 15-second maximum pending interval. Ignore
workspace-only layout/UI changes. Send compact change hints and numbered,
immutable revisions; the separate backend controls AI analysis and must enforce
ownership, idempotency and stale-write protection. Use existing Supabase auth
and public `BACKEND_BASE_URL` configuration.

Ask for Help sends the latest state immediately with text and/or an explicitly
recorded microphone question. Feedback supports text and protected audio playback.
Sharing is opt-in per loaded document; assets upload separately on demand, with
an SB3 restoration helper. Pending work is in memory, not durable offline storage.
No backend, provider integration, WebSockets, polling, highlighting or AI-driven
editing is included. See [the backend contract](docs/BACKEND_API.md) for exact
endpoints, revision rules, security responsibilities and current limitations.
