# Frontend UI audit

Date: 2026-10-05. Scope: frontend components, styling, presentation, and UI interaction only. No backend review or application-code changes were made for this audit.

## Outcome

The main problem is not CSS Modules or React class components. It is that the newer classroom UI bypasses the editor's existing styling system, while some inherited shared controls have accessibility shortcomings. Consolidating styles without first improving those controls would preserve the shortcomings.

Prioritize legibility, component boundaries, keyboard access, and consistent tokens before a visual redesign. Preserve the working block editor, stage, paint/audio integrations, block category colors, and high-contrast support.

## First implementation batch — 2026-10-05

The findings below remain an audit snapshot; this follow-up fixes the initial legibility and style-boundary issues:

- Ask AI and Save now share a CSS Module toolbar-button style with explicit theme foreground/background pairs, hover/active states, native disabled behavior, and visible keyboard focus. Their click/request/save behavior is unchanged.
- Courses uses explicit classes for its search, sort, and completion controls instead of styling every descendant input/select/button. Nested Account controls keep their own appearance.
- Course headers and filled actions use the existing darker accent shade (`motion-tertiary`) for readable white text. Scratch block colors are unchanged. A dedicated classroom action-token system is still a future improvement.
- Both transparent text-token aliases now match the property names emitted by the theme helper. Account's obsolete local-only-save note now directs students to the actual save status and local download option.

Verification: added compiled-CSS checks for light/dark control contrast, all four course accent colors, Account style isolation, keyboard focus declarations, and theme aliases; added toolbar behavior tests and course control-class assertions. The configured unit suite passes (157 tests, 24 suites), the webpack build passes, and lint passes for the changed application JSX. Browser checks confirm readable toolbar colors, Enter operation and focus styling for Ask AI, course colors, and Account's blue Save profile button. Space did not toggle the tutor trigger in the editor browser check; investigate editor-level keyboard handling in the next accessibility batch. No project saves, completion changes, paid tutor requests, or saved preference changes were made during browser checks. Dark-theme contrast is unit-tested, not a browser screenshot verification.

The keyboard-accessibility follow-up is recorded below. Broader Account/tutor dark-theme styling, responsive work, and component/token consolidation remain open.

### Header feedback follow-up — 2026-10-05

Courses now sits with Settings/File/Edit/Advanced. The existing buffered title field remains editable, defaults to the loaded course name, and persists the student's private name with their project revision. Old course saves fall back to the course name; shared course metadata is never renamed. New course starters retain their fetched title through the upstream default-project title reset.

Save displays its status inside the button. During saving it is natively disabled and shows a small spinner; reduced-motion preferences suppress rotation. Failure restores Retry Save. The duplicate toolbar download action is removed, while File's existing local export actions remain intact. Header title sizing allows longer course names and shrinks without pushing the save controls off the desktop header.

Verification: 165 configured frontend unit tests and 39 backend tests pass, including title-only autosave, default/starter title lifecycle, legacy loads, private-title isolation, durable SQLite title restoration, immutable retries, and native busy-button behavior. Webpack build and lint of changed application JSX/JS pass. In a separate browser tab, an existing course save displays the course-name fallback, left-side Courses link, and Saved inside the button; File's Save as action is still visible. No student project edits or saves were initiated by these browser checks. The local backend was restarted to serve the new optional title field; temporary debug-log history resets on restart, durable project data does not.

### Keyboard accessibility follow-up — 2026-10-06

Shared action, sound-action, close/back, delete, green-flag, stop, and sound-library preview controls now use native `button` elements with `type="button"`. Decorative icons have empty alternative text. Existing click callbacks, disabled states, delete tab-order overrides, green-flag modifiers/right-click behavior, and preview mouse/touch behavior are preserved. Pointer activation of Go/Stop releases input/button focus so game keys remain usable; keyboard activation keeps visible button focus.

The VM listener no longer cancels UI key-release defaults, which was preventing Space from activating Ask AI. It still releases game keys after focus changes, prevents body Space/arrow scrolling, and protects workspace blocks from game-used Delete/Backspace. Sound preview handles keyboard clicks separately from mouse-down/touch playback and stops Enter from selecting/importing the enclosing library card.

