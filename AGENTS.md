# AGENTS.md — TurboWarp-Based Classroom Game-Creation Platform

> Instructions for coding agents working on this repository. Read this file before making architectural changes. When uncertain, inspect the actual checked-out code and documentation rather than assuming repository details or inventing APIs.

## 1. Product vision

Build a **commercial, Scratch-like visual game-creation and teaching platform** by extending TurboWarp, rather than recreating Scratch from scratch. The editor should retain TurboWarp's mature core programming experience while adding a differentiated education layer.

The initial audience is students completing **structured, tutor-led game-development courses** (e.g. an endless runner/Dino game, Flappy Bird, Jetpack Joyride-style game and eventually physics-based games). Each course has a defined final product, ordered lessons, objectives and milestones. Tutors teach in live group sessions. This is **not** a free-form playground where students or the AI arbitrarily choose what to build.

**Primary differentiation:** guided courses with tangible finished games, live classrooms, tutor visibility into each student's work, projects and assignments, progress tracking, and a context-aware **voice AI teaching assistant** that understands students' actual block programs. Do not spend early development effort rewriting working block execution, rendering, painting or audio systems.

## 2. Starting point and repository policy

- Main upstream: <https://github.com/TurboWarp/scratch-gui>.
- Treat `scratch-gui` as the primary application/integration repository. The VM, block editor, renderer, costume editor, audio and storage are separate dependencies; normal dependency installation supplies them. **Do not clone/fork them individually merely to get a working editor.**
- Fork a lower-level dependency (e.g. `scratch-vm`, `scratch-blocks`, `scratch-render`, `scratch-paint`) only when a concrete feature requires modifying its internals; document the reason, exact revision and integration procedure.
- Preserve existing TurboWarp behavior and Scratch compatibility wherever possible. Add features around the editor, not through gratuitous modifications to its internals.
- Verify the upstream repository's actual branches, tags, build scripts and dependency manager before issuing commands. Prefer a verified stable release/tag or tested commit as the project's baseline; don't assume the newest `develop` commit is production-ready.
- Pin a baseline commit and preserve the lockfile. Prefer reproducible installs (`npm ci` if supported by this checkout). Avoid unrelated dependency upgrades.
- Configure `upstream` as the original TurboWarp remote and `origin` as our fork. Bring in upstream changes deliberately, test them on a separate integration branch, and resolve merge conflicts rather than overwriting our changes.
- Keep our production/default branch stable. Implement changes in small feature branches and merge via reviewed PRs.

## 3. Business model and licensing boundary — important

The product is intended to **make money**. Commercial use and open-source licensing are not opposites. Our current preferred approach is an **open-source TurboWarp-derived frontend/editor plus a separately developed proprietary SaaS backend**, subject to a real license review.

- TurboWarp GUI has GPL-3.0 obligations. Preserve required copyright/license notices, attribution and applicable source-code availability for the GPL-covered application and derivative frontend changes. Do not remove licenses or assume a renamed repo removes obligations.
- Do **not** import tightly integrated proprietary source packages into the GPL editor and assume a different directory/repository makes them legally separate.
- Keep backend services genuinely separate, interacting with the editor through clearly documented HTTPS/WebSocket APIs. A frontend/backend split helps architecture but **is not an automatic legal determination**; obtain qualified open-source counsel's review before commercial launch, including the complete dependency graph, distribution/hosting model, branding and assets.
- The proprietary backend may hold business logic for accounts, classrooms, authorization, billing, AI orchestration, storage, usage controls and analytics, to the extent supported by the final legal review.
- Avoid Scratch/TurboWarp trademarks, logos, mascots or other branded assets in our product unless appropriate rights have been verified. Adopt distinct product branding.
- Do not pull code from newer Scratch repositories or other projects without checking the specific version's license and compatibility with this product's licensing plan.
- Maintain a third-party license and dependency inventory and retain source/notice obligations for all included components.

**Do not treat this document as legal advice; escalate uncertain licensing decisions instead of guessing.**

## 4. Architecture

The core block-programming loop should remain **client-side**:

```text
TurboWarp-based browser frontend (open-source)
  visual blocks / GUI
       ↓
  scratch-vm (executes projects)
       ↓
  sprite/runtime state
       ↓
  scratch-render (stage/canvas)
```

The editor should be able to create and play projects without a server-side game execution/rendering loop. Some optional network features, remote assets or extensions may still use the internet. Do not move core execution or rendering to the backend merely to support accounts or classrooms.

