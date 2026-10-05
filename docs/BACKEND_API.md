# Private learning projects and manual AI tutor — HTTP contract

This product keeps two independent flows: lossless private persistence for continuing work, and an intentional manual AI question using a lossy projection. There is no publishing, remixing, automatic tutor-context synchronization, or background model invocation.

## Configuration and authentication

Set frontend `BACKEND_BASE_URL` and restart webpack. Environment precedence is process environment, `.env.local`, `.env`. Use HTTPS except local development. Backend `SUPABASE_URL` must match the frontend instance. Every API call, including every asset request and retry, obtains a fresh Supabase bearer token. Cookies and redirects are omitted. Server verifies signature, expiry, issuer, audience, and subject. Ownership comes only from verified subject.

Configure exact `CORS_ORIGINS`; preflight OPTIONS does not need authentication. Allow GET, PUT, POST, OPTIONS and Authorization/Content-Type. The current local pair is frontend `http://localhost:8601`, backend `http://127.0.0.1:3001`, Supabase `http://127.0.0.1:56321`.

## Private persistence

The existing `ProjectSaverHOC` manages a `ProjectPersistence` controller when a signed-in account and loaded editor are available. It accepts `createProjectAdapter`, host `onUpdateProjectData(adapter,id,snapshot,files)`, `onSetProjectSaver` and `noBeforeUnloadHandler`. The generic saver contains no Supabase/HTTP details. `private-project-api.js` implements transport; the fetcher reconstructs an SB3 ZIP and uses the existing VM loading lifecycle.

Project IDs are stable UUIDs, independent of temporary AI request UUIDs. First successful save binds the document to its owner and updates the editor URL to `editor.html#<uuid>`. Bookmark that URL to resume in a later authenticated session. Opening a new project or importing an SB3 creates a different private identity on first save. Local SB3 import/export remain separate controls. No project-list/course-management UI is implemented. Course/lesson associations can be added without changing project identity.

| Method/path | Body | Response |
| --- | --- | --- |
| PUT `/v1/projects/{id}/revisions/{revision}` | Full snapshot JSON | 200 `{revision, missingAssets}` |
| GET `/v1/projects/{id}` | — | 200 `{revision, project, assets}` |
| PUT `/v1/projects/{id}/assets/{fileName}` | Raw octet-stream bytes | 204 |
| GET `/v1/projects/{id}/assets/{fileName}` | — | 200 octet-stream |

```ts
interface AssetReference { fileName: string; byteLength: number }
interface Snapshot {
  revision: number; // positive JS safe integer
  project: object; // complete parsed VM.toJSON(), never the tutor projection
  assets: AssetReference[]; // all VM.serializeAssets() files
  summary: []; // retained wire field; persistence does not compute AI summaries
}
```

Persist the full project unchanged: blocks and positions, comments and their layout, monitors, variables/lists and values, sprite properties, costumes, sounds, custom fonts, extensions, compatibility fields, and all other serialized settings. The manifest comes from `serializeAssets()`, including original broken-asset bytes retained by the VM. Missing or inconsistent costume/sound/font references are rejected. The backend does not execute code or fetch extension URLs.

Submit JSON/manifest first, then upload only the missing files named by the response. The UI reports Saved only after all required uploads finish. GET returns `409 assets_incomplete` until the captured head is restorable. Immutable assets from older revisions remain available throughout downloads and later saves. The adapter validates download lengths and packages the exact JSON and bytes into SB3.

### Timing and races

- Every `PROJECT_CHANGED` event counts, including workspace layout. UI-only events that do not change the VM do not create saves.
- The first unsaved edit starts a 20-second timer. Further edits do not postpone it. The latest full state is captured at send time.
- Header Save captures immediately; saves are serialized. If another save is running, manual Save queues behind it and then captures newer work.
- Track current edit generation, captured/saving generation and committed generation. Completing an old save commits only its captured generation. Newer edits remain dirty.
- Failed saves retain their exact UUID, revision, snapshot and asset bytes for retry. Retry completes that immutable job before saving later edits. Failure does not start an idle retry loop.
- No changes means no persistence requests. Manual Save may create a new untouched project intentionally.
- Unload warns while work or required assets remain uncommitted. Pending work is memory-only; closing/reloading can lose it. Cancellation cannot undo an already committed server request.

