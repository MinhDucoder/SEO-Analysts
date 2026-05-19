# PHASE 1 — Agent A4: Shared Report Page (Public View)

> **Self-contained spec.** Đọc cold.

---

## 0. Mission

Design 1 page **public view** (no auth):
- `shared-report` — report view khi user chia sẻ audit qua share token.

**File output**:
- `design/page/shared-report.pen`

File = clone từ `design/system-tokens.pen` foundation.

**Note**: page này KHÔNG dùng AppShell (public, no sidebar/topbar authenticated). Có simplified header riêng + CTA "Create your own audit".

---

## 1. Inputs

| File | Đọc gì |
|---|---|
| `design/INTENT.md` | §3 page #12 shared-report, §1 vibe, §6 typography |
| `design/BACKEND-API.md` | §4.6 shared endpoint, §5 ReportDetail (cùng shape audit-detail report) |
| `design/.planning/PHASE-0.md` | Foundation reference (3 backbone domain quan trọng: ScoreRing, CategoryBars) |
| `design/system-tokens.pen` | Foundation file để clone |

---

## 2. Why this agent

Shared-report là **page tier-4 polish** nhưng:
- KHÔNG cần AppShell (public, no auth) → independent từ A1's AppShell.
- KHÔNG cần 5 domain components mới của A1 (RuleResultRow/CwvCard/KeywordTable/ScoreDelta/CategoryRadar).
- **CHỈ cần** ScoreRing + CategoryBars + StatusPipeline (3 backbone Phase 0 đã có).
- Wait — CŨNG cần RuleResultRow + CwvCard + KeywordTable nếu render full report.

**Decision**: A4 dùng **simplified report view** (không full):
- ScoreRing big (final score) ✓ Phase 0 có.
- 6 CategoryBars ✓ Phase 0 có.
- Top 5 issues summary (custom render với base components Card + Badge — KHÔNG dùng RuleResultRow của A1).
- CTA section "Tạo audit cho website của bạn" (marketing).

→ A4 self-sufficient với foundation Phase 0 (no dependency trên A1). Đây là lý do A4 parallel an toàn với A1.

**Trade-off accepted**: shared-report version Phase 1 simplified. Nếu sau này cần full report (với RuleResultRow + KeywordTable), sẽ enhance ở Phase 3 (post-Phase 2 polish).

---

## 3. Backend contract slice

### 3.1 Shared report endpoint
- **Endpoint**: `GET /api/v1/shared/audits/:token` (no auth)
- **Param**: `:token` (≥8 ký tự, format `share_<random>`).
- **Response 200**: `ReportDetail` (cùng shape `audits/:id` report field).
- **Response 404**: token không tồn tại hoặc đã revoke.

### 3.2 ReportDetail (relevant fields)
```ts
{
  reportId: string;
  auditId: string;
  url: string;
  domain: string;
  finalScore: number;               // 0–100
  classification: 'excellent' | 'good' | 'fair' | 'poor';
  ruleResults: Array<RuleResult>;   // 20 rules — A4 chỉ dùng top 5 fail
  categoryScores: Array<{
    category: IssueCategory;
    score: number;
    totalRules: number;
    passed: number;
    warned: number;
    failed: number;
  }>;
  cwvMetrics: { lcpMs, inpMs, cls, performanceScore, ... };
  createdAt: string;                // ISO
}
```

### 3.3 Public no-auth UX
- KHÔNG có "Quay lại dashboard", "Logout", v.v.
- Header chỉ logo + CTA "Tạo audit miễn phí" dẫn về register page.

---

## 4. Page to deliver

### 4.1 `shared-report.pen` — page `Page/SharedReport`

**Layout structure** (vertical stack):

```
┌──────────────────────────────────────────────┐
│              Public Header (64px)            │   ← logo + CTA register
├──────────────────────────────────────────────┤
│           Hero summary section               │   ← URL + ScoreRing big
├──────────────────────────────────────────────┤
│           Category breakdown                 │   ← 6 CategoryBars
├──────────────────────────────────────────────┤
│           CWV summary (3 metrics)            │   ← simple inline text
├──────────────────────────────────────────────┤
│           Top 5 issues                       │   ← simple Card list
├──────────────────────────────────────────────┤
│           Footer CTA                         │   ← "Tạo audit cho website của bạn"
└──────────────────────────────────────────────┘
```

**Top frame**: `Page/SharedReport/Default`, width 1440, fit_content height (estimate 1800), fill `$color-bg`, layout vertical, gap 0 (sections tự padding).

#### 4.1.1 Public Header (64px sticky)