```text
Open-source editor (desktop web first, tablets next)
    ↕ authenticated HTTPS / WebSocket interfaces
Separate proprietary application services
    ├─ authentication / user and tutor roles
    ├─ classrooms and invitations
    ├─ structured courses, lessons, assignments and progress
    ├─ real-time classroom coordination
    ├─ voice AI sessions / block analysis orchestration
    ├─ billing / administration
    └─ persistence / asset storage
```

Prefer new feature modules, adapters and documented integration points over invasive edits to upstream files. Avoid direct dependencies on deep VM internals unless unavoidable; isolate such integrations so upstream upgrades remain feasible.

## 5. Scope and implementation priorities

**First objective: prove one complete vertical slice**, not a sweeping rewrite:

1. Build/run the existing TurboWarp editor locally unchanged; verify creating, executing, saving and reloading a basic project.
2. Rebrand the interface responsibly, add the minimal account flow and persist a student's own projects.
3. Tutor creates a room; students join it and independently edit/run their own projects.
4. Tutor sees which students are active, receives requests for help and can inspect a selected student's current project/workspace or stage preview.
5. Implement a basic **course → lesson → objective → starter project → final playable game** flow, with assignment distribution and verifiable completion/progress indicators.
6. Add an opt-in **voice AI tutor** that can inspect relevant project/block state and the student's current lesson, speak and listen naturally, answer questions, explain errors and highlight referenced blocks. Start read-only: no automatic project edits.
7. Polish UX, reliability, permissions, mobile/tablet behavior, billing and operations once the core guided-course/classroom workflow works.

**Not in the initial scope:** rebuilding the Scratch VM, renderer, physics engine, block editor or costume editor; exact Scratch cloud/community parity; collaborative simultaneous editing of the *same* workspace; a full native iOS/Android rewrite; advanced game physics unless required by a prioritized feature.

For real-time teaching, begin with **independent student projects + read-only tutor observation + feedback**. Shared multi-writer editing is a separate, harder milestone. Do not introduce CRDT complexity into the MVP just because live monitoring is required.

## 6. Classroom, privacy and safety requirements

- Distinguish student, tutor and administrator privileges. Enforce authorization **server-side** on every project/classroom operation; never trust client-supplied user/room IDs as authorization.
- Students can edit their own projects. Tutors may view student state only for classes they are authorized to oversee. Any tutor editing/control of a student's project must be explicit, permissioned and auditable.
- Use authenticated, room-scoped realtime subscriptions. Do not broadcast all project data to all users.
- For live monitoring, consider sending efficient structured snapshots/deltas and modest-rate previews rather than streaming full projects or screenshots continuously.
- Provide clear consent/notice about live tutor visibility and AI analysis. Design for student/minor privacy, data minimization, retention limits and applicable education/privacy law; arrange a dedicated legal/privacy review before launch.
- Treat project data, sprite names, comments and user prompts as untrusted input; validate sizes/types and sanitize rendering paths.
- Keep custom/unsandboxed extension capabilities and imported projects behind an explicit security review. Do not silently enable potentially unsafe capabilities for students.

## 7. Course-aware voice AI tutor (core product requirement)

**This is a structured learning product, not a freestyle game-generation chatbot.** Courses culminate in **specific finished games/products**. Each course defines prerequisites, lessons, learning objectives, milestones, starter assets/projects, completion criteria and the target final game. For example, an endless-runner course can sequence player movement → jump/gravity → obstacle spawning → collisions/game-over → score → polish. The AI must guide the student toward the *current lesson's* objective and adapt explanations to their actual project state; it should not arbitrarily replace the curriculum or build the whole game for them.

The AI tutor must support **natural two-way voice conversation** (with an accessible text fallback) and be able to:

- Inspect relevant structured TurboWarp state (active sprite, blocks/scripts, variables, project metadata, selected workspace, and, if needed, stage/runtime state), rather than relying only on screenshots. Scope data to what is needed for the current question.
- Receive course/lesson context and allowed concepts alongside the student's question and project state. Distinguish verified program observations from hypotheses; do not claim to have run or seen something it hasn't.
- Provide age-appropriate, incremental guidance, Socratic questions, debugging hints and actionable *next steps* linked to lesson milestones. Prefer teaching over handing over a complete solution.
- Refer to specific blocks/sprites and, where feasible, **highlight or focus the relevant UI element**. Do not assume arbitrary text from the model is a safe executable editor command.
- Record progress through explicit, preferably verifiable milestone checks; do not use an LLM's impression as the sole authority for marking work complete. Tutors must be able to review progress and retain control of lessons.
- Support a read-only guidance mode first. Any future AI-proposed change to a student's project must be previewed, explicitly authorized by the student/tutor as appropriate, validated and undoable. Never silently edit their code.
- Allow the tutor/course to configure how much help is appropriate (hints first, explanation after attempts, etc.). Provide clear controls to pause/mute/disable the agent.

