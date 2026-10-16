# Development decisions

## How we use this log

Record important product and technical decisions made by the project owner during development here, including scope changes, removed features, architecture choices, and explicit decisions to defer work. Add a dated entry with the decision, a short reason, what changed, and enough context to revisit it. Distinguish owner decisions from implementation details; do not record suggestions as approved decisions. If a decision changes, add a superseding entry rather than erasing the history.

This is the shared decision log for both `scratch-gui` and `scratch-backend`.
The 2026-10-09 consolidation draws on **questions Build backend** and **Build backend**,
and preserves the original entries below. Entries are chronological within each
section; related decisions made on the same day are grouped. Dates describe the
recorded discussion, not a promise that every requested feature is implemented.
Later entries explicitly supersede earlier choices. Temporary debugging, server
restarts, test counts, Git pushes and general explanations are not product decisions.

## General

### 2026-10-04 — Private guided learning, not a community platform

Students build predefined projects through guided courses. Persistence exists
to resume their own progress next session, not to publish, share or remix projects.
Reuse TurboWarp's existing architecture and simplify unnecessary community logic;
do not rebuild the editor. Keep lossless persistence separate from lossy AI input.

### 2026-10-04 — Minimal course authoring and English source content

A course has a starter SB3, a primary completed reference, optional alternative
solutions, a title/description and ordered milestones. Each milestone has an
objective, simple expected requirements and a hint ladder from nudge to explicit
help. Generate teaching content by inspecting both starter and completed files;
the initial course is `ueberfuellte-strasse` (Crowded Road – Lessons 7 and 8).
Keep course material in English and let the tutor adapt it to students' languages.
Do not require exact structural equality with the primary solution to accept a
valid alternative. Keep authoring minimal: manual validated import, no admin UI
or course-management CRUD API. Student-facing course reads are a later addition.

### 2026-10-05 — Development skills and conservative cleanup

Install relevant Matt Pocock engineering skills in the two projects, shadcn for
component work, and global Figma, shadcn, API-design, Node-backend and ADHD-support
skills. Add frontend design, web-design guidelines and composition skills for
the UI audit. These are development aids, not application dependencies or a
decision to migrate the entire UI to shadcn. Remove confirmed-unused code; ask
before removing uncertain features. Prioritize shared styling and keyboard
accessibility before broader visual redesign.

### 2026-10-06 — Deepgram voice alongside DeepSeek text guidance

Keep DeepSeek as the tutor model and choose Deepgram for both speech-to-text
and text-to-speech. Hold-to-talk sends a recording through the backend; its
transcript joins project/course context for DeepSeek, then the tutor's reply text
is synthesized. Typed and spoken questions receive the same text, highlights
and spoken replies. Quiet/text-only mode and real-time streaming conversation
are deferred. Keep Deepgram rather than switching to OpenAI for Chinese support;
Chinese is excluded for now.

### 2026-10-06 — Settings is the single language authority

Use Settings → Language for transcription, tutor replies and playback; remove
the separate tutor selector and replace automatic detection in the normal UI.
Restrict site-wide choices to English, German, Spanish, Japanese, French,
Italian and Dutch for the selected speech integration. Unsupported preferences
fall back to a supported language. Capture the language for each request so a
retry cannot silently switch languages. This supersedes the initial voice
implementation's automatic-language choice.

### 2026-10-09 — One shared decision log

Keep frontend, backend and general decisions together in this frontend file,
in chronological order within each section. Do not create a separate backend
log or a second `DECISION.md` alongside `DECISIONS.md`.

## Frontend

### 2026-10-02 — Simplify the inherited TurboWarp client

**Decision:** Remove inherited features that are unnecessary for the initial classroom game-creation product. Keep the codebase simple while preserving the core editor and the owner's explicit exceptions below.

#### Removed features

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

#### Explicit exceptions and deferred features

