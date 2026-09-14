# JupeTrack Frontend Redesign: Amber Telemetry Grid

**Status:** Approved design direction  
**Date:** 2026-09-14  
**Supersedes:** `docs/superpowers/specs/2026-07-08-jupe-track-ui-redesign-spec.md`

## 1. Objective

Redesign the complete JupeTrack frontend as one coherent network operations interface. The result must improve scanability, consistency, responsiveness, and accessibility without changing application behavior or backend contracts.

The approved visual direction is **Amber Telemetry Grid**:

- dark command-center presentation by default;
- functional light theme;
- obsidian and warm charcoal surfaces;
- amber reserved for primary actions, selection, and healthy/live emphasis;
- dense monospaced telemetry within a restrained editorial hierarchy;
- 4px corners and 1px borders;
- no cool-tone accents, diffused shadows, or decorative glass effects.

## 2. Scope

The redesign covers the shared shell, reusable UI primitives, and every user-facing route:

- `/`
- `/bgp`
- `/interfaces`
- `/policy`
- `/lg`
- `/route-lookup`
- `/lookup`
- `/settings`
- `/settings/users`
- `/settings/retention`
- `/settings/as-mapping`
- `/login`

It also covers shared dialogs, loading states, empty states, errors, tables, charts, forms, navigation, theme controls, and mobile behavior.

## 3. Non-goals

- No backend, database, API schema, route, authentication, authorization, scraper, or NETCONF changes.
- No new user-facing feature or data source.
- No new frontend dependency when existing React, Next.js, Tailwind, Base UI, Recharts, and Lucide capabilities suffice.
- No replacement of WebSocket live data with polling.
- No restoration of the removed BGP historical chart or `BGPPrefixChart.tsx`.
- No redesign of Grafana assets.
- No unrelated refactor of large page components.

## 4. Existing Behavior That Must Remain Immutable

### Authentication and authorization

- Access tokens remain memory-only.
- Refresh tokens remain in `localStorage`.
- Browser REST calls continue through `authFetch` and `/api/proxy/[...path]`.
- Automatic refresh on `401`, login, logout, session restore, inactive-account handling, and password change behavior remain intact.
- `AdminGuard`, `isAdminPath`, admin navigation visibility, and direct-route rejection remain intact.
- Existing Go error payload support using `error` with `detail` fallback remains intact.

### Live and historical data

- Live BGP and interface data continue through `WebSocketProvider` and the backend WebSocket endpoint on port `8085`.
- WebSocket protocol selection, token query, reconnect, heartbeat, cleanup, and logout behavior remain intact.
- Refresh interval and manual refresh behavior remain intact.
- Historical metrics continue through the TSDB proxy.
- No duplicate polling timers, WebSocket subscriptions, or telemetry updates may be introduced.

### Charts

- Every chart dialog must receive a determinate `chartHeight`.
- `ResponsiveContainer` must have a parent with determinate width and height.
- Current chart units, time ranges, queries, tooltips, empty states, and error behavior remain intact unless this specification explicitly changes their presentation.

## 5. Visual System

### 5.1 Color tokens

`globals.css` becomes the single source of truth. Components must use semantic Tailwind tokens rather than raw color literals.

Dark theme follows `DESIGN.md`:

- background: `#111317`
- lowest surface: `#0c0e11`
- low surface: `#1a1c1f`
- surface: `#1e2023`
- high surface: `#282a2d`
- highest surface: `#333538`
- foreground: `#e2e2e6`
- muted foreground: `#dac1b9`
- outline: `#a28c85`
- subtle outline: `#54433d`
- primary: `#ffc6b2`
- primary strong: `#ff9f7a`
- error: `#ffb4ab`

The light theme uses warm neutrals, not slate or blue:

- background: `#f7f3ef`
- lowest surface: `#fffdfb`
- low surface: `#f3ede8`
- surface: `#fffaf7`
- high surface: `#ebe3de`
- highest surface: `#ddd2cc`
- foreground: `#241a17`
- muted foreground: `#66534c`
- outline: `#806b63`
- subtle outline: `#cdbdb5`
- primary: `#8f3f22`
- primary strong: `#6f2d16`
- error: `#a5232b`

Success/live states use amber plus explicit text or icon. Error states use red plus explicit text or icon. Color alone never communicates status.

### 5.2 Typography