**AI networking and secrets:**

```text
Student microphone + relevant block/project state + current lesson
    ↓
Open-source editor → authenticated proprietary backend
    ↓
Authorization, consent, privacy filtering, lesson context, quota/rate limits
    ↓
AI voice / language-model provider API
    ↓
Backend → spoken/text guidance + validated block references → editor
```

Do not ship permanent AI-provider keys, privileged tokens or proprietary system prompts in the browser. Keep AI orchestration, provider choice, course-aware prompt construction, quotas and usage/cost controls server-side. Support streaming/low-latency audio where appropriate, without bypassing backend-issued short-lived credentials and authorization. Treat student speech, block text and model outputs as untrusted. Avoid sending entire projects or unrelated student data by default.

**Children's privacy and safety:** voice capture must be obvious and controllable, with required parent/school permissions and clear notices. Minimize storage of audio/transcripts, enforce retention and deletion policies, and assess applicable child-safety/education/privacy rules before launch. AI is an assistant to the learner and human tutor, not an autonomous grader or replacement for tutor oversight.

**Initial AI acceptance test:** In a defined Dino/endless-runner lesson, a student asks aloud why jumping doesn't work. The agent can inspect the *actual* relevant blocks, explain the likely issue without fabricating observations, point/highlight the pertinent block, offer a lesson-appropriate hint, and let the student make the correction. Verify this end-to-end with a real project and voice input, not only mocks.

## 8. Data/auth and ability to migrate

Supabase is a reasonable **initial** managed platform for auth, database and project storage (including course enrollment and progress records); free-tier capacity and limits must be checked against current official terms before designing around numbers. Do not treat it as a permanent requirement.

- Put Supabase-specific behavior behind small application service interfaces rather than scattering SDK calls throughout the editor.
- Use stable internal user/project IDs and explicit ownership/permission models.
- Keep schema migrations, backups/restore tests and an export path. Future options may include paid Supabase, self-hosted Supabase or another auth/storage service; migration will still require deliberate work.
- Keep private secrets, service-role keys, payment credentials and privileged database access **server-side**.

## 9. Mobile strategy

Desktop web first; tablet-friendly editing next. Keep the current browser-based runtime and renderer. A mobile-responsive website/PWA or later WebView/native shell is preferable to porting the entire editor/runtime to React Native or rewriting it as a native application. On small phones, prioritize playing/viewing projects, assignment status and feedback; full drag-and-drop editing may need a redesigned UI.

## 10. Agent workflow and quality bar

- Inspect the actual code, package manifests and TurboWarp development docs before proposing changes. Verify rather than hallucinate file paths, APIs, commands, licensing or current upstream state.
- Before substantial implementation, explain the minimal intended design and which existing components will change.
- Make small, reversible changes. Prefer adding isolated features with documented interfaces over reorganizing the upstream app.
- Preserve existing editing and playback functionality. Tests should cover at least project creation, block execution, stage rendering, save/load, account/project ownership, classroom access controls, course/milestone persistence, and AI block-reference validation as they are introduced.
- Provide reproducible run/test instructions and a concise list of changed files, test results, known issues and any upstream merge implications at each milestone.
- Do not claim a feature is tested unless it was actually run. Where browser end-to-end verification is possible, test student and tutor flows with distinct accounts.
- Flag anything that would affect GPL compliance, student privacy, custom-extension security or payment/auth security before proceeding.
- Do not silently expand scope into a full Scratch rewrite. Ask when a requested feature conflicts with the MVP or with preserving TurboWarp's compatibility.

## 11. Guiding decision

**We are building a classroom/business product on top of a proven block-based game editor, not building a new block-based game editor for its own sake.** Optimize for structured courses ending in playable student-built games, reliable human/AI teaching workflows, a replaceable/separate services layer, GPL compliance, a low-maintenance upstream fork and speed to a working commercial MVP.

## 12. Current implementation guardrails and fresh-chat entry point

Read `DECISIONS.md` before continuing prior work. It is the single shared decision
log for this frontend and sibling `../scratch-backend`; later decisions supersede
historical ones. The roadmap above is not a claim that classrooms, billing or
automatic milestone verification already exist. Inspect code for current status.

- Saving and tutoring are independent: full lossless VM JSON/assets for restoration;
  bounded `tutorProjection` only on intentional Ask, never automatic model calls
  after edits. Preserve real workspace IDs in Ask snapshots.