- **Keep featured public TurboWarp projects and metadata.** The Scratch studio reader stays because featured cards depend on it, along with project-ID loading and descriptions/creator information.
- **Keep the TurboWarp Packager integration.** Students may export finished games through the separate Packager website.
- **Disable hardware; retain its code.** micro:bit, LEGO EV3/WeDo/Boost, Vernier Go Direct and Makey Makey are hidden and blocked from loading. Their implementations, dependencies, firmware, assets and connection UI remain for possible future courses. See `src/lib/classroom-extension-policy.js` when revisiting this choice.
- **Keep core editing and playback.** VM, blocks, renderer, paint/audio editors, sprite/costume/sound/backdrop libraries, local SB3 save/load, restore points, backpack, fullscreen playback, languages and high-contrast/accessibility support remain.
- **Keep attribution and licenses.** Historical contributor acknowledgments remain in static `credits.html`; license text and source/asset notices are preserved.

**Tradeoff:** Some featured or imported projects require custom extensions or cloud networking. Their metadata/cards may still be visible, but those games may fail to load or lose online functionality. Removing UI also does not remove the corresponding internals from the separately maintained Scratch/TurboWarp dependencies.

#### Local URLs before and after

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

#### External connections removed or retained

| External URL | Previous purpose | Decision |
| --- | --- | --- |
| `wss://clouddata.turbowarp.org` | Cloud-variable WebSocket service | Client connection removed |
| `https://windchimes.turbowarp.org/api/chime` | Windchime telemetry submissions | Submission code removed |
| `https://extensions.turbowarp.org/generated-metadata/extensions-v0.json` | Fetch external extension catalog | Catalog fetching removed |
| `https://packager.turbowarp.org` | Export project through the Packager | Retained |

These external services were not deleted; this decision changes our client's use of them.

#### Implementation and restoration notes

Implemented on `codex/classroom-client-cleanup`. Source files dropped from approximately 70 MB to 4.2 MB; this measures the working source tree, not dependencies or the downloaded browser bundle. Removed tracked files can be recovered from Git history. Reintroduce a feature with its imports, routes, dependencies and tests, rather than copying only its directory. Preserve the extension restrictions and review upstream merges for accidental reintroduction of removed features.

See [the cleanup implementation notes](docs/classroom-client-cleanup.md) for run commands, validation, known legacy test limitations, and upstream merge considerations.

### 2026-10-02 — Start Supabase accounts with a local development environment

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

### 2026-10-03 — HTTP-only, opt-in AI tutor client (historical)

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

### 2026-10-03 — Tutor on by default; split state representations (historical)

Change the initial opt-in tutor-sharing default to on for signed-in students,
while retaining an off option for independent work. Then separate complete
persistence JSON/assets from compact tutor context: propose 1-second inactivity
or 15-second maximum tutor updates, plus dirty-aware persistence around every
20 seconds and manual Save. **Superseded on 2026-10-04:** tutor requests become
manual-only, and persistence is independent of tutor sharing. The old sharing
checkbox/timer is not a requirement to reintroduce background AI traffic.

### 2026-10-04 — Reactivate saving through the inherited saver boundary

Use the existing saver/fetcher/project-state architecture, adapting the supplied
newer Scratch saver rather than copying it wholesale. Adopt an injectable
storage/backend adapter, host-provided save function, testable transport and
configurable unload handling. Keep Supabase/HTTP outside the generic saver.
Remove Scratch-specific cookie auth, telemetry, community sharing/remix/save-copy
branches, author/project-page logic and thumbnail uploads from private saving.
Retain local SB3 import/export and exact VM restoration. This does not remove
course-card thumbnails or the earlier explicit public-featured-project exception.

Save about 20 seconds after the first unsaved edit; continuous editing must not
reset that deadline, and clean projects send no periodic requests. There is no
5-second quiet-period persistence rule. Workspace-only changes count for saving.
Manual Save captures current state immediately. Serialize saves and track edit,
captured and committed generations so an old response cannot mark new edits clean.
Keep useful save/retry status and an unload warning while work remains unsaved.

### 2026-10-04 — Manual tutor context only

Ask captures the current project and sends a deterministic, bounded pseudocode
projection separately from saving. Include Stage/sprites, scripts and nesting,
opcodes and real block IDs, values/variables/lists/broadcasts, comments, relevant
sprite properties and asset names. Exclude binary assets, hashes, workspace
coordinates and irrelevant serialization metadata. Never restore from this lossy
format. Ask must not trigger persistence or mark the project saved. No automatic
context synchronization or model calls; this supersedes the 1-/15-second proposal.

