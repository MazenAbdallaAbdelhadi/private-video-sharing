# Monteer — Secure Video Showcase SaaS

Transform the current single-video-per-link prototype into a full multi-video client showcase platform.

## Current State Assessment

**What exists:**
- ✅ Better Auth (Google/Discord OAuth, admin plugin)
- ✅ S3 upload flow with presigned URLs
- ✅ Single `Video` model → single `VideoLink` per video → single viewer
- ✅ IP locking, session binding, fullscreen enforcement, devtools detection
- ✅ Basic dashboard (upload + manage links per video)
- ✅ Event logging (first_access, play, ip_mismatch, etc.)
- ✅ Tailwind v4 + Shadcn (radix-nova) + Plus Jakarta Sans font

**What's missing (the entire product):**
- ❌ Multi-video client pages (one link → many videos)
- ❌ Landing page builder (hero, about, branding, video selection)
- ❌ Proper editor dashboard with sidebar navigation
- ❌ Per-video metadata (title, description, thumbnail)
- ❌ Analytics dashboard with engagement stats
- ❌ Dynamic watermark overlay
- ❌ Premium dark-mode client-facing UI
- ❌ Device fingerprinting
- ❌ Max sessions config

---

## Open Questions

> [!IMPORTANT]
> **1. HLS Transcoding** — The spec calls for HLS streaming. Do you want to implement server-side transcoding (requires FFmpeg on the server or a cloud transcoding service like AWS MediaConvert)? Or should we start with direct MP4 streaming via signed URLs (current approach) and add HLS later?

> [!IMPORTANT]
> **2. Thumbnail Generation** — Should thumbnails be auto-generated server-side (requires FFmpeg), manually uploaded, or both?

> [!IMPORTANT]
> **3. Multi-tenancy** — Is this single-editor (you are the only editor) or multi-editor (multiple editors sign up and each manage their own clients)? Current auth supports multi-user but the UX is single-editor.

> [!IMPORTANT]
> **4. Client Name / Branding** — Should each "client page" have a client name/email associated so it can be displayed in the watermark overlay? Or is the watermark the editor's info only?

---

## Phase 1: Database Schema Redesign

The core paradigm shift: **one link → one client page → many videos**.

### [MODIFY] [schema.prisma](file:///d:/2026/private-video-sharing/prisma/schema.prisma)

**Add `ClientPage` model** — the central entity linking editor branding to a set of videos:

```prisma
model ClientPage {
  id        String   @id @default(cuid())
  ownerId   String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Client metadata
  clientName  String?
  clientEmail String?

  // Hero section
  heroTitle       String  @default("Your Videos")
  heroSubtitle    String?
  heroBackgroundS3Key String?

  // About section
  aboutText String?

  // Branding
  brandLogoS3Key  String?
  accentColor     String  @default("#8B5CF6") // violet-500
  showEditorName  Boolean @default(true)

  // Status
  isPublished Boolean @default(false)

  owner  User                @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  videos ClientPageVideo[]
  links  ClientLink[]

  @@index([ownerId])
  @@map("client_page")
}
```

**Add `ClientPageVideo` join model** — which videos appear on which page + ordering:

```prisma
model ClientPageVideo {
  id           String @id @default(cuid())
  clientPageId String
  videoId      String
  sortOrder    Int    @default(0)

  clientPage ClientPage @relation(fields: [clientPageId], references: [id], onDelete: Cascade)
  video      Video      @relation(fields: [videoId], references: [id], onDelete: Cascade)

  @@unique([clientPageId, videoId])
  @@index([clientPageId])
  @@map("client_page_video")
}
```

**Add `ClientLink` model** — replaces `VideoLink` concept for multi-video pages:

```prisma
model ClientLink {
  token         String          @id
  clientPageId  String
  ownerId       String
  createdAt     DateTime        @default(now())
  expiresAt     DateTime

  lockedIp      String?
  sessionId     String?
  deviceFingerprint String?

  status        VideoLinkStatus @default(active)
  revokedAt     DateTime?
  consumed      Boolean         @default(false)
  maxSessions   Int             @default(1)

  // Client identification for watermark
  clientName    String?
  clientEmail   String?

  clientPage ClientPage        @relation(fields: [clientPageId], references: [id], onDelete: Cascade)
  owner      User              @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  events     ClientLinkEvent[]

  @@index([clientPageId])
  @@index([ownerId])
  @@index([expiresAt])
  @@map("client_link")
}
```