- Display and headings: Plus Jakarta Sans.
- Body and controls: Inter.
- IP addresses, ASNs, counters, rates, timestamps, commands, and logs: JetBrains Mono.
- Remove the unused Outfit font.
- Page title: 28 to 32px desktop, 24px mobile.
- Section title: 16 to 20px.
- Body: 14 to 16px.
- Telemetry label: 10 to 12px, uppercase, tracked.
- Avoid text below 11px for actionable or essential information.

### 5.3 Shape, border, and depth

- Interactive controls and containers use a 4px radius.
- Circular status dots and avatars may remain fully round.
- Cards, inputs, tables, dialogs, and navigation use 1px semantic borders.
- Depth comes from tonal surface changes, not box shadows.
- Remove glow cards, large blurred decorative orbs, cyan accents, glass blur, and shadow-heavy treatments.
- Keep the background grid extremely subtle and non-interactive.

### 5.4 Spacing and density

- Use the existing 4px base rhythm.
- Standard gaps: 8, 12, 16, 24, and 32px.
- Page content: 16px mobile, 24px tablet, 32px desktop.
- Dense tables remain compact, but controls maintain a minimum 44px touch target on touch layouts.
- Repeated page header, toolbar, metric card, panel, table, and form patterns use shared class recipes or existing primitives. No speculative abstraction beyond repeated patterns.

### 5.5 Motion

- Use short CSS transitions only for focus, hover, disclosure, drawer, and dialog state.
- No motion dependency.
- Respect `prefers-reduced-motion` by removing non-essential animation.
- Live indicators may pulse only when reduced motion is not requested.

## 6. Application Shell

### Desktop, 1280px and wider

- Fixed left navigation with expanded and collapsed states.
- Compact top utility bar containing logical-system context, refresh, theme, account, and sign-out actions.
- Main content uses one independent vertical scroll region.
- Sidebar width and content offset share one source of truth to prevent drift.

### Tablet, 768px to 1279px

- Collapsed rail by default where practical.
- Tables and charts retain readable minimum dimensions within internal overflow containers.
- Utility actions may collapse to labeled menus without hiding primary actions.

### Mobile, 320px to 767px

- Sidebar becomes an accessible modal drawer.
- Header exposes a labeled menu button and essential status only.
- Content uses a single column.
- Cards, forms, and dialogs fit the viewport without page-level horizontal overflow.
- Dense tables may scroll horizontally inside their panel.
- Long peer, interface, policy, and route identifiers truncate visually while remaining available through accessible names or detail views.

Navigation remains grouped by monitoring, tools, and administration. Active state uses an amber rail/fill plus text contrast. Admin destinations remain absent for unauthorized users.

## 7. Shared Component Patterns

### Page header

Every page uses:

1. uppercase context label;
2. clear page title;
3. one-line purpose description;
4. optional right-aligned actions or live status.

### Metric cards

- Label, primary value, supporting context, status icon.
- Numeric values use JetBrains Mono.
- Warning and stale states change border, icon, label, and text, not only color.

### Data panels and tables

- Panel header contains title, concise metadata, and local actions.
- Sticky table headers are allowed where useful.
- Row hover, keyboard focus, selected state, and expanded state are distinct.
- Empty, loading, stale, and error states occupy the same panel geometry to avoid layout jumps.
- Internal horizontal scrolling is explicit on narrow screens.

### Forms

- Visible labels remain present.
- Help and validation text are associated with controls.
- Destructive actions are visually separated from primary actions.
- Settings forms stack to one column on mobile.
- Submit state prevents duplicate requests and announces success or failure.

### Dialogs

- Base UI dialog semantics, focus trap, Escape close, focus restoration, and labeled title remain.
- Mobile dialogs become viewport-safe sheets or constrained panels.
- Chart dialogs keep explicit `chartHeight` and responsive width.
- Destructive confirmation requires explicit action labeling.

### Feedback states

- Skeletons reflect final layout.
- Empty states explain what is missing and, when actionable, how to recover.
- Errors use `role="alert"` where immediate attention is required.
- Live connection, stale collector, refresh, and save feedback use concise text and iconography.

## 8. Route-specific Presentation

