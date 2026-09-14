# Amber Telemetry Grid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign every JupeTrack frontend route into the approved Amber Telemetry Grid interface without changing auth, RBAC, API, WebSocket, refresh, chart, or data behavior.

**Architecture:** Apply the redesign from the bottom up: semantic CSS tokens and existing UI primitives, then shell and public entry, then monitoring, tool, and administration routes. Keep route logic in place, avoid new dependencies and speculative abstractions, and validate each independently committable batch. Files already modified by the user require patch-level staging so existing work remains intact.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict mode, Tailwind CSS v4, Base UI, Recharts, Lucide React.

**Design spec:** `docs/superpowers/specs/2026-09-14-amber-telemetry-grid-design.md`

---

## Working-tree safety rules

The repository is intentionally dirty. Before every task:

```bash
git status --short
git diff --stat
git diff -- frontend/src/app/api/proxy/'[...path]'/route.ts \
  frontend/src/app/bgp/page.tsx \
  frontend/src/app/interfaces/page.tsx \
  frontend/src/app/settings/page.tsx \
  frontend/src/components/AuthProvider.tsx \
  frontend/src/components/ui/chart-dialog.tsx \
  frontend/src/lib/types.ts
```

Expected: existing edits remain visible. Never run `git reset`, `git stash`, `git checkout`, or `git restore`. Preserve deletion of `frontend/src/components/charts/BGPPrefixChart.tsx`. Never add or modify `grafana/`. For a pre-modified file, stage only redesign hunks with `git add -p` and verify them using `git diff --cached`.

## File ownership map

- Theme foundation: `frontend/src/app/globals.css`, `frontend/src/app/layout.tsx`, `frontend/src/components/ThemeProvider.tsx`, `frontend/src/components/ThemeToggle.tsx`
- Primitives: `frontend/src/components/ui/{button,badge,card,input,table,tabs,dialog,scroll-area}.tsx`
- Shell: `frontend/src/components/ui/LayoutShell.tsx`, `frontend/src/components/ui/Sidebar.tsx`, `frontend/src/components/ui/HeaderRefreshButton.tsx`, `frontend/src/components/ui/AdminGuard.tsx`
- Monitoring: `frontend/src/app/page.tsx`, `frontend/src/app/bgp/page.tsx`, `frontend/src/app/interfaces/page.tsx`
- Diagnostics: `frontend/src/app/policy/page.tsx`, `frontend/src/app/lg/page.tsx`, `frontend/src/app/route-lookup/page.tsx`, `frontend/src/app/lookup/page.tsx`
- Visualizations/results: `frontend/src/components/charts/InterfaceTrafficChart.tsx`, `frontend/src/components/dashboard/PolicyNode.tsx`, `frontend/src/components/ui/{ASPathGraph,AggregateASGraph,LookupModal,LookupResultViewer,RouteResultViewer,chart-dialog,GlowingCard}.tsx`, `frontend/src/lib/chart-colors.ts`
- Administration: `frontend/src/app/settings/page.tsx`, `frontend/src/app/settings/users/page.tsx`, `frontend/src/app/settings/retention/page.tsx`, `frontend/src/app/settings/as-mapping/page.tsx`
- Public entry: `frontend/src/app/login/page.tsx`

### Task 1: Lock the baseline and add static design checks

**Files:**
- Create: `frontend/scripts/check-design-tokens.mjs`
- Modify: `frontend/package.json`

- [ ] **Step 1: Save the pre-redesign baseline outside the repository**

```bash
mkdir -p "$JCODE_SCRATCH_DIR/jupe-track-ui-baseline"
git status --porcelain=v1 > "$JCODE_SCRATCH_DIR/jupe-track-ui-baseline/status.txt"
git rev-parse HEAD > "$JCODE_SCRATCH_DIR/jupe-track-ui-baseline/head.txt"
git diff --binary > "$JCODE_SCRATCH_DIR/jupe-track-ui-baseline/working-tree.patch"
(
  cd frontend
  set +e
  npm run lint > "$JCODE_SCRATCH_DIR/jupe-track-ui-baseline/lint.txt" 2>&1
  echo $? > "$JCODE_SCRATCH_DIR/jupe-track-ui-baseline/lint-exit.txt"
)
find grafana -type f -print0 2>/dev/null | sort -z | xargs -0 sha256sum \
  > "$JCODE_SCRATCH_DIR/jupe-track-ui-baseline/grafana.sha256"
```