**Add `ClientLinkEvent` model:**

```prisma
model ClientLinkEvent {
  id        String             @id @default(cuid())
  token     String
  createdAt DateTime           @default(now())
  type      VideoLinkEventType

  ip        String?
  userAgent String?
  details   Json?

  // Which video was being watched (for per-video analytics)
  videoId   String?

  link ClientLink @relation(fields: [token], references: [token], onDelete: Cascade)

  @@index([token])
  @@index([createdAt])
  @@index([videoId])
  @@map("client_link_event")
}
```

**Extend `Video` model** with metadata fields:

```prisma
model Video {
  // ... existing fields ...
  title           String?
  description     String?
  thumbnailS3Key  String?

  // Add relation
  clientPages ClientPageVideo[]
}
```

**Extend `User` model** with editor profile fields:

```prisma
model User {
  // ... existing fields ...
  brandName    String?
  brandLogoS3Key String?
  defaultAccentColor String?

  clientPages  ClientPage[]
  clientLinks  ClientLink[]
}
```

**Add new event types** to the enum:

```prisma
enum VideoLinkEventType {
  // ... existing ...
  video_start
  video_pause
  video_seek
  video_end
  heartbeat       // periodic "still watching" pings
  devtools_detected
  page_view       // client page opened
}
```

> [!NOTE]
> The old `VideoLink` and `VideoLinkEvent` models are kept for backward compatibility but no new features will use them.

---

## Phase 2: Client-Facing Landing Page (Premium UI)

The public page clients see when they open a link.

### Route: `/(root)/c/[token]/page.tsx`

### New Files

#### [NEW] `src/app/(root)/c/[token]/page.tsx`
Server component that validates the token, fetches the `ClientPage` with videos, and renders the client showcase.

#### [NEW] `src/features/client-view/client-page-layout.tsx`
The main premium landing page component with sections:
- **Hero** — Full-width gradient/image header with title, subtitle, editor branding
- **Video Gallery** — Grid of video cards with thumbnails, click to open player modal
- **About Section** — Editor description text
- **Footer** — Minimal branding

#### [NEW] `src/features/client-view/video-gallery.tsx`
Grid layout of video cards. Each card:
- Thumbnail with play icon overlay
- Title + description
- Hover effect with subtle scale + glow
- Click → opens `SecurePlayerModal`

#### [NEW] `src/features/client-view/secure-player-modal.tsx`
Full-screen modal that replaces the current `VideoViewer`:
- Requests fullscreen on play
- Enforces all existing protections (IP, session, devtools, etc.)
- Custom controls (no native download button)
- Dynamic watermark overlay (client email/IP, semi-transparent, moves position periodically)
- Heartbeat pings every 15s for accurate watch-time tracking

#### [NEW] `src/features/client-view/watermark-overlay.tsx`
Semi-transparent overlay that renders on top of the video:
- Shows client email/IP + timestamp
- Repositions every 30s (makes screen-recording watermark removal harder)
- Low opacity (~15%) so it doesn't ruin viewing experience

#### [NEW] `src/features/client-view/custom-video-controls.tsx`
Custom play/pause/seek/volume/fullscreen controls:
- No download button
- No playback rate
- No PiP
- Styled to match the dark premium theme

### API Routes for Client View

#### [NEW] `src/app/api/c/[token]/init/route.ts`
Same logic as current `/api/v/[token]/init` but works with `ClientLink` model. Returns page data + video list.

#### [NEW] `src/app/api/c/[token]/play/[videoId]/route.ts`
Returns a signed S3 URL for a specific video within the client page. Validates the video belongs to the page.

#### [NEW] `src/app/api/c/[token]/revoke/route.ts`
Same revocation logic adapted for `ClientLink`.

#### [NEW] `src/app/api/c/[token]/heartbeat/route.ts`
Accepts periodic pings with `{ videoId, currentTime, duration }` to track watch progress.