- Courses come from backend reads, not hardcoded cards. Keep starter loading,
  Continue from an account-owned save, manual completion, course identity and
  student-instance titles separate from shared course metadata. The primary demo
  may reach the browser for playback; this is not a secrecy guarantee. Alternatives
  stay private. No course admin UI or automatic project edits/grading.
- Keep the unified Ask Tutor chat, optional questions, auto-scroll and collapsible
  `{request, response}` JSON inspector. Debug provider input is local/transient,
  not permission to persist or expose student context in production.
- Highlight `add` categories immediately; exact blocks after eight seconds with
  a one-second fade. `remove` is red and `inspect` orange; neither highlights a
  palette category. Validate catalog/availability and exact student sprite/ID/opcode;
  invalidate hints on relevant edits/deletion. Never guess IDs or edit the project.
- Settings language is authoritative: en/de/es/ja/fr/it/nl, not Chinese for now.
  DeepSeek provides guidance; backend Deepgram handles hold-to-talk STT and TTS
  for both spoken and typed questions. Audio failures must not lose text or cause
  another model call. Quiet mode is deferred. Keep credentials server-side.
- Keep bounded session history (40 meaningful changes, four completed exchanges)
  in memory, capture it only with Ask and reset on project/account changes/reload.
  Preserve captured input and language on retries; do not add durable chat memory.
- Static opcode SVG previews and their generator were explicitly undone. Markdown
  block-image replies are a proposal, not the current contract. Do not recreate
  these assets or relax plain-text validation without a new implementation request.
- Reuse existing components and scoped/theme-aware CSS. shadcn is an option, not
  an approved wholesale migration. Remove only confirmed-unused code; ask about
  uncertain removals. Preserve unrelated dirty-worktree changes and assets.

Useful entry points: `src/components/tutor/`, `src/lib/tutor/`,
`src/components/courses/`, `src/lib/project-persistence.js`, and
`docs/BACKEND_API.md`. Local development typically uses frontend port 8601 and
backend port 3001; verify running processes/configuration before starting servers.
Run targeted tests and `npm run test:unit -- --runInBand`, with lint/build as
appropriate. `test:unit:legacy` is distinct from the configured current suite.
Do not describe a green subset as all tests passing or production readiness.

## 13. Deferred TODO — mobile game input blocks

Recorded from the mobile-controls discussion. Planning only: do not install
dependencies or implement this without a new request.

- [ ] Prototype four-direction swipe event hats through an approved, bundled
  Mobile Controls extension, e.g. `when swiped [left/right/up/down]`. Detect a
  gesture on the game canvas and trigger matching scripts through the VM's
  existing event/hat machinery. Do not simulate key presses or rewrite movement
  blocks; these are extension hats, not ordinary My Blocks procedures.
- [ ] Evaluate/prototype **@use-gesture/vanilla** first: its direct DOM/canvas
  integration suits the current class-based Stage. **react-swipeable** is a
  simpler alternative compatible with the inspected React 16.14. Library choice
  is provisional, not installed or device-validated. Recheck versions/maintenance
  before adoption. Tune distance, velocity, duration and directional thresholds;
  guarantee at most one game event per recognized swipe and ignore cancellations.
- [ ] Resolve interaction with existing Stage touch-to-mouse and sprite-drag
  handlers. Avoid accidental clicks/drags, duplicate events and stale listeners;
  prevent page scrolling only on the active game surface. Preserve normal editor
  interactions and clean up input on unmount, project changes and lost focus.
- [ ] Follow with a numeric `phone tilt left/right` reporter using browser
  device-orientation input, not a binary event or raw sensor stream sent to the
  backend. Handle HTTPS/permission requirements, neutral-position calibration,
  screen rotation, smoothing and a dead zone. A normalized -100..100 range was
  suggested, not finalized. Provide desktop testing and touch/keyboard fallback.
- [ ] Register approved blocks with extension policy, project load/save and the
  frontend/backend tutor catalog, projection and highlight validation. Do not
  reopen arbitrary external/unsandboxed extension loading for this feature.
- [ ] Test rapid repeated swipes, diagonals, taps, multiple fingers, cancellation,
  scrolling conflicts and project/fullscreen lifecycle. Test tilt denial/missing
  sensors/calibration. Require hands-on iPhone Safari and Android Chrome checks;
  simulated input tests cannot establish real-device polish.

Context: courses may use 480x360 landscape or 360x640 (9:16) portrait stages,
with course-specific dimensions and removal of arbitrary Advanced size controls
discussed separately. Mobile game playback/input does not imply the full block
editor is usable on phones. Neither the two-format course policy nor these input
blocks should be described as implemented solely because they are listed here.
