# Frontend Wireframes – Role Dashboards

Authoring Focus: Concrete, implementation‑ready wireframes (textual + ASCII) for four primary roles: Super Admin, Admin, Volunteer, User (Pilgrim). Each section includes: Purpose, Layout Grid, Primary Zones, Component Inventory, Data Widgets, Key Interactions, States (Loading/Empty/Error), Responsive & Accessibility notes, and Phase Priorities.

---

Color theme : #202020 #FFFFFF , #5D5FEF , #7879F1 , #A5A6F6 , #EF5DA8, #F178B6 , #FCDDEC

## 1. Shared Foundations

### 1.1 Global Layout Tokens
- Top App Bar Height: 56px (desktop), 48px (mobile)
- Left Nav (desktop): 248px default / 72px collapsed
- Right Context / Side Panel: 360px (overlay on <= 1366px)
- Content Max Width (non-map pages): 1440px
- Grid Gutter: 16px (mobile), 24px (tablet+)
- Breakpoints: sm 0–639 | md 640–1023 | lg 1024–1439 | xl 1440+
- Color Semantics: occupancy {green #2e7d32, busy #ffb300, critical #d32f2f, closed #616161}, severity {low=grey, medium=amber, high=orange, critical=red}
- Elevation: App Bar (z8), Floating Alerts Toast (z20), Modals (z30), Map Overlays (z10)

### 1.2 Reusable Components
- AppShell (TopBar + Nav + Content + Optional RightPanel)
- MapCanvas (MapLibre wrapper) with LayerToggleDock
- DataCard (header + metric + delta), SparklineCard
- Table (virtualized), EntitySidePanel
- AlertList (group by severity), AlertRow (actions)
- CameraThumbnail (status badge), OccupancyChip, TaskCard, LostReportCard, MatchReviewCard
- NotificationDrawer, WSStatusIndicator, OfflineBanner
- WizardStepper, PhotoUploader, FaceComparePanel

---
## 2. Super Admin Dashboard
**Purpose:** Platform oversight (tenants, usage, global thresholds, model versions).

### 2.1 Primary Dashboard Layout (Desktop)
```
┌─────────────────────────────────────────────────────────────── App Top Bar (Logo | Tenant Filter | Search | User Menu) ─────────────┐
│                                                                                                                                    │
├──── Nav (collapsed ok) ───┬───────────────────────────────────── Main Scroll Area ───────────────────────────────────────────────────┤
│ Tenants                                                       │┌──────── Row 1 (Metrics) ──────────────────────────────────────┐│
│ Users                                                         ││ [Card: Tenants] [Card: Total Users] [Card: Cameras Online%]  ││
│ Policies                                                      │└──────────────────────────────────────────────────────────────┘│
│ Models                                                        │┌──────── Row 2 (Charts) ───────────────────────────────────────┐│
│ Audit Logs                                                    ││ [Spark: Alerts by Severity 24h]  [Spark: Embeddings/sec]     ││
│                                                               │└──────────────────────────────────────────────────────────────┘│
│                                                               │┌──────── Row 3 (Tables Split) ────────────────────────────────┐│
│                                                               ││ Tenants Table (left 60%) | Recent Audit Log (right 40%)     ││
│                                                               │└──────────────────────────────────────────────────────────────┘│
│                                                               │        Sticky Footer: Threshold Summary + Edit Button          │
└────────────────────────────────────────────────────────────────┴────────────────────────────────────────────────────────────────┘
```

### 2.2 Key Widgets
- Metric Cards: (Active Tenants, Total Users by Role aggregated tooltip, Cameras Online %, Daily Matches Reviewed, Avg Match Latency)
- Charts: Bar or stacked severity for alerts; line for embeddings ingestion throughput
- Tenants Table Columns: Name | Status | Zones | Storage (GB) | Alerts 24h | Last Activity | Actions (View / Suspend)
- Audit Log Table Columns: Time | Actor | Action | Entity | Result | IP

### 2.3 Interactions
- Clicking Tenant row opens side panel with tabs: Overview | Config | Usage | Retention
- Threshold Summary Bar → opens Policy Modal (editable sliders with preview gauge)
- Model Version Badge (top bar) clickable → Models page

### 2.4 States
- Loading: Skeleton rows (5 for tables, animated placeholders for cards)
- Empty (new install): Center message with CTA “Create First Tenant”
- Error: Inline alert in affected section only

### 2.5 Responsive
- md: Move charts below tables sequentially
- sm: Single column, cards become horizontally scrollable carousel

### 2.6 Accessibility
- Table rows focusable; action menu reachable via keyboard (Enter opens; arrow nav)
- Color + icon (status dot shape) for tenant status

### 2.7 Phase Priorities
- MVP: Metric Cards + Tenants Table + Audit Log excerpt
- Phase 2: Charts + Model version summary
- Phase 3: Live streaming KPIs (WebSocket deltas)

---
## 3. Admin Dashboard
**Purpose:** Real-time situational awareness (crowd, alerts, cameras, lost & found).

### 3.1 Core Dashboard (Operations View)
```
┌───────────────────────────────────────── Top Bar (Logo | Zone Filter | Date/Live Toggle | Search | Alerts Bell | User) ─────────────┐
├──────── Nav ───────┬────────────────────────── Map & Widgets Composite (fills viewport height minus bar) ──────────────────────────┤
│ Dashboard          │┌──────────────────────── Main Map Region ───────────────────────────────┐┌─ Right Panel (Alerts) ───────────┐│
│ Map Editor         ││  Base Map (Zones colored by occupancy)                                ││  Tabs: [Active Alerts][History]  ││
│ Cameras            ││  Overlays: Gates (direction arrows), Cameras (status ring), Services   ││  Alert Row: icon | type | time   ││
│ Lost & Found       ││  Floating Layer Dock (left inside map): [Layers][Legend][Play/Pause]  ││  Filters (type, severity)        ││
│ Crowd Analytics    ││  Mini Occupancy Strip (bottom overlay)                                ││  Row actions: Ack, Assign, ...   ││
│ Alerts             │└────────────────────────────────────────────────────────────────────────┘└──────────────────────────────────┘│
│ Volunteers         │┌─ Bottom Camera Strip (thumbnails scroll) ─────────────────────────────┐                                       │
│ Tasks              ││ [Cam Thumb + status] ...                                             │                                       │
│ Reports            │└──────────────────────────────────────────────────────────────────────┘                                       │
│ Settings           │                                                                                                               │
└────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Supplementary Dashboard Widgets (toggleable over map)
- KPI Dock (top-left overlay): Current Open Alerts, Critical Zones, Avg Zone Occupancy %, Matches Pending
- Clicking a Zone polygon: Side Panel replaces Alerts (if user chooses) with Zone Detail (Occupancy gauge, In/Out trend, Active Alerts list, Services list, Assigned Volunteers)

### 3.3 Data Elements
- Occupancy Strip: Horizontal bar per zone (scrollable) Format: [Zone Name | 78% (Busy) | Δ +4% 5m]
- Camera Thumbnail: Last frame (auto-refresh 10s) + status ring (green/amber/red/gray) + face detection rate badge
- Alert Row: Severity icon + Type + Zone + Age + Quick Actions

### 3.4 Key Interactions
- Real-time Patch: `crowd:zone_occupancy` updates zone fill & occupancy strip entry (pulse animation once)
- Map Editor toggle: switches map into edit mode (toolbar appears: Draw Zone, Add Gate, Add Service, Link Camera, Discard / Publish)
- Alert Ack: immediate optimistic UI (status pill transitions)
- Camera Click: opens modal with larger stream preview + detection timeline
- Lost Match Prompt: Toast “New Match Pending Review” → clicking opens Match Review Drawer

### 3.5 States
- Loading: Map skeleton (gray blocks), empty thumbnails placeholders
- Empty: If no cameras configured → guidance card “Add Cameras to start live monitoring”
- Degraded: If WS disconnected → banner “Live updates paused — retry” with spinner

### 3.6 Responsive Behavior
- lg+: Side alerts panel persistent
- md: Alerts panel overlays sliding from right (modal sheet)
- sm: Dashboard reduces to tabbed interface (Map | Alerts | Cameras) with map occupying majority; camera strip becomes separate tab list

### 3.7 Accessibility
- Keyboard: Arrow keys pan map (when map focused), Enter selects zone
- Provide textual alt/label for camera status (e.g., aria-label "Camera 12 offline")

### 3.8 Phase Priorities
- MVP: Map (zones + occupancy), Alerts panel, Camera strip
- Phase 2: KPI Dock, Match Review Drawer integration
- Phase 3: Live editing with diff & publish workflow

---
## 4. Volunteer Dashboard (Mobile First)
**Purpose:** Action queue: tasks & alerts in assigned zones; simple situational context.

### 4.1 Mobile Home Screen
```
┌──────── Top Bar: Logo | Zone Switcher (dropdown) | Bell ───────┐
│  Offline Banner (if offline)                                    │
├─ Scroll Content ────────────────────────────────────────────────┤
│ My Zones Status (horizontal chips)                              │
│  [Zone A 72% Busy] [Zone B 45% Normal]                          │
│                                                                 │
│ Active Alerts (section)                                         │
│  Card: [Icon][Type][Zone][Age][Ack Button]                      │
│  ...                                                            │
│                                                                 │
│ Tasks (section)                                                 │
│  TaskCard: Title | Status | Age | CTA (Ack/Start/Done)          │
│  ...                                                            │
│                                                                 │
│ Quick Actions Row                                               │
│  [Report Found] [SOS] [View Map]                                │
└─────────────────────────────────────────────────────────────────┘
Fixed Bottom Nav: Home | Tasks | Alerts | Map | Profile
Floating Action (on Map tab): Report Found
```

### 4.2 Task Detail Screen
- Header: Back | Task Title | Status Pill
- Body: Zone, Assigned Time, Timeline (Ack → In Progress → Done), Notes List, Add Photo Evidence button

### 4.3 Report Found Flow (Wizard Sheet)
1. Capture/Upload Photo (inline face auto-detect highlight)  
2. Confirm & Annotate (optional note)  
3. Submit (loading spinner + success state)  
4. Result: “Uploaded – awaiting match” with link to History

### 4.4 Map Tab (Simplified)
```
┌───────── Top (search collapsible) ─────────┐
│ Mini Legend: Busy / Critical colors         │
├──────────────── Map Canvas ────────────────┤
│ Zones (only assigned) outlined + fill       │
│ Alerts markers (tap → bottom sheet)         │
└────────────────────────────────────────────┘
```
Bottom Sheet (on marker/zone tap): Zone occupancy, active alerts, open tasks.

### 4.5 States
- Empty Tasks: Illustration + “No tasks right now” + Refresh
- Offline: Each unsynced action shows mini clock icon + tooltip “Pending sync”

### 4.6 Responsive (Tablet)
- Two-column: Left list (Tasks / Alerts tabs), Right detail

### 4.7 Accessibility
- Large touch targets (44px min)
- Haptic feedback on alert receipt (mobile native)

### 4.8 Phase Priorities
- MVP: Home alerts/tasks list + basic report found
- Phase 2: Offline queue & evidence photos
- Phase 3: Live map overlays & incremental sync indicators

---
## 5. User (Pilgrim) Dashboard (Mobile First)
**Purpose:** Provide tools: report lost person, view services & crowding, receive updates.

### 5.1 Home Screen
```
┌──────── App Bar: Logo | Notifications Icon ────────┐
│ Advisory Banner (crowd guidance / safety)           │
├─ Primary CTA Grid ─────────────────────────────────┤
│ [Report Lost Person] [View Map]                    │
│ [My Reports]       [Safety Alerts]                 │
├─ Quick Crowd Snapshot (top 3 congested zones) ─────┤
│ Zone 4 Critical 92% | Zone 6 Busy 74% | Zone 1 Busy│
├─ Recent Notifications (2) ─────────────────────────┤
│ ...                                                 │
└─────────────────────────────────────────────────────┘
```

### 5.2 Report Lost Wizard
Step Layout (Progress indicator at top)
1. Person Details Form (name, age, gender, description)  
2. Photos Uploader (1–3) with quality checklist  
3. Last Seen Location (Map + use current location button)  
4. Review (summary card) + Consent checkbox  
5. Submission Result (tracking ID + “We’ll notify you on matches”)  

### 5.3 My Reports Screen
- Cards: Person Name | Status Pill | Last Update | Actions (Add Photo, Update Info)
- Tap → Detail: Report metadata, Photos gallery, Matches (if any, only status & high-level zone – no face images), Timeline

### 5.4 Map Screen
```
┌──── Top: Search Services (input) ────┐
│ Layer Toggles (Services | Crowd Heat)│
├──────────── Map Canvas ──────────────┤
│ Heat tiles (respect K threshold)     │
│ Service icons (tap → info card)      │
│ My location dot (if consent)         │
└──────── Bottom Info Drawer (peek) ───┘
```
Bottom Drawer States: Collapsed peek (16px grabber) → Expanded list of nearest services (distance, open/closed if applicable) → Swipe down to dismiss.

### 5.5 Notifications Screen
- Grouped by day heading; each row: icon | title | short body | time | unread dot
- Pull to refresh

### 5.6 States
- Empty Reports: CTA card “Start by reporting a lost person.”
- Rate Limiting: If frequent submissions → inline notice with cooldown timer
- Offline: Report wizard stores draft locally; Submit button shows “Queue” icon

### 5.7 Accessibility & Privacy
- Location consent modal separate step, clear time-bound sharing toggle (15m / 1h / Event)
- High contrast mode: reduce heatmap opacity; fallback list view of crowded zones

### 5.8 Phase Priorities
- MVP: Report Lost, My Reports basic, Map with services only
- Phase 2: Heatmap + advisory banner + match notifications
- Phase 3: Enhanced guidance (alternative gate suggestions)

---
## 6. Cross-Role Interactions
| Event | Super Admin | Admin | Volunteer | User |
|-------|-------------|-------|-----------|------|
| alert:new critical | KPI card increments | Alert panel highlight | Home alert card + vibrate | Safety advisory banner (if public) |
| match:pending | Models/Policy unaffected | Match Review Drawer | (none) | (none) |
| match:confirmed | Aggregate metric updates | Lost report auto updates | (may receive contextual alert if tasked) | User receives notification |
| zone occupancy change | Global chart trend | Zone color update | Zone chip update | Advisory if severe and public |

---
## 7. Wireframe Component Contracts (Selected)
### 7.1 AlertRow
- Props: id, type, severity, zoneName, ageSec, status, assignees[], onAck, onAssign, onResolve
- Row Height: 56px (desktop), 64px (touch)
- Layout: [SeverityIcon 32] [Type + Zone stacked] [Age badge] [Actions: Ack | ...]

### 7.2 ZoneOccupancyEntry
- Props: zoneId, name, occupancyPct, statusTag, deltaPct, lastUpdatedSec
- Visual: Progress bar (rounded) + right-aligned pct + small delta arrow

### 7.3 TaskCard
- Props: id, title, status, zone, createdAt, ackAt?, doneAt?, evidenceCount, offlinePending
- Layout: Title bold, below small meta row, trailing StatusPill / offline icon

### 7.4 MatchReviewCard (Admin)
- Props: matchId, lostPersonName, score, threshold, lostPhotoUrl, foundFaceUrl, onConfirm, onReject
- Layout: Side-by-side image boxes 120x120 + similarity gauge ring

### 7.5 CameraThumbnail
- Props: id, name, status, updatedAgoSec, faceRatePerMin, imageUrl
- Overlay: Status ring color, small metric badge bottom-right

---
## 8. Loading & Skeleton Patterns
- Cards: Pulsing gray box; charts: blurred gradient bar; map: tinted placeholder + centered spinner
- Tables: 5–8 skeleton rows (animated shimmer)
- Mobile lists: 3 skeleton list items

---
## 9. Error Presentation
- Scoped Banner (component-level) with retry button; do not collapse entire dashboard
- For WebSocket loss: Non-blocking toast + persistent subtle red dot on WSStatusIndicator

---
## 10. Performance & Real-Time Strategy
- Use WS incremental patches (JSON diff or minimal field set) to mutate local caches
- Debounce occupancy recolor to 300–500ms intervals
- Virtualize lists > 40 rows (cameras, alerts history, audit log)
- Image lazy-load intersection observer (threshold 0.2)
- Pre-fetch side panel data on row hover (desktop) or on first focus

---
## 11. Theming & Dark Mode
- Dark Map Style auto selected in dark theme
- Status colors maintain WCAG contrast (text over chips uses accessible foreground—e.g., use tinted backgrounds not pure color blocks)

---
## 12. Open Questions / Assumptions
- Assumed match face images are restricted to Admin only (not visible to volunteers unless policy changes)
- Assumed pilgrims do not see specific zone names for critical alerts (public guidance wording only)
- Need decision: Do Volunteers see user lost report personal descriptions? (Currently: minimal anonymized info)

---
## 13. Next Steps (If Needed)
1. Convert component contracts into TypeScript interface stubs
2. Produce low-fidelity Figma frames aligning with ASCII layouts
3. Define WebSocket event payload schemas for front-end stores
4. Create Storybook entries for key status/alert components

---
END OF WIREFRAMES
