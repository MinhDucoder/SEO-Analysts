# INTENT.md — Design Contract

> **Mục đích**: file này là contract giữa bạn và AI (Claude Code) khi vibe design. Mọi prompt design page sau sẽ reference từ đây để đảm bảo consistency.
>
> **Nguồn**: rút gọn từ `BACKEND-API.md`. Khi backend doc thay đổi, sync file này.
>
> **Stack**: Next.js + Tailwind + Shadcn UI + Pencil.dev. Dual theme (dark-first).

---

## 1. Vibe Statement

**Linear meets Vercel — utilitarian-but-polished.**

- **Dense info, data-heavy.** Không decorative graphics, không hero illustrations, không gradient marketing-y. Mọi pixel phục vụ data.
- **Score là protagonist visual.** ScoreRing và classification color phải là cái user thấy đầu tiên ở mọi audit context.
- **Real-time feel.** Pipeline 6 stage (pending → crawling → analyzing → reporting → completed/failed) cần animation subtle nhưng rõ — user phải cảm được "thing is working".
- **Dark-first, light-fallback.** Design dark trước, light derive sau. Không phải light-first rồi invert.
- **Tone giữa Linear (technical, sharp, monospace cho data) và Vercel (clean, generous spacing, Inter cho UI).** TRÁNH: corporate-blue, gradient mesh, soft pastel, glassmorphism overuse.

**Reference apps (visual benchmark):**
- Linear (linear.app) — sidebar density, command palette feel.
- Vercel dashboard — card layouts, monospace numbers.
- Datadog (one screen reference cho data-density, KHÔNG copy sự lộn xộn).
- Pagespeed Insights — cách hiển thị CWV thresholds.

**Anti-references (cái KHÔNG muốn):**
- HubSpot, Mailchimp — quá corporate/marketing.
- Notion — quá whitespace, không đủ density.
- Bootstrap default — quá generic.

---

## 2. Entities (5 chính)

| Entity | Đặc điểm visual cần xử lý |
|---|---|
| **Audit** | 6 status (pipeline animation), 4 classification (color), score 0–100 (ring viz) |
| **Report** | Phức tạp nhất: 20 rule results, 6 category scores, CWV, keyword analysis |
| **ScheduledAudit** | Cron-based, active/paused state, lastRun + lastScore history |
| **User** | Profile, password, OAuth (Google), role user/admin |
| **SeoRule** | Admin-only, weight 1–10, enabled/disabled toggle |

---

## 3. Pages (15 tổng, chia 4 tier)

### Tier 1 — Warmup (đơn giản, làm trước để cảm canvas)

1. `auth-login` — email/password + Google OAuth button.
2. `auth-register` — thêm fullName + password rules hint.
3. `settings` — tabs profile/password.

### Tier 2 — Core flow

4. `audit-create` — form (URL + targetKeyword + mode toggle single/site + maxUrls).
5. `audit-list` — table với filter (status, score range, date), pagination, search.
6. `scheduled-list` — list với pause/resume action, lastRun column.

### Tier 3 — Hard pages (selling point của app)

7. **`audit-detail`** — page khó nhất:
   - Real-time progress (WS subscribe)
   - ScoreRing big (final score)
   - 6 CategoryBars (Meta/Headings/Images/Links/Performance/Technical)
   - 20 RuleResultRow (collapsible)
   - CwvCard (LCP/INP/CLS với threshold colors)
   - KeywordTable (frequency, density, badges in-title/in-h1/in-meta)
   - Actions: export PDF, share, delete
8. `audit-compare` — 2 audit side-by-side, ScoreDelta, fixed/new issues lists.
9. `admin-stats` — KPI cards (totalUsers/totalAudits/successRate/avgScore) + topDomains list + newUsersToday/auditsToday.

### Tier 4 — Polish

10. `admin-users` — table với lock/unlock action, search/filter role.
11. `admin-rules` — list 20 rules, weight slider 1–10, enabled toggle.
12. `shared-report` — public view (no auth), simplified header, CTA "Create your own audit".
13. `auth-oauth-success` — loading state khi parse `?token=` từ URL.
14. `auth-forgot-password` — single email input.
15. `auth-reset-password` — token (from URL) + newPassword + confirm.

---

## 4. Domain Components (ngoài Shadcn base)

Đây là 7 component **không có sẵn** trong Shadcn — phải design riêng trong `system.pen` frame `Domain`:

| Component | Dùng ở đâu | Ghi chú |
|---|---|---|
| `ScoreRing` | List card, detail header, compare | 0–100, color theo classification, có size variants (sm 48px / md 80px / lg 160px) |
| `StatusPipeline` | audit-detail (real-time) | 4 stage visible (crawling/analyzing/reporting/completed), pulse animation ở stage active, error state nếu failed |
| `RuleResultRow` | audit-detail (list 20 rules) | Status icon (pass/warn/fail) + name + score + weight + suggestion (collapsible) |
| `CategoryBars` | audit-detail (default view) | Horizontal bars cho 6 categories, đọc số chính xác |
| `CategoryRadar` | audit-detail (alt view) | Radar 6-axis, vibe technical/sci-fi. Toggle giữa Bars/Radar trên canvas, A/B sau khi thấy thực tế |
| `CwvCard` | audit-detail | 3 metrics (LCP ms, INP ms, CLS unitless) với threshold coloring theo Google chuẩn |
| `KeywordTable` | audit-detail | Dense table, badges cho 4 boolean (inTitle/inH1/inFirstParagraph/inMetaDescription), ngoài ra column targetKeyword highlighted với verdict |
| `ScoreDelta` | audit-compare | Pill `+5.2` (green) / `-3.1` (red), monospace, có arrow icon |

