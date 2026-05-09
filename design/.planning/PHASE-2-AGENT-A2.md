# PHASE 2 — Agent A2: Audit Detail (HEAVIEST PAGE)

> **Self-contained spec.** Đọc cold. Page **khó nhất** trong toàn project — 1 agent dedicated.

---

## 0. Mission

Design 1 page với **6 state phức tạp**:
- `audit-detail` — real-time progress + report đầy đủ (ScoreRing big + 6 CategoryBars + 20 RuleResultRow + CwvCard + KeywordTable + actions).

**File output**: `design/page/audit-detail.pen`.

---

## 1. Inputs

| File | Đọc gì |
|---|---|
| `design/INTENT.md` | §3 page #7 (most complex), §1 vibe, §8 real-time UX, §9 error UX |
| `design/BACKEND-API.md` | §4.2 audits endpoints (GET /:id, /status, /wait, /export, /share), §5 AuditDetail + ReportDetail FULL, §8 WebSocket events |
| `design/.planning/PHASE-0.md` | ScoreRing/StatusPipeline/CategoryBars (3 backbone) |
| `design/.planning/PHASE-1-AGENT-A1.md` | RuleResultRow/CwvCard/KeywordTable + AppShell |
| `design/.planning/PHASE-1-A1-DONE.md` | Component IDs để wire |
| `design/system-tokens.pen` | Foundation file |

---

## 2. Backend contract slice

### 2.1 GET audit detail
- `GET /api/v1/audits/:id` → `{ audit: AuditDetail, report: ReportDetail | null }`.
- `report = null` khi status != 'completed'.

### 2.2 GET status (polling alternative)
- `GET /api/v1/audits/:id/status` → `{ auditId, status, progress, stage, seoScore? }`.

### 2.3 WebSocket events
- `audit:subscribe` emit với `{ auditId }` → `audit:progress` events.
- `audit:progress` payload: `{ auditId, progress?: 0..100, stage?: 'crawling'|'analyzing'|'reporting', message? }`.
- `audit:completed` → refetch GET /:id.
- `audit:failed` → show error.

### 2.4 Other actions
- `DELETE /api/v1/audits/:id` → 204.
- `GET /audits/:id/export` → 302 redirect PDF stream.
- `POST /audits/:id/share` → `{ shareToken, shareUrl }`.
- `DELETE /audits/:id/share` → 204.

### 2.5 Report shape (proto-style enums!)
```ts
{
  finalScore: number;               // 0-100
  classification: 'excellent' | 'good' | 'fair' | 'poor';
  ruleResults: Array<{
    ruleId, ruleName, status: 'CHECK_STATUS_PASS'|'WARN'|'FAIL', score, weight, category, message, suggestion?
  }>;
  categoryScores: Array<{ category, score, totalRules, passed, warned, failed }>;
  cwvMetrics: { lcpMs, inpMs, cls, performanceScore, ... };
  keywords: Array<{ keyword, frequency, densityPercent, inTitle, inH1, inFirstParagraph, inMetaDescription, rank }>;
  targetKeyword?: { ... + isStuffing, verdict };
}
```

---

## 3. Page sections (Default Completed state)

**Layout**: AppShell wrapper.

### 3.1 Topbar slot — breadcrumb + actions
- Breadcrumb: `Audits / google.com`.
- Actions slot: 4 button:
  - Outline "Export PDF" (icon download).
  - Outline "Share" (icon share-2).
  - Outline "So sánh" (icon git-compare) — link audit-compare.
  - Destructive ghost icon trash.

### 3.2 Hero summary section (full width, padding `$space-8`)
- Horizontal layout, gap `$space-12`, alignItems center.
- **Left**: vertical gap `$space-3`:
  - Eyebrow "BÁO CÁO" mono xs uppercase muted.
  - URL large mono `$text-3xl` semibold.
  - Sub-row: Audit ID mono xs muted + ngày giờ + crawler type badge (cheerio/playwright).
  - Stats row: 3 stat (Pass green / Warn amber / Fail red) — số rule + label.
  - Action row: button outline "Re-run audit" + dropdown "..." (more).
- **Right**: ScoreRing lg (160×160) classification color + classification label below "Excellent" big.

### 3.3 Tabs section (sticky)
3 tab horizontal:
- "Tổng quan" (active default — render section 3.4-3.6).
- "Rule Details" (render section 3.7).
- "Keywords" (render section 3.8).

### 3.4 Category Breakdown card (Tab Tổng quan)
- Card với header "Category Breakdown" + subtitle.
- Toggle group right: "Bars" / "Radar" (Bars active default).
- Content: CategoryBars component instance (Bars view) hoặc CategoryRadar (Radar view alt).
- Below: 6 mini stat (1 per category): "Meta 4/4 pass • 0 warn • 0 fail".

### 3.5 CWV card (Tab Tổng quan)
- CwvCard component instance từ Phase 1 A1.

### 3.6 Top Issues snapshot (Tab Tổng quan)
- Card "Top 5 Issues" với link "Xem tất cả 20 rule" → switch sang tab Rule Details.
- 5 RuleResultRow instance (collapsed) varied status (mix warn + fail).