Expected: three baseline files exist. No repository file changes.

- [ ] **Step 2: Add a dependency-free static guard**

Create `frontend/scripts/check-design-tokens.mjs`:

```js
import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../src/", import.meta.url));
const forbidden = [
  [/#2A2E35/gi, "raw legacy border"],
  [/#(?:0ea5e9|38bdf8|06b6d4|3b82f6|6366f1)/gi, "cool accent"],
  [/\brounded-(?:md|lg|xl|2xl|3xl|4xl)\b/g, "radius above 4px"],
  [/\bshadow-(?:sm|md|lg|xl|2xl)\b/g, "decorative shadow"],
];
const extensions = new Set([".css", ".ts", ".tsx"]);
const failures = [];

function visit(path) {
  for (const name of readdirSync(path)) {
    const file = join(path, name);
    if (statSync(file).isDirectory()) visit(file);
    else if (extensions.has(extname(file))) {
      const source = readFileSync(file, "utf8");
      for (const [pattern, label] of forbidden) {
        pattern.lastIndex = 0;
        if (pattern.test(source)) failures.push(`${relative(root, file)}: ${label}`);
      }
    }
  }
}

visit(root.pathname);
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Amber Telemetry Grid static checks passed");
```

Add this script to `frontend/package.json`:

```json
"check:design": "node scripts/check-design-tokens.mjs"
```

- [ ] **Step 3: Run the guard and confirm the current UI fails**

Run:

```bash
cd frontend
npm run check:design
```

Expected: non-zero exit with current legacy borders, cool accents, large radii, or decorative shadows listed.

- [ ] **Step 4: Commit the guard**

```bash
git add frontend/scripts/check-design-tokens.mjs frontend/package.json
git diff --cached --check
git commit -m "test(ui): guard amber telemetry design tokens"
```

### Task 2: Establish fonts, semantic tokens, focus, and motion

**Files:**
- Modify: `frontend/src/app/globals.css`
- Modify: `frontend/src/app/layout.tsx`
- Modify: `frontend/src/components/ThemeProvider.tsx`
- Modify: `frontend/src/components/ThemeToggle.tsx`

- [ ] **Step 1: Replace global color variables with the approved warm light palette and dark `DESIGN.md` palette**

Use semantic variables for background, surface layers, foreground, outline, primary, primary hover, and error. Include mappings needed by existing primitives:

```css
:root {
  color-scheme: light;
  --color-background: #f7f3ef;
  --color-on-background: #241a17;
  --color-surface: #fffaf7;
  --color-surface-dim: #f3ede8;
  --color-surface-bright: #fffdfb;
  --color-surface-container-lowest: #fffdfb;
  --color-surface-container-low: #f3ede8;
  --color-surface-container: #fffaf7;
  --color-surface-container-high: #ebe3de;
  --color-surface-container-highest: #ddd2cc;
  --color-on-surface: #241a17;
  --color-on-surface-variant: #66534c;
  --color-outline: #806b63;
  --color-outline-variant: #cdbdb5;
  --color-primary: #8f3f22;
  --color-on-primary: #fff8f4;
  --color-primary-hover: #6f2d16;
  --color-error: #a5232b;
  --color-on-error: #fff7f7;
}

.dark {
  color-scheme: dark;
  --color-background: #111317;
  --color-on-background: #e2e2e6;
  --color-surface: #111317;
  --color-surface-dim: #0c0e11;
  --color-surface-bright: #37393d;
  --color-surface-container-lowest: #0c0e11;
  --color-surface-container-low: #1a1c1f;
  --color-surface-container: #1e2023;
  --color-surface-container-high: #282a2d;
  --color-surface-container-highest: #333538;
  --color-on-surface: #e2e2e6;
  --color-on-surface-variant: #dac1b9;
  --color-outline: #a28c85;
  --color-outline-variant: #54433d;
  --color-primary: #ffc6b2;
  --color-on-primary: #591d03;
  --color-primary-hover: #ff9f7a;
  --color-error: #ffb4ab;
  --color-on-error: #690005;
}
```

Map existing shadcn-style names such as `--background`, `--foreground`, `--card`, `--card-foreground`, `--popover`, `--border`, `--input`, `--ring`, `--muted`, `--muted-foreground`, `--secondary`, `--destructive`, and their foregrounds to those variables in `@theme`.