#### [MODIFY] `src/lib/video-links/validate.ts`
Extract shared validation logic into reusable functions. Add a parallel `validateClientLinkAccessOrThrow()` function for the new `ClientLink` model.

---

## Phase 3: Editor Dashboard Redesign

Replace the current flat dashboard with a proper sidebar-navigated admin panel.

### Layout & Navigation

#### [NEW] `src/app/dashboard/layout.tsx`
Dashboard shell with sidebar navigation:
- **Videos** — Upload & manage library
- **Client Pages** — Build & manage client showcase pages
- **Links** — All generated links with status
- **Analytics** — Viewing stats
- **Settings** — Editor profile & branding

Uses existing Shadcn `Sidebar` component (already installed).

### Video Management (Enhanced)

#### [MODIFY] `src/app/dashboard/page.tsx` → `src/app/dashboard/videos/page.tsx`
Move current dashboard content into `/dashboard/videos`. Enhance the video list:

#### [NEW] `src/features/dashboard/videos/video-card.tsx`
Grid card for each video:
- Thumbnail (or placeholder gradient)
- Title (editable)
- Upload date, size, duration
- Actions: Edit metadata, Delete, Preview

#### [NEW] `src/features/dashboard/videos/video-edit-dialog.tsx`
Dialog to edit video metadata:
- Title, Description
- Upload/change thumbnail
- Preview player

#### [MODIFY] `src/features/dashboard/upload-widget.tsx`
Enhance to support:
- Drag & drop zone (not just file input)
- Multiple file upload
- Title input during upload
- Auto-thumbnail placeholder

### Client Page Builder

#### [NEW] `src/app/dashboard/pages/page.tsx`
List of all client pages with status (draft/published), client name, video count, link count.

#### [NEW] `src/app/dashboard/pages/[id]/page.tsx`
The page builder view with two panels:
- **Left: Edit Panel** — Form-based editing of all sections
- **Right: Live Preview** — Real-time preview of the client page

#### [NEW] `src/features/dashboard/page-builder/page-builder.tsx`
Main builder component with accordion sections:
1. **Hero Settings** — Title, subtitle, background image upload
2. **Video Selection** — Drag-sortable list, pick from video library
3. **About Section** — Rich text / markdown
4. **Branding** — Logo upload, accent color picker
5. **Publish** toggle

#### [NEW] `src/features/dashboard/page-builder/video-picker.tsx`
Modal to select videos from the library. Checkbox multi-select with thumbnail previews.

#### [NEW] `src/features/dashboard/page-builder/page-preview.tsx`
Iframe-like preview that renders the client page in a contained view. Toggle between desktop/mobile.

### Link Management

#### [NEW] `src/app/dashboard/links/page.tsx`
Table of all `ClientLink` records across all pages:
- Token (truncated), Client Page name, Status badge, Expiry, IP lock, Event count
- Actions: Copy link, Revoke, View analytics

#### [NEW] `src/features/dashboard/links/create-link-dialog.tsx`
Dialog to generate a new client link:
- Select client page
- Set expiry (duration presets: 24h, 3d, 7d, 30d, custom)
- Optional: client name/email (for watermark)
- Optional: max sessions

### API Routes for Dashboard

#### [NEW] `src/app/api/client-pages/route.ts`
`GET` — List editor's client pages. `POST` — Create new page.

#### [NEW] `src/app/api/client-pages/[id]/route.ts`
`GET` — Get page details. `PATCH` — Update page settings. `DELETE` — Delete page.

#### [NEW] `src/app/api/client-pages/[id]/videos/route.ts`
`POST` — Add video to page. `DELETE` — Remove video. `PATCH` — Reorder.

#### [NEW] `src/app/api/client-links/route.ts`
`GET` — List all client links. `POST` — Create new link for a page.

#### [NEW] `src/app/api/client-links/[token]/route.ts`
`GET` — Link details. `PATCH` — Update (revoke). `DELETE` — Hard delete.

#### [NEW] `src/app/api/client-links/[token]/analytics/route.ts`
`GET` — Aggregated analytics for a link (watch times, per-video stats).

#### [NEW] `src/app/api/videos/[id]/route.ts`
`PATCH` — Update video metadata (title, description). `DELETE` — Delete video + S3 object.