### 2026-10-04 — Fail clearly when a private project cannot be opened

Wait for account-session restoration, then stop loading and show a simple
sign-in-required error for signed-out private-project access. Reuse existing
error handling. Revert the unsuccessful speculative VM-loading fix and remove
temporary project-load console instrumentation once diagnosis is complete.

### 2026-10-05 — Backend-driven Courses overview and course details

Fetch course cards rather than hardcoding the initial course. Show title,
description and thumbnail/placeholder, with a details page for concepts,
difficulty, game description and playable preview. Start loads the starter SB3;
preserve course identity and provide navigation back to Courses. Add title/
description search without paid search services, difficulty sorting and manual
Mark completed tracking per account. Keep styling minimal and reuse existing
components; shadcn remains an option for later styling.

When saved progress exists, offer Continue course to restore the latest usable
save, while keeping Start again available. Persist course identity with the
private learning project, not only the URL, so returning sessions find the right
course context. Automatic milestone grading was not approved by this choice.

### 2026-10-05 — Read-only delayed tutor highlighting

Highlight recommended palette categories immediately, but wait eight seconds
before exact palette/workspace blocks fade in (one-second fade). Existing-block
hints must not highlight a palette category. Use red for remove and orange/amber
for inspect. Never delete/edit blocks, auto-switch sprites/categories or guess
a replacement ID. Preserve real VM IDs in tutor exports; validate exact sprite,
ID and opcode, and discard guidance for blocks edited/deleted since Ask.
Clear previous guidance on a new request or project/account change.

### 2026-10-05 — Tutor presentation evolves into a single chat

Initially show text in a fixed corner reply box, allow blank questions for a
next-step suggestion, and make replies expandable without another API call.
Add pretty-printed complete feedback and then `react-json-view-lite` for a
collapsible `{request, response}` inspector, including local-debug provider input.

Later that day, supersede the separate Ask modal and reply box with one **Ask
Tutor** chat. Show student questions and tutor replies in order, auto-scroll on
new messages, preserve session history across closing/reopening, and retain a
JSON-view toggle. Remove the "Only pressing Ask sends..." paragraph. Voice
transcripts belong in that same chat when voice support is added.

### 2026-10-05 — Course-focused header and accessible shared controls

Place Courses beside Settings/Advanced. Default the editable project name to
the course title; renaming affects only the student's instance, never the shared
course. Put Saved/Unsaved/Saving status inside Save, with a spinner and disabled
state during saving. Remove the duplicate toolbar computer-download action;
File export remains. Improve contrast, theme consistency, component style
scoping and keyboard focus; use native buttons while preserving game inputs.

### 2026-10-05 — Stage layout request canceled; not implemented

The requested layout would remove the separate Stage column, expand the sprite
area and place Stage centered at its bottom, below sprites when they overflow.
The owner canceled before file edits. Record as canceled, not shipped or an
instruction to resume. No decision was made to remove the Backpack.

### 2026-10-06 — Hold-to-talk and resilient playback

Record only on an intentional microphone-button hold, show the transcript in
chat, and support text as a fallback. Display reply text/highlights before audio
is ready; provide native pause/replay and handle blocked autoplay. Audio failure
must not hide text or rerun DeepSeek. Stop/discard recording on cancel, close,
project/account change or loss of focus. Keep audio/chat state temporary.

### 2026-10-09 — Bounded local change queue and recent conversation

Keep the last 40 meaningful block additions/removals/modifications in frontend
memory, each with sprite, actual block ID, opcode, action and timestamp. Track
values and connections, not workspace coordinates; coalesce intermediate edits
(implementation uses 300 ms). Include the last four completed question/reply
exchanges. Send both only with Ask; never send every edit to the backend.
Do not empty the queue after sending: evict oldest entries as new ones arrive.
Reset on project/account change or reload. Retries reuse the captured input and
must not duplicate conversation entries. This is learning context, not save history.