- [ ] **Step 2: Correct font loading**

In `layout.tsx`, replace Outfit with `Plus_Jakarta_Sans`, preserve Inter and JetBrains Mono, and attach all three variables to `<body>`:

```tsx
import { Inter, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";

const display = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-display" });
const body = Inter({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });
```

Remove decorative glow body classes. Keep providers and their order unchanged.

- [ ] **Step 3: Make dark the first-paint default without breaking persistence**

Keep the `ThemeProvider` public API. Accept only stored values equal to `dark` or `light`; otherwise default to `dark`. Apply the class and `color-scheme` together. Add an inline pre-hydration script in `layout.tsx` that reads the same key and defaults to dark, preventing a light flash.

- [ ] **Step 4: Standardize base focus and reduced motion**

Add:

```css
:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 5: Validate and commit**

```bash
cd frontend
npm run build
npm run lint || true
cd ..
git add frontend/src/app/globals.css frontend/src/app/layout.tsx \
  frontend/src/components/ThemeProvider.tsx frontend/src/components/ThemeToggle.tsx
git diff --cached --check
git commit -m "style(ui): establish amber telemetry foundation"
```

Expected: build exits `0`. Record lint output without claiming clean if non-zero.

### Task 3: Normalize existing UI primitives

**Files:**
- Modify: `frontend/src/components/ui/button.tsx`
- Modify: `frontend/src/components/ui/badge.tsx`
- Modify: `frontend/src/components/ui/card.tsx`
- Modify: `frontend/src/components/ui/input.tsx`
- Modify: `frontend/src/components/ui/table.tsx`
- Modify: `frontend/src/components/ui/tabs.tsx`
- Modify: `frontend/src/components/ui/dialog.tsx`
- Modify: `frontend/src/components/ui/scroll-area.tsx`

- [ ] **Step 1: Apply the invariant primitive geometry**

Use `rounded` on containers and controls, `border border-outline-variant`, tonal backgrounds, and `shadow-none`. Preserve component exports, variants, props, Base UI render behavior, and dialog semantics. Full circles remain allowed only for status dots.

Representative card base:

```tsx
"group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded border border-outline-variant bg-surface-container-low py-(--card-spacing) text-sm text-on-surface shadow-none"
```

Representative input base:

```tsx
"h-9 w-full min-w-0 rounded border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-none transition-colors placeholder:text-on-surface-variant focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50"
```

- [ ] **Step 2: Preserve accessible state styling**

Ensure `disabled`, `aria-invalid`, `aria-expanded`, selected tab, destructive action, keyboard focus, and dialog close remain visually distinct. Keep the screen-reader-only close label.

- [ ] **Step 3: Run type/build validation and commit**

```bash
cd frontend
npm run build
cd ..
git add frontend/src/components/ui/{button,badge,card,input,table,tabs,dialog,scroll-area}.tsx
git diff --cached --check
git commit -m "style(ui): normalize telemetry primitives"
```

### Task 4: Redesign the application shell and login

**Files:**
- Modify: `frontend/src/components/ui/LayoutShell.tsx`
- Modify: `frontend/src/components/ui/Sidebar.tsx`
- Modify: `frontend/src/components/ui/HeaderRefreshButton.tsx`
- Modify: `frontend/src/components/ui/AdminGuard.tsx`
- Modify: `frontend/src/app/login/page.tsx`

- [ ] **Step 1: Convert the sidebar to tonal command navigation**

Keep `menuGroups`, `canAccessPath`, WebSocket status, last-scrape request, collapse persistence, and link targets unchanged. Replace floating glass, blur, glow, raw border colors, and large radii with semantic surfaces. Add `aria-label` and `aria-expanded` to drawer/collapse controls.

- [ ] **Step 2: Make the mobile drawer a real modal navigation surface**

When open, label the `<aside>` as navigation, close it on overlay click, link activation, and Escape, focus its close control, and restore focus to the menu button. Keep desktop collapse independent of mobile state.

- [ ] **Step 3: Simplify the top utility bar**

Keep username/admin marker, refresh, theme, password, and logout behavior. On narrow screens retain icon buttons with accessible names; expose labels at larger breakpoints. Replace hard-coded sidebar offsets with one shared CSS custom property used by sidebar width and main padding.

- [ ] **Step 4: Restyle loading and password dialog without altering handlers**

Preserve 12-character validation, mismatch validation, request body, response error handling, success timing, and logout behavior. Stack password fields on mobile. Ensure errors use `role="alert"` and inputs reference them with `aria-describedby`.

- [ ] **Step 5: Restyle login using shared semantic tokens**

Preserve `login`, autofill attributes, password reveal, disabled state, submit behavior, and current Go error parsing. Remove ambient glow and custom cool palette. Retain a subtle grid, visible labels, and a single bordered sign-in panel.

- [ ] **Step 6: Validate and commit**

```bash
cd frontend
npm run build
cd ..
git add frontend/src/components/ui/LayoutShell.tsx \
  frontend/src/components/ui/Sidebar.tsx \
  frontend/src/components/ui/HeaderRefreshButton.tsx \
  frontend/src/components/ui/AdminGuard.tsx \
  frontend/src/app/login/page.tsx
