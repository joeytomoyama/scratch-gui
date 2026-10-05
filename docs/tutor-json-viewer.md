# Tutor debug JSON viewer

The corner reply uses `react-json-view-lite` 1.5.0 (MIT license), compatible with this editor's React 16.14.0. Its license is retained in the installed package. Upstream: https://github.com/AnyRoad/react-json-view-lite.

The root object contains `request` (the backend's local-debug DeepSeek user-message data) and `response` (validated tutor feedback). The root starts expanded; nested objects start collapsed. Click the triangles to expand/collapse individual objects, or use the existing button to hide/show the entire reply. No data can be edited through the viewer.

Request data remains local-debug-only and transient. On cached retries or with debug mode disabled, `request` is `null`. Keys, authorization headers and server-only system prompts are never displayed.

Dependency CSS is mapped through the editor's existing CSS-module loader. The unit tests exercise the actual viewer's expand/collapse controls and escaped text rendering. `jest-environment-jsdom` and `@babel/eslint-parser` are explicitly declared development dependencies; Enzyme's Cheerio dependency is pinned to its compatible 1.0.0-rc.12 release. The SVG renderer's required TurboWarp font peer is also explicitly declared and resolved in the lockfile.