### 3.7 Rule Details list (Tab Rule Details)
- Card với filter bar: search rule name + status filter (All/Pass/Warn/Fail) + sort (weight/score/category).
- 20 RuleResultRow instance (collapsed default, demo 3-4 expanded).
- Group by category nếu sort=category (6 group header).

### 3.8 Keywords table (Tab Keywords)
- 2 sub-section:
  - **Target keyword highlight card** (nếu có targetKeyword): special card với keyword text + verdict badge + 4 bool indicator + "Stuffing detected" warning nếu isStuffing.
  - **All keywords table**: KeywordTable component instance từ Phase 1 A1, render 20 keywords data.

---

## 4. State variants (build cạnh nhau frames)

1. **`Page/AuditDetail/Completed`** — full report như §3 (score 87 excellent).
2. **`Page/AuditDetail/InProgress/Crawling`** — không có report:
   - Hero: ScoreRing placeholder skeleton + URL + status badge "Đang crawl".
   - Below: StatusPipeline component (active=crawling) + progress bar 25% với "Đang fetch HTML..." message.
   - Ghost cards skeleton cho Category/CWV/Issues sections.
3. **`Page/AuditDetail/InProgress/Analyzing`** — StatusPipeline active=analyzing, progress 60%, message "Đang chạy 20 SEO rules...".
4. **`Page/AuditDetail/InProgress/Reporting`** — StatusPipeline active=reporting, progress 90%, message "Đang tổng hợp báo cáo...".
5. **`Page/AuditDetail/Failed`** — không có report:
   - Hero: ScoreRing skeleton + URL + status badge "Thất bại" red.
   - StatusPipeline với analyzing=failed.
   - Error card center: icon x large + "Audit thất bại" title + errorMessage từ AuditDetail + 2 button "Re-run" primary + "Báo lỗi" outline (với requestId hiển thị mono xs).
6. **`Page/AuditDetail/LowScore`** — biến thể Completed nhưng score 32 poor:
   - Hero ScoreRing red + classification "Poor".
   - Category bars nhiều red/amber.
   - Top issues toàn fail.

### Toast/dialog states (build trong frame riêng)
- `Page/AuditDetail/Modal/Share` — modal sau click Share button: shareUrl input + copy button + revoke button + QR code placeholder.
- `Page/AuditDetail/Modal/Delete` — confirm delete: title + warning text + Cancel outline + Destructive "Xóa".
- `Page/AuditDetail/Toast/Completed` — appear khi WS audit:completed: toast success "Audit hoàn thành" + CTA "Xem báo cáo".

---

## 5. Cross-cutting

- Real-time UX: progress bar + StatusPipeline + skeleton cho data chưa có.
- Optimistic UI: actions (delete, share) update local state ngay.
- Vietnamese copy.
- Mỗi state ≥ 1 frame top-level (8 frames + 3 modal/toast = 11 total).

---

## 6. Anti-patterns

- ❌ Hiển thị 0 score khi đang in-progress (dùng skeleton/placeholder).
- ❌ Polling visible (FE WS subscribe, không show "Refreshing every 5s").
- ❌ Modal cho rule detail (collapsible inline).
- ❌ Bar chart 6 category với pie chart (dùng CategoryBars).

---

## 7. Workflow

1. Setup worktree `design-phase-2-a2`, branch `design/phase-2-a2`.
2. Clone foundation: `cp design/system-tokens.pen design/page/audit-detail.pen`.
3. Hide foundation frames.
4. Build 11 frame top-level (page states + modals).
5. Mỗi frame trong batch_design ≤25 ops, tách nhiều call.
6. Screenshot mỗi state.
7. Commit atomic theo state group:
   - `design(phase-2-a2): clone foundation + hide frames`
   - `design(phase-2-a2): add audit-detail Completed state (full report)`
   - `design(phase-2-a2): add 3 InProgress states (crawling/analyzing/reporting)`
   - `design(phase-2-a2): add Failed + LowScore states`
   - `design(phase-2-a2): add Share/Delete modals + Completed toast`
   - `design(phase-2-a2): hand-off doc + screenshots`

---

## 8. Done checklist

- [ ] 11 frame top-level (8 page state + 3 modal/toast).
- [ ] Completed state: hero ScoreRing + tabs + 3 sub-section (Category/CWV/Top issues).
- [ ] Rule Details tab: 20 RuleResultRow rendering.
- [ ] Keywords tab: KeywordTable + targetKeyword highlight card.
- [ ] 3 InProgress states với StatusPipeline đúng stage + progress + message.
- [ ] Failed state có errorMessage + requestId.
- [ ] Modals và toast wired đúng từ Phase 0/1 components.
- [ ] AppShell + sidebar active "Audits".
- [ ] No anti-pattern.
- [ ] `.planning/PHASE-2-A2-DONE.md` với 11 screenshot links + known gaps.
- [ ] Branch push + PR `design(phase-2-a2): audit-detail (heavy page)`.