git diff --cached --check
git commit -m "style(ui): redesign shell and login"
```

Manual expected results: `/login` works by keyboard; unauthorized routes still redirect; non-admin navigation omits settings; drawer closes with Escape; theme persists after reload.

### Task 5: Redesign dashboard and monitoring routes

**Files:**
- Modify: `frontend/src/app/page.tsx`
- Modify: `frontend/src/app/bgp/page.tsx`
- Modify: `frontend/src/app/interfaces/page.tsx`

- [ ] **Step 1: Apply the shared page-header and panel hierarchy to `/`**

Keep both existing `authFetch` calls in `Promise.all`, refresh interval cleanup, WebSocket data, memoized interface sorting, thresholds, and formatting unchanged. Restyle only page header, connection alert, KPI cards, traffic table, BGP list, loading and empty states.

- [ ] **Step 2: Restyle `/bgp` without restoring deleted history UI**

Keep local cache keys, WebSocket source, search behavior, peer selection, lookup links, 15-second abort timeout, and logs/policy requests unchanged. Preserve the active deletion of historical trend state and `BGPPrefixChart`. Use a responsive table panel and viewport-safe peer dialog.

- [ ] **Step 3: Restyle `/interfaces` around existing modes and data flows**

Keep compact/classic preference, physical/logical grouping, live sample history, historical request parameters, tabs, custom ranges, chart selection, and the new “Waiting for live telemetry” branch. Do not rewrite the active user hunks. Ensure every `ChartDialog` call supplies `chartHeight={320}` or another explicit number.

- [ ] **Step 4: Stage only redesign hunks in dirty route files**

```bash
git add frontend/src/app/page.tsx
git add -p frontend/src/app/bgp/page.tsx
git add -p frontend/src/app/interfaces/page.tsx
git diff --cached -- frontend/src/app/bgp/page.tsx frontend/src/app/interfaces/page.tsx
```

Expected: staged diff contains style/accessibility changes only. Existing BGP chart removal and interface empty-state edits remain present in the working tree unless they were already committed separately by their owner.

- [ ] **Step 5: Validate and commit**

```bash
cd frontend && npm run build && cd ..
git diff --cached --check
git commit -m "style(ui): redesign monitoring views"
```

### Task 6: Normalize chart dialogs, graphs, and result viewers

**Files:**
- Modify: `frontend/src/components/ui/chart-dialog.tsx`
- Modify: `frontend/src/components/charts/InterfaceTrafficChart.tsx`
- Modify: `frontend/src/lib/chart-colors.ts`
- Modify: `frontend/src/components/ui/ASPathGraph.tsx`
- Modify: `frontend/src/components/ui/AggregateASGraph.tsx`
- Modify: `frontend/src/components/ui/LookupModal.tsx`
- Modify: `frontend/src/components/ui/LookupResultViewer.tsx`
- Modify: `frontend/src/components/ui/RouteResultViewer.tsx`
- Modify: `frontend/src/components/dashboard/PolicyNode.tsx`
- Modify or delete after usage check: `frontend/src/components/ui/GlowingCard.tsx`

- [ ] **Step 1: Preserve the determinate chart contract**

Keep `chartHeight?: number`, default `320`, full-width sizing, and fixed inner chart height in `chart-dialog.tsx`. Restyle the wrapper only. Stage with `git add -p` because this file already contains user work.

- [ ] **Step 2: Replace chart and graph literals with semantic warm colors**

Centralize existing chart constants in `chart-colors.ts`. Use amber for the primary series, warm cream/gray for secondary series, subtle warm grid lines, and semantic tooltip surfaces. Preserve units, axes, domains, parsing, zoom, pan, fullscreen, and data ordering.

- [ ] **Step 3: Remove glow presentation from result and policy components**

Replace `GlowingCard` usage with `Card` or restyle it as a plain semantic panel if multiple call sites still require its API. Remove cyan and cool gradients. Preserve result shape, raw-output fallback, copy interactions, link behavior, and policy hierarchy.

- [ ] **Step 4: Label graph and dialog controls**

Add accessible names for icon-only zoom, reset, fullscreen, close, copy, and disclosure controls. Keep Base UI focus trapping and restoration.

- [ ] **Step 5: Run static checks and build**

```bash
cd frontend
npm run check:design
npm run build
cd ..
```

Expected: static design check passes for all currently migrated files. If unmigrated routes still trigger it, inspect output and continue without weakening the forbidden list.

- [ ] **Step 6: Commit only owned hunks**

```bash
git add frontend/src/components/charts/InterfaceTrafficChart.tsx \
  frontend/src/lib/chart-colors.ts \
  frontend/src/components/ui/ASPathGraph.tsx \
  frontend/src/components/ui/AggregateASGraph.tsx \
  frontend/src/components/ui/LookupModal.tsx \
  frontend/src/components/ui/LookupResultViewer.tsx \
  frontend/src/components/ui/RouteResultViewer.tsx \
  frontend/src/components/dashboard/PolicyNode.tsx
