# PHASE 3 — Polish Plan (4 tasks)

> Bổ sung 4 nhóm artifact để FE devs có đầy đủ context implement. Tổng ~40 min via direct JSON edit (bypass pencil persist).
>
> **Branch**: `feat/web-fresh` HEAD `80afb9a`
> **Foundation**: `design/system-tokens.pen` 765KB MD5 `bea846577e4851d3925a66992f89d65e`

---

## Tổng quan

| Task | Goal | Effort | Approach | Commit prefix |
|---|---|---|---|---|
| A | Toast component (4 variants) | 5 min | Append to Base frame | `design(phase-3a):` |
| B | 3 Empty states | 10 min | 3 new top-level frames | `design(phase-3b):` |
| C | 2 Modal dialogs | 10 min | 2 new top-level frames | `design(phase-3c):` |
| D | StatusPipeline + 4 AuditDetail in-progress/failed | 15 min | Component + 4 page state frames | `design(phase-3d):` |

**Sequence**: A → D-prep (StatusPipeline) → D → B → C
**Tools**: Direct JSON edit (Python scripts `/tmp/append_phase3_{a,b,c,d}.py`)
**Verification each task**: JSON valid + MD5 changed + grep marker present + commit atomic

---

## Task A — Toast component (4 variants)

### Goal
4 reusable Toast components (Success/Warning/Error/Info) in `Base` frame. Used cho notification: "Audit completed", "Share copied", "Rate limit countdown", etc.

### Structure
```
Component/Toast/Success (reusable)
  Frame horizontal, fit_content, padding [12,16], gap 12, radius md
  Background: $color-class-excellent (10% opacity) + stroke $color-class-excellent
  Children:
    - icon_font lucide check-circle (20×20, fill $color-class-excellent)
    - Frame vertical fill_container gap 2:
        - Text title (sm semibold)
        - Text description (xs muted)
    - icon_font lucide x (16×16 close, fill $color-fg-muted)
```

4 variants only differ in:
- Background color (excellent/fair/poor/good)
- Stroke color (same)
- Icon name (check-circle / triangle-alert / circle-x / info)

### Where
Append to `Base` frame (id `w7tVO`) children, after existing inputs/cards/badges row. Create new sub-row "Toast group".

### Verification
```
grep -c '"name": "Component/Toast/' design/system-tokens.pen  # → 4
```

---

## Task B — 3 Empty states

### Goal
3 new top-level frames (variant state of existing list pages):
- `Page/AuditList/Empty`
- `Page/ScheduledList/Empty`
- `Page/AdminUsers/Empty` (search no result variant)

### Common structure
Same layout horizontal Sidebar + MainCol as Default. MainCol content thay vì table:
```
EmptyContent frame (vertical center, padding 64, gap 24):
  - icon_font lucide (large 96×96 muted)
  - Title text 2xl semibold
  - Description text base muted
  - CTA Primary button
```

### Per-page specs

| Page | Icon | Title | Description | CTA |
|---|---|---|---|---|
| AuditList/Empty | search-x | "Chưa có audit nào" | "Bắt đầu phân tích SEO website đầu tiên của bạn." | "+ Tạo audit đầu tiên" |
| ScheduledList/Empty | calendar-x | "Chưa có lịch audit" | "Tự động hóa audit định kỳ với cron schedule." | "+ Tạo lịch đầu tiên" |
| AdminUsers/Empty | user-x | "Không tìm thấy user nào" | "Thử thay đổi từ khóa tìm kiếm hoặc bỏ filter." | "Xóa bộ lọc" |

### Where
Position cạnh existing pages (x offset +1500 each), y same as parent page.

### Verification
3 new frame names + sidebar wrap structure intact.

---

## Task C — 2 Modal dialogs

### Goal
2 new top-level frames showing audit-detail modal overlays:
- `Page/AuditDetail/Modal/Share` — share link với token + copy/revoke actions
- `Page/AuditDetail/Modal/Delete` — confirm delete audit

