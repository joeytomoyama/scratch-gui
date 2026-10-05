# Private persistence implementation report

## Architecture and reused lifecycle

The existing saver HOC, fetcher HOC, project-state reducer, VM loading path, URL state manager and header save controls now implement private account-owned persistence. Persistence is independent of the tutor feature. A generation-aware controller captures full VM JSON and immutable assets, sends JSON first and uploads only missing assets. Private UUID URLs restore the same project through a ZIP assembled for the normal VM loader.

The supplied newer Scratch saver was reference code, not copied wholesale. Its useful boundaries were adopted: injectable adapter, host-provided save callback, independently testable transport and configurable unload handling. Supabase and HTTP remain outside the generic controller.

Dirty edits start a fixed 20-second timer; continued edits do not postpone it. Layout changes count. Manual Save captures current state immediately. Saves are serialized, failed jobs retain their original bytes/revision, and responses commit only their captured generation. Newer edits remain dirty and keep the unload warning active.

## Main changed files

- `src/lib/project-saver-hoc.jsx`, `project-fetcher-hoc.jsx`, `save-project-to-server.js`, `storage.js`: adapted existing persistence/loading boundaries.
- `src/lib/project-persistence.js`, `private-project-api.js`: generation controller and authenticated adapter.
- `src/reducers/project-state.js`, `persistence.js`, `gui.js`, `src/lib/tw-state-manager-hoc.jsx`: private identity, loading, status and stable URL lifecycle.
- `src/components/menu-bar/menu-bar.jsx`, `tw-save-status.jsx`, tutor menu and playground integration: private Save/status and explicit Ask flow.
- `src/lib/tutor/manual.js`, `projection.js`: immutable manual requests and compact readable projection. Obsolete automatic tutor synchronization modules were removed.
- Backend `src/app.js`, `store.js`, `validation.js`, `tutor.js`, `logs.js`: private routes, ownership, immutable revisions/assets, minimal tutor receipts and categorized logs.
- Frontend/backend tests, `docs/BACKEND_API.md` and backend `README.md` document and verify the contract.

Scratch cookie-authenticated saving, telemetry, thumbnail uploads, public sharing/community controls, author lookup integration, remix/save-copy controls and their exclusive state-machine branches are no longer part of this saving flow. Built-in asset library reads and local SB3 compatibility remain.

## APIs and data lifetime

| Endpoint | Purpose |
| --- | --- |
| `PUT /v1/projects/:id/revisions/:revision` | Full JSON and asset manifest; returns missing assets |
| `GET /v1/projects/:id` | Owned saved project |
| `PUT/GET /v1/projects/:id/assets/:fileName` | Immutable owned asset bytes |
| `POST /v1/tutor/help` | Explicit manual question and compact context |
| `GET /debug/logs` | Loopback-only live categories and exact persistence snapshot links |

Project JSON, revision history and assets are durable. Every private request uses a fresh bearer token and server ownership checks. Canonical hashes, stale-revision rejection, idempotent retries, size limits and quotas remain enforced.

Tutor question/context is transient backend input, never project history or log content. Durable receipts contain owner, request UUID, normalized input hash, status, timestamps and optional resulting feedback. Identical retries reuse the same result; changed input with the same ID conflicts. Legacy help metadata is migrated to minimal receipts. External provider retention depends on that provider's actual configuration.

The debug console records request metadata, not tokens, questions, full project bodies or asset bytes. Persistence snapshot links read their exact stored revision. AI context is not exposed in the debug viewer.

## Verification

- Frontend: 18 suites, 116 tests passed.
- Backend: 10 tests passed.
- Changed frontend source files pass ESLint; both repositories pass `git diff --check`; development webpack compiled successfully.
- Tests cover first save/UUID adoption, exact JSON/assets and real VM block layout restoration, account isolation, fresh tokens, idle behavior, fixed dirty timing, manual capture, in-flight edits, immutable retries, revision ordering, manual-only tutor calls, projection exclusions and hash-only durable tutor receipts.
- Signed-in browser test: changed sprite position; observed delayed persistence and missing-asset uploads; manually saved another edit; reloaded the stable UUID URL and restored position/assets.
- Added a block in the browser, saved and reloaded; the block and its workspace placement restored.
- Manual Ask produced one help submission and the honest no-provider acknowledgement, with no persistence submission caused by Ask. Inspected durable tutor receipt columns and records: no question or compact context storage.

## Limitations and operational notes

- No external AI provider is configured. The endpoint validates and acknowledges until a host supplies a provider; it does not invent feedback.
- Audio input/feedback is not implemented or exposed in the tutor UI.
- There is no project-list or course-management UI yet; resume using the stable project URL.
- Concurrent writers receive revision conflicts, not automatic merging.
- An interrupted provider operation is not blindly invoked again after a server crash; provider-side reconciliation is needed for uncertain outcomes. This favors avoiding duplicate billing over automatic recovery.
- Asset validation checks immutable content and limits, not full media decoding.
- Existing external backups cannot be retroactively erased by the migration; retention must be managed operationally.
- Backend restart clears in-memory log history, so old debug snapshot links can expire. Saved projects remain durable.
- Unrelated working-tree edits were preserved. No commit was created.