git add -p frontend/src/components/ui/chart-dialog.tsx
git add frontend/src/components/ui/GlowingCard.tsx
git diff --cached --check
git commit -m "style(ui): align charts and result views"
```

### Task 7: Redesign diagnostic and lookup routes

**Files:**
- Modify: `frontend/src/app/policy/page.tsx`
- Modify: `frontend/src/app/lg/page.tsx`
- Modify: `frontend/src/app/route-lookup/page.tsx`
- Modify: `frontend/src/app/lookup/page.tsx`

- [ ] **Step 1: Apply the common header, toolbar, panel, and feedback patterns**

Use the same context label, title, purpose line, action placement, border, spacing, loading, empty, and error treatments as monitoring pages.

- [ ] **Step 2: Preserve each route’s behavior**

Do not change policy request timing, Looking Glass command values or target rules, `SanitizeJunosInput`-dependent request shapes, route parsing, AS graph data, global lookup type detection, `authFetch`, logical-system propagation, or result state transitions.

- [ ] **Step 3: Make output surfaces resilient**

Use internal overflow for tables and graphs. Wrap command output safely, preserve whitespace, keep copy affordances keyboard-accessible, and ensure long prefixes, AS paths, communities, and hostnames do not widen the page.

- [ ] **Step 4: Validate and commit**

```bash
cd frontend && npm run build && cd ..
git add frontend/src/app/policy/page.tsx frontend/src/app/lg/page.tsx \
  frontend/src/app/route-lookup/page.tsx frontend/src/app/lookup/page.tsx
git diff --cached --check
git commit -m "style(ui): redesign diagnostic tools"
```

### Task 8: Redesign administration routes

**Files:**
- Modify: `frontend/src/app/settings/page.tsx`
- Modify: `frontend/src/app/settings/users/page.tsx`
- Modify: `frontend/src/app/settings/retention/page.tsx`
- Modify: `frontend/src/app/settings/as-mapping/page.tsx`

- [ ] **Step 1: Apply a common administration page structure**

Use consistent page header, section panels, labels, help text, save bar, success/error alerts, and destructive-action separation. Stack forms on mobile. Keep dense tables internally scrollable.

- [ ] **Step 2: Preserve settings behavior and active edits**

Do not alter settings field names, nanosecond conversion, request bodies, `authFetch`, validation, admin checks, user status/admin mutations, password reset, retention target logic, AS mapping CRUD, or the current `error` then `detail` response fallback. Stage `settings/page.tsx` with `git add -p`.

- [ ] **Step 3: Complete form accessibility**

Give every input a visible label. Connect help and error text with `aria-describedby`. Mark invalid controls with `aria-invalid`. Announce save/delete success and errors. Ensure confirmation dialogs have specific titles and action labels.

- [ ] **Step 4: Validate and commit**

```bash
cd frontend && npm run build && cd ..
git add -p frontend/src/app/settings/page.tsx
git add frontend/src/app/settings/users/page.tsx \
  frontend/src/app/settings/retention/page.tsx \
  frontend/src/app/settings/as-mapping/page.tsx