### Common structure
Full-screen frame (1440×900, bg overlay #0A0A0BCC) + centered modal card (520w):
```
Modal frame (vertical center center, padding 48):
  - Backdrop bg fill #0A0A0BCC absolute
  - Card 480w (vertical, padding 32, gap 24, radius lg, bg $color-bg-elevated):
      - Header: icon + title + close X
      - Body: form content
      - Actions: button row right-align
```

### Per-modal specs

#### Share modal
- Icon: share-2 (24, fill primary)
- Title: "Chia sẻ báo cáo audit"
- Body:
  - Description "Người có link sẽ xem được báo cáo (read-only, no auth)"
  - Input/Default disabled showing shareUrl (mono): "https://app.seo/shared/share_abc123def456"
  - Button outline "Copy link" (icon copy left)
  - Helper "Link tự động hết hạn sau 30 ngày. Có thể thu hồi bất kỳ lúc nào."
- Actions: button outline "Thu hồi link" (destructive subtle) + button primary "Đóng"

#### Delete confirm
- Icon: alert-triangle (24, fill $color-class-poor)
- Title: "Xóa audit này?"
- Body:
  - Description bold "Hành động không thể hoàn tác."
  - Helper "Audit và báo cáo sẽ bị xóa vĩnh viễn. Các link share đang active sẽ bị revoke."
  - Mono small "Audit ID: b0000000-0000-0000-0000-000000000001"
- Actions: button outline "Hủy" + button destructive "Xóa audit"

### Where
Position cạnh AuditDetail/Completed (x=5500), x offset to right of completed page.

### Verification
2 new modal frames with overlay + card structure.

---

## Task D — StatusPipeline + 4 AuditDetail states

### Goal
- Build `Component/StatusPipeline` reusable (was Phase 0 backbone spec, never persisted)
- Build 4 new AuditDetail state frames showing real-time progress

### Sub-task D1: StatusPipeline component

#### Structure
6-step horizontal pipeline với connector lines:
```
Frame horizontal, fit_content, gap 0:
  Step 1 (Pending neutral outline circle 24×24 + label "Pending")
  Connector (line 24 thickness 2 fill $color-border)
  Step 2 (Crawling active blue filled + pulse ring outer + label)
  Connector
  Step 3 (Analyzing pending)
  Connector
  Step 4 (Reporting pending)
  Connector
  Step 5 (Completed pending)
  Connector
  Step 6 (Failed - hidden by default)
```

State variants achieved via instance descendants override (color/icon per step).

#### Where
Append to `Domain` frame (id `tGelB`) children. Add demo instance showing "in-progress at analyzing".

### Sub-task D2: 4 AuditDetail states

#### Common structure
Same wrap (Sidebar + MainCol + Topbar) as `AuditDetail/Completed`. MainCol content differs:

| State | Hero | Body content |
|---|---|---|
| InProgress/Crawling | Skeleton ScoreRing + URL + status badge "Đang crawl" (blue) | StatusPipeline (active=Crawling) + Progress bar 25% + "Đang fetch HTML..." message + Ghost cards skeleton |
| InProgress/Analyzing | Same skeleton hero | StatusPipeline (active=Analyzing) + Progress 60% + "Đang chạy 20 SEO rules..." |
| InProgress/Reporting | Same skeleton hero | StatusPipeline (active=Reporting) + Progress 90% + "Đang tổng hợp báo cáo..." |
| Failed | Skeleton ScoreRing + URL + status badge "Thất bại" (red) | StatusPipeline (Analyzing=failed) + Error card (icon x large + "Audit thất bại" + errorMessage + 2 buttons "Re-run" + "Báo lỗi" with requestId mono) |

#### Where
Position cạnh `AuditDetail/Completed` + Modals. x offset to keep horizontal flow.

### Verification
- 1 StatusPipeline component reusable
- 4 new frame names AuditDetail/InProgress/* + Failed
- StatusPipeline ref present in each in-progress/failed page

---

## Final foundation expectations

After all 4 tasks done:
- **Components**: 22 + 1 (Toast still 4 variants but as 4 reusable, +1 StatusPipeline) = **27 reusable** (22 existing + 4 Toast + 1 StatusPipeline = 27)
- **Pages**: 35 + 3 (Empty) + 2 (Modal) + 4 (InProgress/Failed) = **44 page state frames**
- **Total top-level frames**: 39 + 9 = **48**
- **File size**: ~765KB → ~900KB estimate

## Risk + mitigation

| Risk | Mitigation |
|---|---|
| JSON edit break syntax | Run `python3 -c "import json; json.load(open('file'))"` after each task |
| Component IDs collide | Use unique prefix per task (toastA*, pipeD*, etc) |
| Pencil server stale after fix | User reload VS Code Pencil tab post-final commit |
| Sidebar render misalign in new pages | Reuse `make_sidebar()` helper from `/tmp/fix_appshell_wrap.py` |

## Acceptance criteria (when ALL done)

- [ ] 4 Toast variants in Base frame, all reusable, persisted
- [ ] 3 Empty state pages with sidebar + correct CTAs
- [ ] 2 Modal pages with overlay + card structure
- [ ] StatusPipeline component reusable + 4 AuditDetail in-progress/failed states wire it
- [ ] All JSON valid after each commit
- [ ] 4 atomic commits with prefixed messages
- [ ] STATE.md final updated reflecting 44 page state frames