### 2026-10-11 — Static block previews undone; Markdown remains proposed

The owner requested opcode-named SVG previews with blank padded dropdown values.
The generated set covered 155 block types in seven languages, using native editor
styling. The owner then explicitly requested undoing that change. Remove only
those generated previews, their generator, tests, package commands and associated
build artifacts; preserve unrelated SVGs and changes. No preview integration into
the chat or backend was implemented. Do not resume this work automatically.

Visual block mentions in tutor chat remain a desired direction under discussion,
not an approved response-contract change. Restricted Markdown image references
such as `![localized block name](block:OPCODE)`, frontend resolution to trusted
local images, validation against available opcodes/matching highlights, and alt-text
conversion for TTS were suggested by the assistant. They have not been implemented
or accepted as a final design. Combined project-specific block/value rendering was
deferred in the discussion. The current response remains plain text plus structured
highlights and language; existing opcode validation does not validate hypothetical
Markdown references or prove text/highlight semantic agreement.

## Backend


### 2026-10-03 — Separate authenticated Node service

Build against the frontend backend contract using Node/Express, Supabase bearer
authentication and SQLite for initial private project storage. Protect JSON and
asset endpoints by ownership, revision ordering, canonical hashes, idempotency,
stale-write rejection, immutable asset validation and quotas. Connect the existing
client through public backend-base-URL configuration. Keep provider credentials
and private configuration server-side; `.env`, local databases/logs and private
course archives stay out of Git. CORS is an origin allowlist, not authorization;
normal browser preflights are not combined with the actual save request.

### 2026-10-03 — Live local request observability

Add console request metadata plus a live simple-HTML `/debug/logs` viewer, with
arrival/completion, method/path, status, timing and error category. Link successful
persistence entries to the exact accepted project JSON. Later separation must
distinguish persistence, assets, manual tutor and speech activity. Keep viewer
local/debug-only; never console-log credentials, questions, project data or bytes.

### 2026-10-04 — Lossless project storage versus transient tutor requests

Persistence stores full VM JSON, the asset manifest and required costume/sound/
font bytes, sufficient for exact reload including workspace layout. Upload JSON/
manifest first and only missing assets afterward. Use stable owner-bound UUID
project IDs, separate from tutor request UUIDs, with authenticated private project,
revision and asset routes. Do not couple saving to tutor use.

Compact student context is passed through to the AI and discarded, never stored
in project history, database, backups, logs or analytics. Retain only minimal
request receipts (owner/UUID/input digest/status/timestamps) and feedback needed
for retries. Same ID/input returns the existing result; changed input conflicts.
Do not automatically reinvoke a failed/uncertain paid provider request. A missing
provider may acknowledge without fabricating a reply. Temporary debug inspection
does not authorize durable context storage. External-provider retention is separate.

### 2026-10-04 — Latest save is the desired restoration model

The owner chose keeping the latest full project snapshot rather than accumulating
copies solely for history. Preserve revision ordering and retry safety even if
old payloads are pruned. **Desired policy, not an implementation claim:** discussion
identified retained revision payloads and asset-lifecycle cleanup as follow-up;
do not assume latest-only storage or garbage collection is already implemented.
Asset files are content-addressed/immutable; modifying an asset creates a new
reference, rather than overwriting shared bytes in place. Filesystem/object-storage
migration was discussed, not selected; initial asset storage uses SQLite blobs.

### 2026-10-04 — Validated manual course import

Store course directories with `course.json`, starter/primary SB3 and optional
alternative SB3 files. Provide a local command that validates metadata, archives
and references and imports/updates atomically by stable course ID. Preserve
milestone/hint order and existing data on failure. No admin UI or management API
for now. Course reference data is durable, unlike student tutor context.

### 2026-10-05 — Playable demo exception and per-account progress

Initially keep completed references and alternatives off the client. Supersede
that blanket rule for the primary playable demo: the owner explicitly prioritizes
playing the finished game, allowing its code/assets to reach the browser in the
background without an obvious solution/editor link. This is not code secrecy;
browser-delivered projects remain inspectable. Alternative solutions remain private.
Add student-facing course reads, manual completion records and Continue lookup
using account-owned usable saves. Associate course ID durably with a private
project; when resolving tutor context, the saved association takes precedence
over a URL-supplied course ID.