git diff --cached --check
git commit -m "style(ui): redesign administration views"
```

### Task 9: Accessibility and responsive acceptance pass

**Files:**
- Modify only files with observed failures from Tasks 2 through 8.

- [ ] **Step 1: Start the production frontend**

```bash
cd frontend
npm run build
npm start > "$JCODE_SCRATCH_DIR/jupetrack-ui.log" 2>&1 &
echo $! > "$JCODE_SCRATCH_DIR/jupetrack-ui.pid"
```

Expected: `curl -fsS http://localhost:3000/login >/dev/null` exits `0`. If the Docker stack is used instead, verify `http://localhost:3040/login`.

- [ ] **Step 2: Check viewport matrix in a browser**

Inspect `/login` unauthenticated and every accessible route authenticated at:

```text
320x568
768x1024
1280x800
1440x900
```

Expected: no page-level horizontal scrollbar; primary actions visible; tables scroll only inside panels; charts visible; dialogs stay inside viewport; mobile drawer is operable.

- [ ] **Step 3: Check keyboard and screen-reader semantics**

Verify Tab order, visible focus, Enter/Space activation, Escape close, dialog focus trap/restoration, drawer focus restoration, labels, `aria-label` on icon-only controls, `role="alert"` errors, reduced motion, and 200% zoom.

- [ ] **Step 4: Check behavior contracts**

Verify login, logout, session restoration, rejected non-admin route, theme persistence, refresh action, WebSocket connected/disconnected indicator, one live update per event, BGP peer detail, interface live/history modes, chart dialog sizing, Looking Glass output, route lookup, global lookup, settings save, and destructive confirmations. Do not run NETCONF or Looking Glass commands against a live router without explicit authorization. Use existing cached/safe data only.

- [ ] **Step 5: Commit observed fixes**

```bash
git add -p frontend/src
git diff --cached --check
git commit -m "fix(ui): close responsive and accessibility gaps"
```

Skip the commit if no fixes were needed.

### Task 10: Final verification and dirty-tree reconciliation

**Files:**
- No planned code changes.

- [ ] **Step 1: Run final automated checks**

```bash
cd frontend
npm run check:design
npm run build
npm run lint 2>&1 | tee "$JCODE_SCRATCH_DIR/jupetrack-ui-lint.txt"
cd ..
```

Expected: design check and build exit `0`. Lint result is reported exactly; compare non-zero output with the original baseline.

- [ ] **Step 2: Run safe stack smoke checks when the local stack is available**

```bash
curl -fsS http://localhost:8085/health
curl -fsS http://localhost:8085/api/v1/health
curl -fsS http://localhost:3040/login >/dev/null
curl -fsS http://127.0.0.1:8428/health
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8085/api/v1/live/bgp
```

Expected: health endpoints succeed; protected BGP endpoint returns `401` without auth.

- [ ] **Step 3: Prove user work and Grafana files remain intact**

```bash
git status --short
git diff -- frontend/src/app/api/proxy/'[...path]'/route.ts \
  frontend/src/components/AuthProvider.tsx frontend/src/lib/types.ts
find grafana -type f -print0 2>/dev/null | sort -z | xargs -0 sha256sum \
  > "$JCODE_SCRATCH_DIR/jupe-track-ui-baseline/grafana-after.sha256"
diff -u "$JCODE_SCRATCH_DIR/jupe-track-ui-baseline/grafana.sha256" \
  "$JCODE_SCRATCH_DIR/jupe-track-ui-baseline/grafana-after.sha256"
```

Expected: security/error-handling/type edits remain; Grafana checksum diff is empty; deleted `BGPPrefixChart.tsx` remains deleted.

- [ ] **Step 4: Review final commit scope**

```bash
BASE=$(cat "$JCODE_SCRATCH_DIR/jupe-track-ui-baseline/head.txt")
git log --oneline --decorate "$BASE"..HEAD
git diff "$BASE"..HEAD --stat -- frontend
```

Expected: commits are limited to the UI plan and explicitly staged redesign hunks. No backend, proxy contract, auth contract, or Grafana asset change appears.