Explicit theme-aware focus rings cover these shared controls, selected editor tabs, Add Extension, sound playback/round controls, and recording-dialog buttons. Stop's inactive opacity no longer dims its keyboard focus ring. CSS resets retain inherited sizing and appearance; no block editing, tutor payload/highlighting, project-save, or audio-processing logic was changed.

Verification: 207 configured unit tests pass (42 additional regressions), plus four existing shared-control tests and two updated snapshots. Webpack build and lint of changed application files pass. Full-repository lint still fails on three untouched upstream files: unused `label` PropType in `components/monitor/monitor.jsx`, mount-time setState in `containers/sound-library.jsx`, and switch fallthrough in `lib/file-uploader.js`.

An isolated browser tab confirms Space opens Ask AI, Enter/Space close the tutor panel and operate the extension dialog's Back button, arrow navigation visibly focuses selected tabs, and Go/Stop support Space with their original 32px dimensions. No student saves, completion changes, paid tutor requests, or persisted preference changes were initiated. Sound-library browser verification is limited by the in-app browser's missing `AudioContext.createGain`; playback, parent-card isolation, and mouse/touch duplication are covered by unit tests, not a successful real-audio browser check. Screen-reader/cross-browser certification and the legacy Sauce/integration suites are not claimed.

Next priority: consolidate classroom action variants/dialog actions and semantic panel/status styles. Full keyboard navigation of inherited menus and the block/paint editors remains a separate scope.

### Unified tutor chat follow-up — 2026-10-06

Ask AI Tutor is now Ask Tutor. The old question panel and independent JSON reply box are merged into one corner chat panel. Ordered student questions and plain-text tutor replies are kept in memory for the current project/account session, with automatic conversation scrolling, close/reopen preservation, and explicit waiting/error/retry feedback. Enter sends; Shift+Enter and IME composition do not. Questions remain optional, and students can draft while waiting without sending duplicate requests. Opening focuses the composer; Escape/Close restore focus to the toolbar trigger.

The small JSON/Chat toggle retains the collapsible `{request, response}` viewer. A selector allows inspecting earlier exchanges without applying their old highlights. Cached retries retain already-received debug data in this session but update the same exchange. Project/account changes clear chat/debug data and stale in-flight replies are ignored. No chat/transcripts are persisted or added to API calls; backend code/contracts, tutor projections, highlighting timing, and voice support are unchanged. The requested explanatory privacy paragraph is removed from this panel.

The frontend-design skill guided a restrained, course-editor-specific layout: conversation space above a fixed composer, compact named messages, existing type/theme tokens, and no new library or decorative chrome. Shared action/close controls are reused. JSON intentionally retains its existing black-on-white debugging presentation.

Verification: all 221 configured frontend unit tests, the webpack build, and lint of the changed tutor component pass. Tests cover ordered history, close/reopen behavior, native Send submission, optional questions and private project IDs, text escaping, JSON expansion/selection, highlight dispatch, pending/draft behavior, idempotent retries, cached debug input, session reset/stale replies, focus/keyboard input, scrolling, and light/dark control contrast. Backend files were not changed for this follow-up. Browser verification confirms the renamed trigger, Chat/JSON switching, composer focus, Escape focus restoration, and Shift+Enter in a separate editor tab; no paid AI request or student save was initiated.

## Skills installed and used

Project-local installation under `.agents/skills`; existing skills were left intact:

| Skill | Purpose | Source and pinned revision |
| --- | --- | --- |
| `frontend-design` | Visual hierarchy, typography, product-specific design direction | [Anthropic](https://github.com/anthropics/skills/tree/683bc88e56f3e09ba94f7055977f3d3aa499f202/skills/frontend-design), `683bc88e56f3e09ba94f7055977f3d3aa499f202` |
| `web-design-guidelines` | Accessibility, focus, responsive layout, interaction states | [Vercel](https://github.com/vercel-labs/agent-skills/tree/063bee94c3f4df8453406c830b0a7df0f2860278/skills/web-design-guidelines), `063bee94c3f4df8453406c830b0a7df0f2860278` |
| `vercel-composition-patterns` (directory `composition-patterns`) | Component reuse and clear variants | [Vercel](https://github.com/vercel-labs/agent-skills/tree/063bee94c3f4df8453406c830b0a7df0f2860278/skills/composition-patterns), `063bee94c3f4df8453406c830b0a7df0f2860278` |

These are established vendor-maintained collections, checked against the [skills leaderboard](https://skills.sh/) and their GitHub repositories before installation. Installed with the skill-installer helper using explicit commit revisions. The web review used freshly fetched [Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines/blob/main/command.md).

Compatibility: this frontend uses React 16.14, webpack 4, CSS Modules, and PostCSS variables/imports. Apply composition principles, not the skill's React 19 syntax: examples using `use(Context)`, context-as-provider JSX, or ref-as-an-ordinary-prop are not drop-in code here. No React/Next.js, Tailwind, shadcn, or dependency upgrade was performed.

## Inspection coverage and limits

- Inventoried all 80 component directories; parsed all 218 JSX files and 95 CSS files under `src` for structural/style patterns. JSX and CSS parsers reported no syntax errors in that inventory. Parsing does not establish CSS property validity or UI correctness.
- Inspected shared controls/forms, menu/header, modal/prompt families, account/course/tutor UI, themes, editor layout, stage controls, sprite/asset/library UI, sound controls, loading/error states, playground entry points, and static-page/template conventions.
- Compared declaration sets across all source stylesheets to distinguish actual repetition from superficially similar controls.
- Visually inspected the running editor, course overview, course details/playable preview shell, and Account panel. Read computed styles to verify contrast, CSS overrides, and the missing theme-token alias.
- Did not submit forms, change completion/progress, run a paid tutor request, modify the student project, or change saved theme/account settings.
- Browser viewport override did not produce the requested narrow viewport in the observed course tab; responsive findings below are source-based, not verified mobile screenshots. Dark/RTL/forced-colors behavior is likewise source-based. No full screen-reader, cross-browser, or end-to-end certification is claimed.
- No build/unit suite was rerun because this task only added skills and this report. This audit is not a claim that existing application tests all pass.

Inventory signals: 71 native `<button>` JSX sites versus 9 `<Button>` sites; 2 `<Input>` sites; 11 `<Modal>` sites. These count source element names, not rendered instances or proof that every native control should use one primitive. Found 20 broad transition declarations (explicit `all` or duration-only shorthand), 39 font-family declarations, 74 `!important` declarations, and 19 `outline: none` declarations. Many of the latter have valid replacement focus styling; do not mechanically remove them. Only `blocks.css` contains a source-CSS reduced-motion rule; templates/dependency behavior are separate.

## High-priority findings

### Toolbar buttons have unreadable text — confirmed in browser

`src/components/tutor/tutor-menu.css:2` — button rule supplies border/spacing, but no foreground/background pair. It inherits the white menu-bar foreground while normalize/native button styling supplies a light background.

`src/components/menu-bar/tw-save-status.jsx:19` — Save uses an unstyled native button in the same white-text toolbar.

Computed foreground/background for both enabled Ask AI Tutor and Save: `#ffffff` on `#f0f0f0`, approximately **1.14:1**. These are central student actions, not intentionally inactive controls. Explicit theme-aware toolbar variants should own foreground, background, border, hover, focus, pressed, and disabled states.

### Courses CSS overrides child Account styles — confirmed in browser

`src/components/courses/courses.css:10` — `.page input, .page select, .page button` styles all descendants, including Account's own controls.

`src/components/courses/courses.css:11` — `.page button` is more specific than Account's `.primary` and `.trigger`. It overrides the blue primary button with a white background and grey text. The running Account panel's Save profile button loses its primary-action appearance; trigger styling differs from the editor too.

Use explicit course-control classes or shared primitives. CSS Modules scope class names, but do not stop a parent's descendant selector from styling another component's elements. Do not solve this with more `!important`.

### Default course action/header colors miss normal-text contrast

`src/components/courses/courses.css:4` and `:18` — white text on `$motion-primary`, currently `#ff4c4c`, is approximately **3.29:1**. Course links/buttons are 16px and do not qualify for the large-text exception. Use a darker text-bearing action token; do not change Scratch motion block colors to fix website buttons.

The normal-text target is at least 4.5:1; see [W3C contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). Ratios were calculated from observed/source solid colors, not screenshot antialiasing.

### Shared controls are not reliably keyboard-operable

`src/components/button/button.jsx:34` — span with `role="button"`, no default tab stop or Enter/Space handling; disabled only replaces onClick, without native disabled semantics. Icon lacks decorative alt text.

`src/components/icon-button/icon-button.jsx:14` — div with `role="button"`, no default tab stop/keyboard activation/native disabled semantics. This affects multiple sound-editor effects/tools.

`src/components/close-button/close-button.jsx:13` and `src/components/delete-button/delete-button.jsx:9` — focusable div buttons but no local keyboard activation handling. Tab focus alone is insufficient.

`src/components/menu/menu.jsx:68` and `src/components/menu-bar/tw-menu-label.jsx:55` — clickable list items/menu-label divs lack local keyboard interaction. Similar mouse-driven controls exist in theme/language menus.

`src/components/green-flag/green-flag.jsx:17` and `src/components/stop-all/stop-all.jsx:17` — clickable images. `controls.jsx` supplies click/title, not keyboard semantics. The preview's start/stop actions should have real labelled buttons.

Prefer native buttons/links while preserving sizing, event contracts, context-menu behavior, and drag interactions. Do not blindly substitute elements across the editor: nested controls and mouseDown-driven playback require focused regression tests.

### Missing focus indicators in specific controls

`src/components/gui/gui.css:168` — selected-tab focus explicitly removes outline, shadow, and the library's focus pseudo-element. Selection and keyboard focus become visually indistinguishable.

`src/components/gui/gui.css:263` — extension button removes outline without a replacement rule in that stylesheet.

`src/components/play-button/play-button.css:28`, `src/components/sound-editor/sound-editor.css:119`, and `src/components/record-modal/record-modal.css:74` — sound preview/round/recording controls suppress focus styling without a local replacement.

By contrast, `forms/input.css:39`, `filter/filter.css:37`, `toggle-buttons.css:41`, and `tw-fancy-checkbox/checkbox.css:18` do provide replacement focus states. Keep those strengths and standardize toward a visible theme-aware `:focus-visible` treatment. See [W3C focus guidance](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html).

### Theme token points at a nonexistent alias — confirmed in browser

`src/css/colors.css:21` and `src/css/default-colors.css:19` — reference `--ui-text-primary-transparent` and its default counterpart.

`src/lib/themes/gui/light.js:22` — defines `text-primary-transparent`; `guiHelpers.js` writes `--text-primary-transparent`, not `--ui-text-primary-transparent`. The observed alias was empty while the actual token was populated. Affected inactive tabs/prompt text can inherit color rather than use their intended token.

Align names or intentionally provide aliases, with a small token-contract test. Audit token consumers before deleting apparently redundant names.

## Component and styling consistency findings

### Similar components are not all using a shared implementation

| Family | Current evidence | Recommended shared boundary |
| --- | --- | --- |
| Dialog actions | Identical primary declarations in `prompt/prompt.css:68`, `slider-prompt/slider-prompt.css:45`, `custom-procedures/custom-procedures.css:95`, `record-modal/record-modal.css:95`; prompt/slider base button declarations also identical | Native action-button primitive with explicit primary/secondary variants, plus DialogActions layout; preserve each dialog's content/state |
| Additional modal actions/body | Identical button declarations in `tw-fonts-modal/fonts-modal.css:119`, `tw-invalid-project-modal/invalid-project-modal.css:32`, `tw-unknown-platform-modal/unknown-platform-modal.css:29`; several identical body layouts | Same action primitive and optionally ModalBody; existing Modal is already shared |
| Account/Tutor popovers | Parallel fixed panels, widths 350/370, offsets 52/12, radii 14/12, different shadows, independent close/focus behavior | Small non-modal anchored-panel shell with composed header/body/actions; account and tutor controllers remain separate |
| Courses overview/details | Continue/details/start/completion JSX repeated within `courses.jsx:108` and `:164` | CourseActions, CompletionControl/Badge, CourseCard and CourseDetails; pass explicit actions/URLs rather than many mode booleans |
| Form fields | Editor Input is 10px rounded-pill; Account uses 15px rectangular inputs; course controls and tutor textarea are separate | Share theme/focus/validation tokens; explicit compact-editor vs regular-form variants rather than forcing every form into sprite-input geometry |
| Header/navigation actions | Editor and course headers use different heights, typography, link treatments, and action-button styling | Shared classroom navigation/action styles; editor retains its specialized File/Edit/Settings menu |
| Loading UI | CSS spinner, TurboWarp spinner, project asset-progress loader, and template splash | Share spinner tokens/reduced-motion policy where useful; do not merge project-progress loader and generic spinner merely because both load |
| Asset cards vs course cards | Sprite selector, library tiles, featured projects, courses have different selection/drag/favorite/navigation contracts | Keep domain cards distinct; reuse surface/spacing/focus tokens, not one universal card with many booleans |

This is a real reuse gap, but not grounds for replacing all 71 native buttons or rewriting upstream components. Shared CSS Modules/composes can be an intermediate step where moving React behavior would increase risk.

### Panels escape the documented layering system

`src/components/account/account-menu.css:3`, `src/components/tutor/tutor-menu.css:3`, and `:10` — hardcoded 10000/9999/9998 outside `src/css/z-index.css`. Core modal is 510 and context menu 10000.

The editor menu bar also creates its own stacking context (`gui.css:303`); therefore these numbers do not prove a popover globally covers every modal. The actual problem is unmanaged local/global stacking contracts and a viewport-fixed tutor reply that visibly covers lower-right editor controls. Define semantic layer tokens and an explicit portal/anchoring policy; test overlays with real dialogs, menus, dragging, and fullscreen. Do not fix by escalating numbers further.

### Panel behavior is inconsistent

`src/components/account/account-menu.jsx:51` — outside-click and Escape close with trigger focus restoration on Escape, but opening does not deliberately move focus into the form.

`src/components/tutor/tutor-menu.jsx:67` — no equivalent Escape/outside-close/focus-restoration behavior; trigger lacks aria-controls linkage. Both use section panels, not modal dialogs. A shared non-modal shell should support predictable focus and dismissal; only use a focus trap/background inertness if the design intentionally becomes modal.

`src/components/tutor/tutor-menu.jsx:101` — reply JSON is currently intentional debugging UI requested by the owner. Keep that capability. Later expose readable guidance first and a collapsible developer-details section instead of making children navigate transport JSON. Do not silently remove it during a styling cleanup.

### Theme integration is incomplete

`src/components/account/account-menu.css:3` and `:12` — hardcoded white surfaces/text/status colors ignore dark-theme tokens.

`src/components/tutor/tutor-menu.css:3` and `:10` — also hardcoded light. A contrasting, readable light debug pane is currently intentional, but its color-scheme/native-control behavior still needs explicit treatment.

`src/components/courses/courses.css:10` — native input/select have no explicit background/foreground pairing, unlike themed course buttons. Header uses motion color rather than menu-bar background/foreground. Dark/high-contrast support should be tested as a matrix rather than inferred from the page background changing.

Use semantic surface/text/action/error/success/focus tokens over reusing programming-category tokens. Preserve category colors because they carry programming meaning.

### Readability and course-page hierarchy need improvement

`src/components/courses/courses.css:3` — separate partial font stack; the reply uses system-ui and much of the editor repeats Helvetica/Arial. No consistent regular-content type scale/line-height.

`src/components/courses/courses.css:7` and `:13` — auto-fit stretches the one existing course to the full 1100px content width. Fixed 170px image then becomes a panoramic placeholder. Description is full-length imported teacher/course copy; observed paragraphs use normal line-height and very long lines.

`src/components/courses/courses.jsx:109` and `:113` — Continue and Start again are equally prominent filled actions. Make Continue primary, Course details/Start again secondary, completion a quieter status/action. Distinguish manual completion from automatic lesson completion.

The playable preview is below description, concepts, and actions; in the observed details viewport only its top was initially visible. Make the actual game the memorable visual, with concise description/concepts beside it on desktop and a stacked layout on small screens. Keep the primary learning action visible without making students scroll through administrative copy.

### Small screens, long content, and localization need a defined policy

`src/components/courses/courses.css:4` — non-wrapping header with fixed gaps/padding and account control can exceed narrow widths.

`src/components/courses/courses.css:13` — 280px minimum grid track plus 56px page padding already exceeds a 320px viewport, before card borders/content. Use a track minimum bounded by available width and responsive padding.

`src/components/courses/courses.css:19` — fixed 420px iframe height needs actual stage-fit testing; prefer intentional aspect/layout sizing, not blind iframe auto-height.

`src/components/menu-bar/menu-bar.css:5` and `gui/gui.css:39` — inherited nowrap toolbar/desktop minimum layout. New right-hand actions increase pressure. Keep full editing desktop-first; prioritize responsive Courses/demo and a deliberate reduced toolbar/tablet layout. A phone editor rewrite is not required by this audit.

`src/components/courses/courses.jsx:160` and `:163` — no explicit long-word protection on course titles/descriptions; unbroken content can force grid overflow. Add min-width:0 and wrapping where appropriate.

`src/components/account/account-menu.jsx:8`, `courses/courses.jsx:95`, and `tutor/tutor-menu.jsx:71` — new UI text bypasses existing react-intl localization. Its fixed physical offsets also bypass the editor's RTL conventions. Prefer existing message infrastructure and logical spacing for new UI.

`src/playground/index.ejs:2` and `simple.ejs:2` — root html lacks lang; observed editor/Courses lang was empty. Courses has no skip-to-main link. Set language with the actual locale and provide a keyboard route to main content.

### Feedback, loading, and navigation state

`src/components/courses/courses.jsx:98` — loading message lacks status/live semantics; completion success is not deliberately announced. Existing error role=alert is a good starting point. Use one restrained StatusMessage component with consistent appearance/semantics.

`src/components/courses/courses.jsx:20` and `:21` — search/sort only live in component state; course-detail navigation unmounts their controls, and leaving/reloading loses the filter state. Preserve search/sort in query parameters if students need reliable back/return behavior. No new search API is needed.

`src/components/account/account-menu.jsx:262` — copy still says signing in does not save online, despite the current project-saving UI. This is obsolete UI guidance; replace it with wording that accurately distinguishes account sign-in from Save/autosave behavior.

`src/components/courses/courses.css:18` — course actions have no authored hover/active/focus-visible variants. Native focus may still work; this is inconsistent feedback, not proof that every course control lacks a focus ring.

### Motion and legacy CSS hygiene

`src/components/backpack/backpack.css:61`, `blocks/blocks.css:50`, `close-button/close-button.css:15`, `custom-procedures/custom-procedures.css:51`, and `stage-selector/stage-selector.css:23` — transition:all can accidentally animate layout/style changes. Enumerate only intended properties.

`src/components/loader/loader.css:42`, `spinner/spinner.css:30`, `tw-loading-spinner/spinner.css:16`, and `src/playground/index.ejs:46` — repeating animations have no local reduced-motion alternative. Tutor highlight CSS already has one; keep the requested eight-second pedagogical delay and reduce only reveal motion when appropriate.

`src/playground/interface.css:23` and `:26` — font-weight values in rem units are invalid; likely intended font-size. `src/components/alerts/alert.css:34` — self-align is not a CSS property. These are clear stale/incorrect declarations, not stylistic taste.

`src/components/modal/modal.css:40` — quoted 'touch' value for -webkit-overflow-scrolling is invalid. Older -ms/vendor compatibility declarations elsewhere are candidates for a supported-browser review, not automatic deletions.

`src/lib/themes/global-styles.css:14` — global !important overrides exist for external popovers; `tw-studioview/studioview.css:15` protects imported box-sizing. Many important/global rules are compatibility seams, not intrinsically bad CSS. Document and isolate them instead of removing them wholesale.

Account/Tutor/Courses CSS is compressed to one rule per line; inherited CSS is expanded. Adopt one formatter and a staged CSS lint baseline (invalid properties, duplicate declarations, transition:all, theme literals in new classroom UI). ESLint alone does not validate these styles. Avoid demanding zero warnings across the inherited editor before improving new UI.

## Suggested visual direction — proposal, not an approved redesign

**A game-making workshop:** the student's game and blocks supply personality; surrounding classroom chrome stays calm, readable, and action-oriented. Spend the visual emphasis on the playable preview/course artwork, not gradients or decorative dashboard statistics. Do not decorate every editor pane or recolor block categories.

Initial light-theme token proposal, separate from programming colors:

| Token | Draft value | Role |
| --- | --- | --- |
| Canvas | #f7f9fc | Quiet application background |
| Surface | #ffffff | Forms/cards/panels |
| Text | #17212e | Reading and labels |
| Muted text | #536175 | Secondary explanations |
| Brand action | #c63232 | Text-bearing classroom actions; white text about 5.38:1 |
| Success text | #155331 | Completed/saved status with a separately checked tinted surface |

Use existing system font families initially to avoid a new font dependency; centralize a complete stack and set intentional roles: regular form/content text around 16px with 1.5 line-height, compact editor chrome separately, headings with a restrained scale, monospace only for debug/program data. Limit readable prose to roughly 60–75 characters per line. Font size alone does not require changing block-renderer metrics.

Use a small spacing scale (4/8/12/16/24/32px), regular/compact control densities, and a few semantic radii (control/surface/dialog). Existing 4px editor controls need not become identical to 12px course panels; the difference should be intentional. One shadow for floating panels; borders for ordinary surfaces.

Course overview: bounded-width cards with consistent game artwork aspect ratio, concise student-facing summary, difficulty/status, and one primary Start/Continue action. Maintain the placeholder fallback, but make it communicate a game/course rather than an oversized play glyph. The imported title/description still drive content; no hardcoded course-specific frontend.

Course details: desktop preview + course information side by side; mobile stacked. Concepts become a short readable list; Continue/Start is primary, Start again is secondary, manual completion remains explicit. Completion should be represented with text/icon as well as color.

Tutor: preserve the current collapsible debug reply during development. For eventual student presentation, reserve a compact guidance area or a panel that does not cover the sprite chooser; show one readable next step and keep transport JSON under developer details. Add/remove/inspect highlights retain the current meaning/timing, with an explanatory legend rather than color alone.

These recommendations deliberately stop short of Tailwind/shadcn migration. New shared primitives can later be backed by compatible shadcn components without changing every consumer; an upgrade of the React/webpack/testing stack is a separate scoped decision.

## Incremental implementation order

1. Fix explicit foreground/background pairs, course-to-account selector leakage, and theme alias mismatch. Update obsolete account copy. Add regression tests for style boundaries and token contracts.
2. Improve native semantics/focus of shared action controls, preserving mouse/touch contracts; verify tab order, Enter/Space, disabled controls, green flag/stop, dialogs, and sound preview.
3. Extract shared action styles/variants and dialog actions, then panel shell/status presentation. Move Account/Tutor/new course controls onto semantic theme and layer tokens.
4. Refine course card width, prose hierarchy, preview placement, and action prominence. Add long-content/empty/loading/error scenarios and narrow viewport coverage.
5. Apply consistent typography/spacing, localization/RTL, reduced motion, and focused CSS linting. Consider framework/component-library migration only after these seams are stable.

For verification, use visual snapshots of light/dark/high-contrast and editor/course/detail/account/tutor states, keyboard-focused snapshots, and actual narrow-viewport tests with long names/descriptions. Add automated accessibility checks plus manual keyboard/screen-reader checks; automated tools alone cannot validate block-editor interaction. Preserve existing student saves and mock paid AI/network operations in UI tests.

No deletion or UI redesign is authorized by this report alone. Findings are frontend work candidates, not recorded owner decisions.