---

## 5. Color Semantics (cần resolve conflict)

Vấn đề: green xuất hiện ở 3 context khác nhau. Phải differentiate.

| Context | Color | Style | Lý do |
|---|---|---|---|
| Audit status `completed` | green-500 | Filled badge với check icon | Final state, "done" feel |
| Classification `excellent` (≥80) | green-500 | Filled ring/bar | Score quality |
| CWV `good` | green-500 | Subtle bg-green-500/10, text-green-400 | Threshold, không phải "score" |

**Resolution:** dùng cùng base hue green nhưng **differentiate by context**:
- `completed` luôn đi kèm `<CheckCircle />` icon — không thể nhầm.
- `excellent` luôn ở context score (có number 0–100 cạnh) — không thể nhầm.
- CWV `good` dùng tint nhạt (10% opacity bg) — visually subtle hơn.

### Status palette (audit pipeline)

```
pending     → neutral-500   (no animation)
crawling    → blue-500      (pulse subtle)
analyzing   → blue-500      (pulse subtle)
reporting   → blue-500      (pulse subtle)
completed   → green-500     (static, with check icon)
failed      → red-500       (static, with x icon)
```

### Classification palette (score quality)

```
excellent (≥80)  → green-500
good (60–79)     → blue-500       ← KHÔNG dùng green nhạt, phải distinct
fair (40–59)     → amber-500
poor (<40)       → red-500
```

### CWV thresholds (theo Google chuẩn)

```
good                 → green-500 với 10% bg
needs-improvement    → amber-500 với 10% bg
poor                 → red-500 với 10% bg
```

---

## 6. Typography

- **UI font:** Inter — tất cả text UI, headings, body.
- **Mono font:** JetBrains Mono hoặc Geist Mono — dùng cho:
  - Numbers (scores, deltas, percentages, ms values)
  - URLs trong audit list
  - requestId (error display)
  - Token strings (share URL, reset token)

Lý do: monospace numbers giúp data-heavy pages dễ scan column. Đây là detail Linear/Vercel làm rất tốt.

---

## 7. Layout Constraints

- **Desktop-first:** 1440x900 base, breakpoints sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1536.
- **Sidebar nav:** fixed width 240px desktop, collapsible to 64px (icons only), hidden mobile (drawer).
- **Topbar:** 56px, sticky, chứa breadcrumb + user menu + theme toggle.
- **Main content max-width:** 1280px (cho readability), padding ngang 24px.
- **Card density:** spacing-3 (12px) padding cho dense data tables, spacing-6 (24px) cho marketing/auth pages.

---

## 8. Real-time UX (đặc thù app này)

Vì backend có WebSocket cho audit progress, design phải account cho:

- **Skeleton states** ở mọi nơi data fetch async — không spinner generic.
- **Progress UI** ở audit-detail phải live update: progress bar 0–100 + stage label + pulse ở StatusPipeline stage active.
- **Optimistic UI** cho actions: pause/resume scheduled, share/revoke share — update local state ngay, rollback nếu API fail.
- **Toast notifications** cho events: audit completed (CTA "View report"), audit failed (CTA "Retry"), share copied (auto-dismiss 2s).
- **Empty states** rõ ràng: 0 audits → CTA "Create your first audit"; 0 scheduled → explain cron concept ngắn.

---

## 9. Error UX (theo RFC 7807 contract)

Backend trả `application/problem+json` với:
- `detail` — human-readable, hiển thị trong toast/inline.
- `errors[]` — validation errors per field (chỉ ở 400).
- `requestId` — luôn có, hiển thị ở error detail dialog (small, monospace) để user copy báo bug.

Specific status:
- **401** → silent auto-refresh 1 lần, retry, fail thì redirect login.
- **403** → modal giải thích (account locked / unverified / rate limit), KHÔNG auto-retry.
- **429-style** rate limit (thực ra là 400/403 với `detail` chứa "gioi han") → countdown nếu parse được "Thu lai sau Ns".
- **404** → empty state, không error toast.
- **500** → toast generic + show requestId.

---

## 10. Out of Scope (KHÔNG design ở phase này)

- Mobile-first responsive (sẽ adapt từ desktop sau).
- Animation phức tạp (chỉ pulse + fade + slide cơ bản).
- Onboarding/tutorial overlays.
- Email templates (verify, reset password).
- Marketing landing page (chưa cần, focus app).
- Internationalization UI (giữ Vietnamese hardcode trong copy).

---

## 11. Decisions còn open

> Đánh dấu `[?]` các điểm chưa quyết, sẽ resolve khi vào Phase B/C.

- [x] **Audit list view mode**: ✅ Decided — table + grid toggle. Default table (data-density), user toggle sang grid khi muốn visual scan.
- [x] **CategoryBars vs Radar**: ✅ Decided — design cả hai variant trong Domain frame, A/B trên audit-detail thực tế rồi pick.
- [?] **Sidebar logo**: text wordmark "SEO Audit" hay icon-only? Cần khi build Layout frame.
- [?] **Compare page layout**: side-by-side vs unified diff view? Side-by-side dễ design, unified denser.