Backend transactions atomically bind owner, validate revision, store canonical SHA-256 hash/full payload/manifest and advance the head. Same revision + same parsed payload is an idempotent acknowledgement, including older accepted revisions. Changed content at an accepted revision is `409 revision_conflict`; unseen lower revisions are `409 stale_revision`. Higher revisions advance the head; lower arrivals never roll it back. Acknowledgements echo submitted revisions and recompute missing assets. Concurrent writers are not merged: a conflicting browser must reload before continuing.

### Limits and protected assets

Assets must match `^[a-fA-F0-9]{32}\\.[a-zA-Z0-9]{1,10}$` and a previously accepted manifest. Validate size, format/container signature and MD5; retain a strong internal SHA-256 and never overwrite conflicting bytes. Access is scoped to document and owner. Foreign and nonexistent projects both return 404.

Limits: 10 MiB JSON, depth 64, 2,000 manifest entries, 20 MiB per asset, 100 MiB aggregate referenced assets and 100 MiB retained revision payloads per document, 100 documents per owner. Current rate limit is 120 authenticated requests/minute/owner/process. Responses use `Cache-Control: private, no-store`; protected bytes are not publicly cached. Container checks do not replace complete media decoding or sanitization.

## Manual AI tutor

`POST /v1/tutor/help` accepts JSON only:

```ts
interface HelpRequest {
  requestId: string; // a new UUID for each intentional Ask
  question?: string; // trimmed, 0..2000 UTF-16 code units; blank/omitted asks for a next step
  context: { version: 1; text: string }; // bounded deterministic projection
  course?: { course?: string; lesson?: string; objective?: string };
  projectId?: string; // owned saved project UUID
  editor?: {target: {name: string; isStage: boolean}; palette: string[]; extensions: string[]};
}
interface HelpResponse {
  requestId: string;
  status: 'acknowledged' | 'processing' | 'complete' | 'failed';
  debugInput?: object; // exact provider user data, transient local debug mode only
  feedback?: {
    id: string; text: string; audio: false;
    highlights: {
      blocks: ({category: string; opcode: string; action: 'add'} |
        {category: string; opcode: string; action: 'inspect' | 'remove'; sprite: string; id: string})[];
    };
  };
}
```

Ask captures `vm.toJSON(null, {allowOptimization: false})` immediately and projects it into stage/sprite names, human-readable scripts, stable block IDs, graph order and nesting, broadcasts, variables/lists and current values, comments, relevant sprite properties, costume/sound names and extensions. Host-supplied course context is optional. Course text is untrusted descriptive input, never authorization or verified curriculum metadata.

Projection excludes binaries, asset hashes/lengths, block/comment layout, monitors/UI metadata, volatile VM metadata, and empty collections. Sprite x/y is retained as program-relevant state. Unknown opcodes use readable opcode words; custom block signatures are included. Traversal has cycle, nesting and size limits and explicitly marks truncation. This is lossy AI input, never a restoration format.

Manual Ask does not save a project, mark it saved, advance revisions, reset the dirty timer or upload assets. There are no automatic AI calls. Backend accepts at most 1 MiB JSON; context text is capped at 200,000 code units; optional course fields at 2,000 each. Recorded questions currently return 415; the UI exposes text only until bounded audio decoding/transcription is implemented.

The backend adds the cached reference/curriculum, full parsed filtered `blockCatalog`,
and backend-owned `responseGuidance`/`highlightGuide`. Client overrides are rejected.
The editor supplies its active target, actual palette (including dynamic categories)
and loaded extensions. This metadata is bounded to 500 palette types and 50 extensions.