- Frame horizontal, fill_container width, height 64, padding `[$space-6]`, alignItems center, justifyContent space-between, fill `$color-bg-elevated`, stroke bottom 1 `$color-border`.
- Left: logo brand (icon gauge + wordmark "SEO Audit").
- Right: Button/Primary md "Tạo audit miễn phí →" (linkTo register).

#### 4.1.2 Hero summary section

- Frame horizontal, fill_container width, padding `$space-12`, gap `$space-12`, alignItems center, justifyContent center, fill `$color-bg`.
- **Left column** (vertical, fill_container, gap `$space-3`):
  - Eyebrow text "BÁO CÁO SEO": `$font-mono`, `$text-xs`, weight bold, letterSpacing 1, fill `$color-fg-muted`.
  - URL display large: `$font-mono`, `$text-3xl`, weight semibold, fill `$color-fg`. Truncate ellipsis nếu >50 char. Demo: "google.com".
  - Subtext "Audit ngày 15/03/2025 lúc 14:32" `$font-ui`, `$text-sm`, fill `$color-fg-muted`.
  - Spacing `$space-4`.
  - Stats row (horizontal, gap `$space-8`):
    - Stat item 1: "Issues Pass" — number large mono, label small.
    - Stat item 2: "Issues Warn".
    - Stat item 3: "Issues Fail".
- **Right column** (fit_content):
  - Component/Domain/ScoreRing instance size lg (160×160), score 87 (excellent classification).

#### 4.1.3 Category breakdown section

- Frame vertical, fill_container width, padding `[$space-12, $space-16]`, gap `$space-8`, fill `$color-bg-elevated`, stroke top + bottom 1 `$color-border`.
- Header (vertical gap `$space-1`):
  - "Category Breakdown" `$text-2xl` `$weight-semibold`.
  - Subtitle "Điểm phân chia theo 6 category SEO" `$text-sm` `$color-fg-muted`.
- Component/Domain/CategoryBars instance với 6 categories scores demo (Meta=92, Headings=85, Images=78, Links=91, Performance=72, Technical=88 — all good/excellent vibe).

#### 4.1.4 CWV summary section

- Frame vertical, fill_container width, padding `[$space-12, $space-16]`, gap `$space-6`, fill `$color-bg`.
- Header: "Core Web Vitals" `$text-2xl` `$weight-semibold` + subtitle.
- 3 metric cards inline (horizontal, gap `$space-4`, fill_container):
  - **Custom render** (KHÔNG dùng CwvCard của A1 — A4 self-contained):
  - Mỗi card: vertical, fill_container, padding `$space-6`, fill `$color-bg-elevated`, stroke 1 `$color-border`, radius `$radius-md`.
  - Children: label + value mono large + threshold badge.
  - Demo:
    - LCP: 1.8s, threshold "Good" (green tint bg).
    - INP: 180ms, threshold "Good" (green tint bg).
    - CLS: 0.05, threshold "Good" (green tint bg).

#### 4.1.5 Top 5 issues section

- Frame vertical, fill_container, padding `[$space-12, $space-16]`, gap `$space-6`, fill `$color-bg-elevated`, stroke top 1 `$color-border`.
- Header: "Top 5 Issues to Fix" `$text-2xl` `$weight-semibold` + subtitle "Vấn đề ưu tiên giải quyết để cải thiện điểm".
- List vertical gap `$space-3`:
  - 5 item, mỗi item là frame horizontal + padding `$space-4` + fill `$color-bg` + radius `$radius-md` + stroke 1 `$color-border`:
    - Status icon 24×24 (warn `$color-class-fair` hoặc fail `$color-class-poor`).
    - Vertical content fill_container:
      - Issue name `$text-sm` `$weight-medium` (ví dụ "Meta description quá ngắn").
      - Issue description `$text-xs` `$color-fg-muted` (ví dụ "Recommended length: 150-160 characters").
    - Right: Score pill mono + weight indicator.

Demo data 5 issues (varied status):
1. WARN — "Title tag dài quá 60 ký tự" — score 65, weight 8.
2. WARN — "Một số ảnh thiếu alt text" — score 70, weight 7.
3. FAIL — "Heading H1 không có target keyword" — score 30, weight 9.
4. WARN — "Internal links chưa optimal" — score 68, weight 6.
5. FAIL — "Robots.txt block một số resources" — score 25, weight 5.

#### 4.1.6 Footer CTA section