### 2026-10-05 — Real DeepSeek provider with cached reference projections

Invoke configured DeepSeek Flash on intentional Ask with reduced current student
state, the selected course's completed primary projection, curriculum/milestones/
hint ladders and optional question. Cache deterministic completed-reference
projections alongside raw reference SB3 during import, including alternatives;
backfill existing courses. Requests use the cached primary projection, not raw
archives or all alternatives. Keep reference and student evidence distinct;
teach toward objectives rather than dump the final solution. Text-only was the
initial scope, superseded by the 2026-10-06 voice decision.

### 2026-10-05 — Catalog-aware structured replies and short guidance

Generate a category-nested catalog from installed block definitions; use opcodes
for block-type identity and existing workspace IDs for individual-block identity.
Filter disabled hardware, hidden/legacy/internal/example blocks; retain permitted
optional extensions and mark input-only helpers. Respect active target/palette
and loaded extensions when recommending blocks.

Use backend-owned `responseGuidance` and `highlightGuide`: child-friendly plain
text for speech, one small next step, approximately 50 words and maximum 80.
Replace separate category/opcode highlight arrays with `highlights.blocks`, each
containing category, opcode and add/remove/inspect action; remove/inspect also
require exact student sprite/ID. Empty arrays are valid when no hint is needed.
Every specific block recommendation should have a matching highlight entry.
Validate pairs and availability, never infer replacement references. Update
provider, validation and UI together; JSON mode alone does not ensure correctness.
Language is added to replies with voice support.

### 2026-10-06 — Authenticated transient speech pipeline

Keep Deepgram keys on the backend. Transcribe uploaded recordings, send text plus
normal tutor context to DeepSeek, then synthesize only the tutor's reply text.
Authorize audio against the owner's completed reply; do not accept arbitrary
client text for TTS. Bound recording size/duration, work, timeouts and caches;
deduplicate retries without retaining source audio/transcripts. Speech failures
must preserve the completed text reply and must not cause another model call.
Provider privacy/consent requirements remain separate from local non-retention.

### 2026-10-08 — Improve text/highlight consistency without a schema redesign

Approve four incremental changes: explicit valid `availableAdditions` and
`existingBlocks`; a compact model-facing catalog retaining labels/inputs/nesting/
restrictions but dropping extraction/style/media noise; highlights-first examples
and instructions to check advice against entries; and transient local-debug
accept/reject diagnostics with counts and reasons. Keep the full filtered source
catalog for generation/validation, but no longer send it verbatim. Diagnostics
distinguish omitted entries from rejected entries without persisting student data.
A step-based response redesign was suggested, not approved; prompts improve
consistency but do not guarantee semantic agreement between prose and highlights.

### 2026-10-09 — Use temporary history to recognize student progress

Validate and forward the bounded change queue and recent conversation with
current state/reference/curriculum. Do not persist these histories. Instruct the
tutor to acknowledge specific meaningful progress briefly before the next step,
without repeated generic praise or claiming edits prove a feature/milestone works.
Treat histories as untrusted context, not instructions; removed historical IDs
cannot be used as current highlight targets. History remains part of the immutable
input for retries. No automatic milestone grader or permanent conversation memory
was added by this decision.


### 2026-10-11 — Dynamic tutor block previews and value chips

Implement the explicitly requested inline plain-text marker grammar:
`[[block:opcode|spoken label]]` and `[[value:level]]`, with backslash escapes for
backslash, vertical bar and closing bracket. This supersedes the earlier
plain-text-only restriction for this bounded grammar; it does not restore static
SVG assets or introduce Markdown/HTML replies. Backend parsing returns validated
parts and derives speech/history text from those parts. Each preview must match
exactly one validated highlight; existing blocks require that highlight's exact
student sprite/ID/opcode. Ambiguity falls back to the spoken label with no ID search.