Highlight entries are untrusted read-only guidance. Backend and frontend check catalog
category/opcode pairs, input-only status, target restrictions and loaded extensions.
Additions must appear in the actual active-target palette. Catalog categories `event`,
`data`, `dataLists` map to toolbox `events`, `variables`, `variables`;
extension categories are extension IDs and opcodes are prefixed `extensionId_opcode`.

Only `add` highlights the palette category immediately. Exact blocks fade in after
8 seconds over 1 second: `remove` red, `inspect` orange/amber. Remove/inspect never
highlight a category. IDs/sprites/opcodes must match explicit student projection
lines, never reference-only blocks. Invalid/mismatched IDs are ignored without
same-type guessing. Transient fingerprints captured before Ask invalidate guidance
for semantic edits/deletions (including nested input edits) while waiting or after
the reply. Layout-only moves do not. Legacy highlight shapes are ignored.

The collapsible read-only reply tree remains `{request, response}`. No blocks are
edited or automatically selected, and no category/sprite switch or audio is added.
Text targets approximately 50 words and is limited to 80 word segments, without
common Markdown formatting.

### Retention and idempotency

The backend stores only `(owner, requestId, normalized-input hash, processing status, timestamps, optional resulting feedback)` in `tutor_requests`. It never stores question or compact context in project revisions, database columns, logs or analytics. Processing input exists only in request/provider memory, bounded by body size and a 45-second provider deadline. The provider adapter must honor AbortSignal and must not retain/log inputs. Editor availability is also transient. Local `LOCAL_LOG_VIEWER=true` (not production) exposes exact provider user data as `debugInput` only to the authenticated Ask caller. Keys, headers and system prompts remain hidden; debug input is never persisted/logged and cached retries omit it.

Retries resend the exact original question, context, editor availability and request ID retained in client memory. Same owner/ID/hash returns or waits for the same logical result; changed input returns `409 idempotency_conflict`. Provider work is claimed durably before invocation. Concurrent duplicate submissions cannot invoke it twice. A provider error/timeout is terminal for that ID; a crash can leave processing status unknown, and the server deliberately does not reinvoke it. Exactly-once provider billing across crashes requires provider-side idempotency/reconciliation. A new Ask is a new intentional request.

No AI provider is configured by default: validate, hash and acknowledge without feedback. A host can inject `provider(input,{signal,idempotencyKey})` into `createApp`. Actual external-provider retention depends on the provider/account configuration and must be reviewed before enabling it. Current feedback is plain text, capped at 80 word segments and 10,000 code units. Spoken feedback is not implemented.

## Errors and local debug viewer

Errors use `{error:{code,message,retryable}}`; clients never display raw server bodies. Codes include invalid_request (400), unauthenticated (401), forbidden (403), not_found (404), revision_conflict/stale_revision/idempotency_conflict/assets_incomplete (409), payload_too_large (413), unsupported_media_type (415), invalid_project/invalid_asset (422), rate_limited (429), internal_error (500).

With `LOCAL_LOG_VIEWER=true`, `/debug/logs` is a loopback-only live SSE viewer. Categories distinguish persistence, asset transfers, manual AI help, and feedback/audio. Successful persistence links point to their exact durable revision. No AI inputs appear in the viewer or its console/file stream. Tokens, questions, project contents and bytes are never logged. Entries expire after 500 events or restart. Disable this unauthenticated developer inspector outside local development.

The old `/v1/tutor/projects/...` routes and automatic sharing session protocol have been retired. Existing full project revisions remain intact; no new tutor metadata is stored with them.

## Verification

Frontend: `npm run test:unit -- --runInBand --testTimeout=30000` (includes account, reducer, tutor/persistence and real-VM SB3 tests). Backend: `npm test`. Tests cover ownership, revision ordering, immutable retry, 20-second first-dirty timing, in-flight edits, layout preservation, manual Ask separation, projection bounds, fresh tokens, SB3 construction and hash-only AI retention. Browser verification uses a separate test project and records only request metadata.
# Student course endpoints

The authenticated catalog, starter/demo downloads and manual completion contract
is documented in [COURSES.md](COURSES.md). Completed demos are intentionally
delivered to the player; alternative reference solutions remain server-only.