#### [NEW] `src/app/api/videos/[id]/thumbnail/route.ts`
`POST` — Upload thumbnail for a video.

---

## Phase 4: Analytics System

### Database (already covered in Phase 1)
The `ClientLinkEvent` model with `videoId` field enables per-video analytics. The `heartbeat` event type with `details: { currentTime, duration }` enables watch-time calculation.

### Analytics Dashboard

#### [NEW] `src/app/dashboard/analytics/page.tsx`
Overview dashboard with:
- Total views across all links
- Active vs expired links
- Most-watched videos
- Recent activity timeline

#### [NEW] `src/features/dashboard/analytics/link-analytics.tsx`
Per-link drill-down:
- First access time, IP, device
- Per-video engagement: % watched, play count, total watch time
- Event timeline (table with filters)

#### [NEW] `src/features/dashboard/analytics/video-engagement-chart.tsx`
Bar/progress chart showing % watched per video in a link.

#### [NEW] `src/features/dashboard/analytics/activity-timeline.tsx`
Chronological event log with icons, filters by event type.

---

## Phase 5: Content Protection Enhancements

### [MODIFY] `src/features/client-view/secure-player-modal.tsx`

**Layered friction strategy:**

| Layer | Technique | Implementation |
|-------|-----------|---------------|
| 1 | Signed URLs | Already done — 60s expiry S3 presigned URLs |
| 2 | No direct file access | Videos served only through API validation |
| 3 | Fullscreen enforcement | Already done — exit = revoke |
| 4 | Right-click disabled | Already done on viewer container |
| 5 | Keyboard traps | Already done — F1-F12 blocked |
| 6 | DevTools detection | Already done — window size delta check |
| 7 | **Watermark overlay** | **NEW** — Dynamic position, client info |
| 8 | **Visibility/blur detection** | Already done — tab switch = revoke |
| 9 | **Device fingerprinting** | **NEW** — UA + screen + timezone hash |
| 10 | **CSS protection** | **NEW** — Transparent overlay div prevents video element inspection |

#### [NEW] `src/lib/fingerprint.ts`
Client-side device fingerprinting:
```
hash(userAgent + screenWidth + screenHeight + colorDepth + timezone + language)
```
Sent on init, stored in `ClientLink.deviceFingerprint`. Subsequent requests compared.

#### [MODIFY] `src/features/client-view/secure-player-modal.tsx`
Add transparent `pointer-events: none` overlay div on top of the `<video>` element that prevents right-clicking directly on the video source. Add CSS to disable text selection and drag on the entire page.

---

## Phase 6: Design System & Premium UI

### Design Tokens

#### [MODIFY] `src/app/globals.css`
Add premium dark-mode-first design tokens:

```css
:root {
  /* Premium accent palette */
  --accent-violet: oklch(0.541 0.281 293);
  --accent-violet-glow: oklch(0.541 0.281 293 / 20%);
  --surface-glass: oklch(0.205 0 0 / 60%);
  --surface-glass-border: oklch(1 0 0 / 8%);
}
```

### Key Design Decisions

- **Dark mode by default** for client-facing pages (class `dark` on html)
- **Glassmorphism cards** for video gallery items
- **Gradient accents** — violet-to-indigo for CTAs and hover states
- **Smooth transitions** — 300ms ease-out on all interactive elements
- **Typography** — Plus Jakarta Sans (already set up) + Lora for hero headings
- **Micro-animations** — Fade-in on scroll, scale on hover, pulse on loading

### Client Page Specific Styles

#### [NEW] `src/features/client-view/client-view.css`
Scoped styles for the client-facing page:
- Full-bleed hero with gradient overlay
- Glass-morphism video cards
- Animated play button hover effect
- Responsive grid (1 col mobile → 2 col tablet → 3 col desktop)

---

## Phase 7: Settings & Profile

#### [NEW] `src/app/dashboard/settings/page.tsx`
Editor profile settings:
- Brand name
- Logo upload
- Default accent color
- Connected accounts (Google/Discord)

---

## File Tree Summary (New & Modified)