- Frame vertical, fill_container, padding `$space-16`, gap `$space-6`, alignItems center, justifyContent center, fill `$color-bg`.
- Title "Muốn audit cho website của bạn?" `$text-3xl` `$weight-bold` textAlign center.
- Subtitle "Tạo tài khoản miễn phí và audit không giới hạn." `$text-base` `$color-fg-muted` textAlign center.
- 2 button row (horizontal, gap `$space-3`):
  - Primary md "Tạo tài khoản miễn phí".
  - Outline md "Xem demo audit khác".
- Footer fineprint `$text-xs` `$color-fg-subtle`: "© 2026 SEO Audit. Báo cáo này được chia sẻ công khai bởi user @anonymous."

---

## 5. State variants

Build 3 frame top-level cạnh nhau:

1. **`Page/SharedReport/Default`** — full report như §4 (excellent score 87).
2. **`Page/SharedReport/LowScore`** — biến thể với score 42 (fair classification):
   - ScoreRing fill `$color-class-fair` (amber).
   - Categories scores varied lower.
   - Top 5 issues nhiều fail hơn warn.
3. **`Page/SharedReport/Error/NotFound`** — token revoked/invalid:
   - Public Header (giữ nguyên).
   - Center content vertical gap `$space-6`:
     - Icon ban large 96×96 `$color-fg-muted`.
     - Title "Báo cáo không khả dụng" `$text-3xl`.
     - Description "Link chia sẻ này đã bị thu hồi hoặc không tồn tại." `$text-base` `$color-fg-muted`.
     - Button "Tạo audit của riêng bạn" primary.

---

## 6. Anti-patterns — refuse

- ❌ Sidebar / topbar authenticated style (public page, no nav).
- ❌ Logout button, user profile menu (no auth).
- ❌ Edit/Delete actions trên report (public read-only).
- ❌ Marketing copy quá nhiều ("Giải pháp #1!" — chỉ 1 CTA section ở cuối, functional).
- ❌ Email signup form inline (CTA dẫn sang register page, không inline).
- ❌ Comments/social-share feature (out of scope).
- ❌ Pagination cho rule list (chỉ top 5).

---

## 7. Workflow

1. **Setup worktree**:
   ```bash
   git worktree add .claude/worktrees/design-phase-1-a4 -b design/phase-1-a4
   cd .claude/worktrees/design-phase-1-a4
   ```
2. **Clone foundation**:
   ```bash
   cp design/system-tokens.pen design/page/shared-report.pen
   git add design/page/shared-report.pen
   git commit -m "design(phase-1-a4): clone foundation for shared-report"
   ```
3. Open file → get_editor_state.
4. Hide foundation frames (enabled false).
5. Build 3 state frames cạnh nhau theo §4 + §5.
6. Screenshot mỗi state full-height.
7. Commit atomic.

---

## 8. Done checklist

### Page sections (Default state)
- [ ] Public Header với logo + CTA register button.
- [ ] Hero summary với URL + ScoreRing lg + stats row.
- [ ] Category breakdown với CategoryBars instance.
- [ ] CWV summary với 3 custom metric card.
- [ ] Top 5 issues list với 5 item.
- [ ] Footer CTA với title + 2 button.

### State variants
- [ ] `Default` (excellent score 87).
- [ ] `LowScore` (fair score 42, biến thể color).
- [ ] `Error/NotFound` (token revoke/invalid).

### Cross
- [ ] Foundation frames hidden.
- [ ] Component refs cho ScoreRing + CategoryBars (Phase 0 backbone).
- [ ] Custom render cho CWV cards (no dependency A1).
- [ ] Custom render cho issue list (no RuleResultRow dependency).
- [ ] No anti-pattern (no nav auth, no edit actions).
- [ ] Vietnamese copy natural.

### Hand-off
- [ ] `.planning/PHASE-1-A4-DONE.md` với 3 screenshot link (full-height per state).
- [ ] Branch push.
- [ ] PR: `design(phase-1-a4): shared-report public view`.

---

## 9. Worktree + commit convention

- **Worktree path**: `.claude/worktrees/design-phase-1-a4/`
- **Branch**: `design/phase-1-a4`
- **Commit splits**:
  1. `design(phase-1-a4): clone foundation for shared-report`
  2. `design(phase-1-a4): hide foundation frames`
  3. `design(phase-1-a4): add public header + hero summary section`
  4. `design(phase-1-a4): add category breakdown + CWV summary sections`
  5. `design(phase-1-a4): add top 5 issues + footer CTA sections`
  6. `design(phase-1-a4): add LowScore + NotFound state variants`
  7. `design(phase-1-a4): hand-off doc + screenshots`