- **Dashboard `/`:** telemetry summary first, then interface traffic and BGP health. Preserve current live data and scraper/device status requests.
- **BGP `/bgp`:** searchable peer table and peer detail dialog. Preserve removal of the historical trend block.
- **Interfaces `/interfaces`:** retain live/history tabs, compact/classic modes, physical/logical hierarchy, traffic charts, and current empty-state fix.
- **Policy `/policy`:** present policy and term hierarchy as a readable technical tree without glow or shadow.
- **Looking Glass `/lg`:** command controls remain prominent; output becomes a high-contrast console surface with safe wrapping and copy behavior.
- **Route Lookup `/route-lookup`:** keep query controls, route result hierarchy, and AS-path visualizations; replace cyan or cool graph accents with semantic warm tokens.
- **Lookup `/lookup`:** compact search-first layout with clear result grouping and responsive modal behavior.
- **Settings:** shared section navigation, consistent labels, save states, danger separation, and admin-only controls. Large retention and users tables remain internally scrollable.
- **Login `/login`:** restrained branded entry screen using the same tokens. Preserve all form behavior, autofill, password visibility, disabled state, and error handling.

## 9. Accessibility Requirements

Target WCAG 2.2 AA for redesigned surfaces.

- All icon-only controls require an `aria-label`; `title` alone is insufficient.
- Keyboard access must cover sidebar, drawer, tabs, tables with actions, forms, menus, and dialogs.
- Focus indicators use a visible high-contrast semantic ring.
- Dialog focus is trapped and restored correctly.
- Heading levels remain sequential.
- Form errors are associated via `aria-describedby` and announced when appropriate.
- Live status announcements avoid excessive verbosity.
- Text and meaningful UI graphics meet AA contrast in both themes.
- Touch targets are at least 44 by 44px on touch layouts.
- Zoom to 200% remains usable without clipped primary actions.

## 10. Implementation Boundaries

- Start with semantic tokens and existing primitives, then shell, then route surfaces.
- Replace hard-coded `#2A2E35`, blue/slate literals, and inconsistent radii through tokens.
- Prefer deletion or restyling over adding wrappers.
- Do not introduce a new component unless at least two existing surfaces require the same behavior or markup.
- Do not alter request URLs, request bodies, response parsing, providers, hooks, state transitions, or permission checks merely to restyle UI.
- Preserve all current uncommitted user changes. In particular, do not overwrite changes in `AuthProvider.tsx`, the proxy route, BGP and interface pages, settings, `chart-dialog.tsx`, or `types.ts`.
- Preserve deletion of `BGPPrefixChart.tsx`.
- Do not touch untracked `grafana/` files.
- Before each implementation batch, record the changed-file baseline. Never reset, stash, or checkout user work.

## 11. Validation and Acceptance Criteria

1. `npm run build` exits successfully.
2. `npm run lint` is run. Any failure is compared with the existing baseline and reported accurately.
3. Every listed route renders at 320px, 768px, 1280px, and 1440px without page-level horizontal overflow, clipped primary actions, or unreadable charts.
4. Dark theme is the default Amber Telemetry Grid experience. Light theme remains readable, usable, and free of cool-tone accents.
5. Raw cool blue/purple accents, raw `#2A2E35` borders, non-semantic shadow/glow treatments, and unintended radii larger than 4px are absent from redesigned surfaces.
6. Unauthenticated protected-route access still reaches `/login`. Non-admin users cannot see or execute admin actions. Direct admin-route access remains rejected.
7. Login, logout, session restore, access-token refresh success/failure, inactive-account errors, and password change retain their current behavior.
8. REST traffic remains on `/api/proxy`; TSDB traffic remains on `/api/tsdb`; WebSocket traffic remains direct on port `8085` using the correct `ws` or `wss` protocol.
9. Live telemetry updates without reload, reconnects after interruption, cleans up on logout/unmount, and does not duplicate updates or timers.
10. Every chart dialog has a determinate height and remains visible in portrait and landscape layouts. Empty and error states remain recoverable.
11. Icon-only controls have accessible names. Focus order, Escape behavior, focus restoration, form labels, alerts, reduced motion, and keyboard navigation pass manual checks.
12. Git diff contains only explicitly allowlisted redesign files. Existing user changes remain present, and every pre-existing untracked `grafana/` file remains untouched.

## 12. Delivery Sequence

1. Snapshot dirty-tree ownership and establish a frontend file allowlist.
2. Align fonts, semantic tokens, radius, focus, motion, and base primitives.
3. Redesign shell, sidebar, header, login, and shared feedback states.
4. Apply shared page patterns to monitoring routes.
5. Apply them to tool and administrative routes.
6. Run build, lint baseline comparison, static color/radius checks, and responsive browser review.
7. Recheck the original dirty-tree snapshot before committing only redesign-owned changes.