```
src/
├── app/
│   ├── (root)/
│   │   └── c/[token]/page.tsx                    [NEW]
│   ├── dashboard/
│   │   ├── layout.tsx                             [NEW]
│   │   ├── page.tsx                               [MODIFY → redirect to /videos]
│   │   ├── videos/page.tsx                        [NEW]
│   │   ├── pages/
│   │   │   ├── page.tsx                           [NEW]
│   │   │   └── [id]/page.tsx                      [NEW]
│   │   ├── links/page.tsx                         [NEW]
│   │   ├── analytics/page.tsx                     [NEW]
│   │   └── settings/page.tsx                      [NEW]
│   └── api/
│       ├── c/[token]/
│       │   ├── init/route.ts                      [NEW]
│       │   ├── play/[videoId]/route.ts             [NEW]
│       │   ├── revoke/route.ts                    [NEW]
│       │   └── heartbeat/route.ts                 [NEW]
│       ├── client-pages/
│       │   ├── route.ts                           [NEW]
│       │   └── [id]/
│       │       ├── route.ts                       [NEW]
│       │       └── videos/route.ts                [NEW]
│       ├── client-links/
│       │   ├── route.ts                           [NEW]
│       │   └── [token]/
│       │       ├── route.ts                       [NEW]
│       │       └── analytics/route.ts             [NEW]
│       └── videos/[id]/
│           ├── route.ts                           [NEW — PATCH/DELETE]
│           └── thumbnail/route.ts                 [NEW]
├── features/
│   ├── client-view/
│   │   ├── client-page-layout.tsx                 [NEW]
│   │   ├── video-gallery.tsx                      [NEW]
│   │   ├── secure-player-modal.tsx                [NEW]
│   │   ├── watermark-overlay.tsx                  [NEW]
│   │   ├── custom-video-controls.tsx              [NEW]
│   │   └── client-view.css                        [NEW]
│   └── dashboard/
│       ├── videos/
│       │   ├── video-card.tsx                     [NEW]
│       │   └── video-edit-dialog.tsx              [NEW]
│       ├── page-builder/
│       │   ├── page-builder.tsx                   [NEW]
│       │   ├── video-picker.tsx                   [NEW]
│       │   └── page-preview.tsx                   [NEW]
│       ├── links/
│       │   └── create-link-dialog.tsx             [NEW]
│       ├── analytics/
│       │   ├── link-analytics.tsx                 [NEW]
│       │   ├── video-engagement-chart.tsx          [NEW]
│       │   └── activity-timeline.tsx              [NEW]
│       ├── sidebar-nav.tsx                        [NEW]
│       ├── upload-widget.tsx                      [MODIFY]
│       └── video-manager.tsx                      [MODIFY — deprecate]
├── lib/
│   ├── video-links/validate.ts                    [MODIFY]
│   └── fingerprint.ts                             [NEW]
├── constants/routes.ts                            [MODIFY]
prisma/schema.prisma                               [MODIFY]
```

---

## Proposed Execution Order

| # | Phase | Effort | Dependencies |
|---|-------|--------|-------------|
| 1 | Database schema + migration | Medium | None |
| 2 | Dashboard layout + sidebar | Medium | Phase 1 |
| 3 | Video management enhancements | Medium | Phase 1 |
| 4 | Client page builder + API | Large | Phase 1, 3 |
| 5 | Client-facing landing page UI | Large | Phase 1, 4 |
| 6 | Link management | Medium | Phase 4 |
| 7 | Content protection enhancements | Medium | Phase 5 |
| 8 | Analytics system | Medium | Phase 6 |
| 9 | Settings page | Small | Phase 2 |
| 10 | Design polish & animations | Medium | All above |

---

## Verification Plan

### Automated Tests
- `npm run build` — Ensure no TypeScript/build errors after each phase
- Prisma migration applies cleanly: `npx prisma migrate dev`
- API routes return correct status codes (manual curl/fetch tests)

### Manual Verification
- Upload a video → verify it appears in the library with editable metadata
- Create a client page → add videos → preview in builder
- Generate a client link → open in incognito → verify:
  - IP locking works
  - Fullscreen enforcement works
  - Watermark overlay renders
  - Heartbeat events are logged
  - Tab switch / devtools → revocation
- Check analytics dashboard shows correct watch data
- Verify responsive design on mobile viewport