Use editor-owned palette/current-workspace XML captured transiently at Ask and
render through the installed Blockly renderer in temporary read-only workspaces.
Keep intended values in separate rounded, non-interactive chips. Missing or
ambiguous source data, unsupported renderers and malformed markers fall back to
readable text. No model-supplied HTML/XML, automatic project edits, extra provider
calls or durable preview snapshots. Preserve highlighting timing, JSON inspection,
Settings languages, immutable retries, speech authorization and privacy handling.


### 2026-10-11 — Clarify tutor evidence and reply semantics

After observing a tutor confuse a sprite's current Y position of 6 with its
already-edited go-to Y input of -150, add a backend-owned `requestGuide` describing
projection indentation, block inputs/fields, current properties and variable/list
values, reference/curriculum, availability and session history. Current code
inputs override stale tutor claims. Require checking whether a requested change
already exists before repeating advice; edits/current state do not prove execution
or milestone completion. Explain preview defaults versus intended value chips,
use inspect for edits to existing inputs, and keep examples explicitly synthetic.
No projection/API response/storage changes or automatic model calls. Prompt tests
verify transmitted instructions, not guaranteed semantic correctness of live replies.


### 2026-10-11 — Accept equivalent student implementations

Teach toward the lesson outcome rather than exact reference-code matching.
Accept alternative logic and harmless speed/value variations, including change
x/y by 6 instead of 5 when the intended movement still works. Preserve reasonable
student approaches; only recommend corrections for concrete logic problems,
meaningful behavior differences or explicit curriculum requirements. When
outcome equivalence is uncertain, suggest a small test. This does not establish
verified execution, automatic grading or milestone completion.

### 2026-10-12 — Collapse the block palette when coding space is narrow

Keep the category rail visible. When the actual editor pane cannot reserve the
full toolbox plus 480 CSS pixels of coding space (currently 790 pixels total),
start with the block palette collapsed. Category selection, including selecting
the same category again, opens the existing Blockly palette over the workspace.
Collapse it once a palette block is being dragged beyond the palette into the
workspace; do not collapse for vertical palette scrolling or workspace drags.
The compact workspace reserves only the category rail, so closing the overlay
does not move the live drag or enlarge its deletion target. Wide layouts restore
the permanent palette. Preserve collapsed state across toolbox rebuilds and
defer layout-mode changes during active gestures or hidden Code tabs.

Use a disposable, instance-scoped frontend adapter around the installed
Scratch/Blockly methods, with no dependency fork, project edits or backend/API
changes. Focused tests cover transitions, mouse/touch event handling, RTL,
rebuilds and cleanup. Isolated headless Chrome checks verify actual Blockly
mouse drag/drop and stable origins in LTR/RTL; touch hardware remains untested.

### 2026-10-12 — Preserve palette drag listeners across collapsed rebuilds

The compact palette exposed Scratch/Blockly's `Flyout.hide()` early return when
already hidden: `show()` then skipped removing listeners for blocks discarded
during a locale refresh. Subsequent recycling retained stale callbacks, preventing
the reused Operators above join (and other static blocks) from starting a drag.
Before rebuilding, synchronously restore flyout visibility so the existing
`show()`/`hide()` cleanup runs; restore the collapsed state after measurement.
Do not change block definitions, VM data or drag semantics.

Add a real-renderer headless Chrome regression test using synthetic disposable
toolboxes. It reproduces the locale recycling-off/rebuild/recycling-on sequence
and checks arithmetic, random, comparisons, boolean operators and join in LTR
and RTL: hit-tested drag, collapse, stable workspace origin, drop and reopening.
The test fails before the fix and passes afterward. It requires an installed
Chrome/Chromium (`CHROME_BIN` may override detection); it skips if unavailable.

### 2026-10-13 — Collapse the compact palette at block pickup

Supersede the requirement to drag beyond the palette edge. Close the compact
palette as soon as Blockly starts dragging a palette block, after its clone and
drag surface are initialized, even while the cursor remains inside the palette.
Retain Blockly's normal small drag-start threshold so input clicks and vertical
palette scrolling still work. Wide layouts retain the permanent palette. Update
mouse/touch tests and the real-renderer Operators regression to assert collapse
at pickup within the palette, stable origins and successful subsequent drop.
