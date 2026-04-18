# 31 — Page Specs

> **Scope:** Chi tiết từng page Next.js: layout, component, API calls, state, edge cases.
>
> **Format:** Mỗi page là 1 section với cấu trúc: mô tả ngắn → layout → API/WS → component tree → states → edge cases.

---

## 0. Bảng tổng quan page

| Route | Page | Loại | Doc section |
|---|---|---|---|
| `/` | Landing | Public | §1 |
| `/login` | Đăng nhập | Public | §2 |
| `/register` | Đăng ký | Public | §3 |
| `/verify-email/:token` | Verify email | Public | §4 |
| `/forgot-password` | Quên mật khẩu | Public | §5 |
| `/reset-password/:token` | Reset mật khẩu | Public | §6 |
| `/oauth-success` | Google OAuth callback | Public | §7 |
| `/dashboard` | Dashboard | User | §8 |
| `/audits` | Danh sách audit | User | §9 |
| `/audits/new` | Tạo audit mới | User | §10 |
| `/audits/:id` | Chi tiết audit | User | §11 |
| `/audits/:id/compare` | So sánh 2 audit | User | §12 |
| `/settings/profile` | Hồ sơ | User | §13 |
| `/settings/security` | Bảo mật (đổi password) | User | §14 |
| `/admin/users` | Quản lý user | Admin | §15 |
| `/admin/rules` | Quản lý rule weight | Admin | §16 |
| `/admin/stats` | Thống kê nền tảng | Admin | §17 |
| `/shared/:token` | Public share view | Public | §18 |

---

## 1. Landing `/`

**Mục đích:** Giới thiệu sản phẩm, CTA đăng ký + demo.

**Layout:** No sidebar, no header sticky. Full-width hero + sections.

**Cấu trúc:**
```
<Hero>
  Headline: "Audit SEO cho website Việt — miễn phí, nhanh, đầy đủ"
  Sub: "21 rule, Core Web Vitals, phân tích từ khoá Việt/Anh"
  CTA: [Đăng ký miễn phí] [Xem demo]
</Hero>

<HowItWorks>
  3 bước: Nhập URL → Đợi 10-30s → Xem báo cáo + PDF
</HowItWorks>

<Features>
  Card grid: 21 SEO rules, Core Web Vitals, Vietnamese keyword, PDF export, Share link, Admin panel
</Features>

<CompetitorComparison>
  Table: Ahrefs $99/mo — SEMrush $139 — Moz $99 — Ours Free
</CompetitorComparison>

<Footer>
  Links, copyright, small print
</Footer>
```

**API calls:** None. Static content.

**Edge cases:**
- Nếu đã login (có refresh cookie hợp lệ), header hiển thị "Vào Dashboard" thay vì "Đăng nhập".

---

## 2. Đăng nhập `/login`

**Layout:** Centered card (max-width 400px), logo trên, form dưới.

**Form fields:**
- Email (input email)
- Password (input password)
- Checkbox "Ghi nhớ đăng nhập" (ẩn, refresh cookie luôn 7d)
- Link "Quên mật khẩu?"
- Button primary "Đăng nhập"
- Divider "hoặc"
- Button OAuth "Đăng nhập với Google"
- Link "Chưa có tài khoản? Đăng ký"

**Validation (zod):**
```typescript
const schema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});
```

**API:**
- `POST /auth/login` → lưu accessToken vào Zustand, refresh cookie auto set.
- Success → `router.push('/dashboard')`.

**States:**
- `idle` → form normal.
- `submitting` → button disabled + spinner.
- `error` → toast + inline message dưới form.

**Errors cụ thể:**
- 401 invalid credentials → "Email hoặc mật khẩu không đúng"
- 403 not verified → "Vui lòng verify email trước khi đăng nhập" + button "Gửi lại email verify"
- 403 locked → "Tài khoản đã bị khoá. Liên hệ admin"
- 403 rate limit → "Quá nhiều lần thử. Thử lại sau X giây"

---

## 3. Đăng ký `/register`

**Layout:** Như `/login`.

**Form fields:**
- Full name (text)
- Email
- Password + confirm password
- Checkbox "Đồng ý với Điều khoản"
- Button "Đăng ký"
- Link "Đã có tài khoản? Đăng nhập"

**Validation:**
```typescript
const schema = z.object({
  fullName: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự'),
  confirmPassword: z.string(),
  agreed: z.literal(true, { errorMap: () => ({ message: 'Vui lòng đồng ý' }) }),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Mật khẩu không khớp',
  path: ['confirmPassword'],
});
```

**API:** `POST /auth/register`.

**Success flow:**
- 201 → hiển thị message "Đã gửi email verify tới {email}. Vui lòng kiểm tra hộp thư."
- **Dev mode:** response có `verifyToken` → button "Verify ngay (dev)" để test không cần email.

**Errors:**
- 409 email existed → "Email đã được đăng ký"
- 403 rate limit.

---

## 4. Verify email `/verify-email/:token`

**Layout:** Centered card với icon.

**Behavior:**
- Trên mount, tự gọi `POST /auth/verify-email { token }`.
- Loading: spinner + "Đang xác nhận..."
- Success: icon check + "Xác nhận thành công!" + button "Đăng nhập"
- Error 400 (token invalid/expired): icon X + "Token không hợp lệ hoặc đã hết hạn" + button "Gửi lại email verify" (gọi `/auth/forgot-password` endpoint thay thế — hoặc thêm `resend-verify` endpoint mới).

---

## 5. Quên mật khẩu `/forgot-password`

**Form:**
- Email (input)
- Button "Gửi link reset"

**Behavior:**
- `POST /auth/forgot-password { email }`.
- Luôn trả 200 (không leak email tồn tại).
- Hiển thị: "Nếu email tồn tại, link reset sẽ được gửi tới hộp thư."

---

## 6. Reset password `/reset-password/:token`

**Form:**
- New password + confirm.
- Button "Đặt mật khẩu mới"

**API:** `POST /auth/reset-password { token, newPassword }`.

**Success:** redirect `/login` + toast "Đã đặt lại mật khẩu. Vui lòng đăng nhập."

**Error 400:** "Link không hợp lệ hoặc đã hết hạn. Xin vui lòng yêu cầu lại."

---

## 7. OAuth callback `/oauth-success?token=<jwt>`

**Behavior:** Xem [30-frontend-architecture.md §5.4](30-frontend-architecture.md). Redirect → `/dashboard`.

---

## 8. Dashboard `/dashboard`

**Mục đích:** Overview cá nhân — audit gần nhất, điểm trung bình, quick action.

**Layout:** Sidebar + Header + Main area.

**Cấu trúc chính:**

```
<Header>
  Page title: "Dashboard"
  Quick action: [+ New Audit]
</Header>

<StatCardsGrid columns={4}>
  <StatCard>
    Label: "Audit tháng này"
    Value: 12
    Trend: "+3 so với tháng trước" (green)
  </StatCard>
  <StatCard>
    Label: "Điểm SEO trung bình"
    Value: 78
    Trend: "+5 so với tháng trước"
  </StatCard>
  <StatCard>
    Label: "Issue quan trọng"
    Value: 23
    Trend: "-7 đã fix"
  </StatCard>
  <StatCard>
    Label: "PDF đã xuất"
    Value: 8
  </StatCard>
</StatCardsGrid>

<TwoColumnGrid>
  <RecentAuditsCard>
    Title: "Audit gần đây"
    List 5 audit mới nhất (url, domain, score badge, status, thời gian)
    Link "Xem tất cả" → /audits
  </RecentAuditsCard>

  <ScoreChartCard>
    Title: "Điểm SEO theo thời gian"
    Line chart 30 ngày gần nhất
  </ScoreChartCard>
</TwoColumnGrid>

<WorstIssuesCard>
  Title: "Issue phổ biến nhất"
  Bar chart: rule FAIL nhiều nhất trong audit của user
</WorstIssuesCard>
```

**API calls:**
- `GET /audits?limit=5` — recent audits
- `GET /audits?dateFrom={30d ago}&status=completed` — score chart data
- (Không có endpoint tổng hợp issues → compute client side từ audits[].ruleFails hoặc thêm endpoint `/stats/my` cho user)

**Empty state (user chưa có audit):**
- Illustration + "Chưa có audit nào. Tạo audit đầu tiên để bắt đầu!"
- CTA [+ New Audit]

---

## 9. Danh sách audit `/audits`

**Mục đích:** Quản lý toàn bộ audit của user với filter/search.

**Layout:**

```
<PageHeader>
  Title: "Audit của tôi"
  Action: [+ New Audit]
</PageHeader>

<FilterBar>
  <SearchInput placeholder="Tìm theo URL hoặc domain..." debounce={300} />
  <StatusFilter multi>completed, crawling, failed, pending</StatusFilter>
  <ScoreRangeSlider min={0} max={100} />
  <DateRangePicker />
  <Button ghost>Xoá filter</Button>
</FilterBar>

<AuditTable>
  Columns: URL | Domain | Status | Score | Mode | Tạo lúc | Action
  Rows: link tới /audits/:id

  Row:
    URL: Ellipsis + tooltip
    Domain: badge
    Status: StatusBadge (pending=gray, crawling/analyzing=blue, completed=green, failed=red)
    Score: ScoreBadge (classification-colored)
    Mode: "Single" | "Site (N URL)"
    Tạo lúc: "2 giờ trước" (dayjs relative)
    Action: [...] menu → View, Export PDF, Share, Delete

  Empty state: "Không có audit khớp filter. Thử đổi filter."
</AuditTable>

<Pagination page={page} total={total} onChange={setPage} />
```

**URL state:**

Filter + page đẩy vào URL searchParams để shareable + back button hoạt động:
```
/audits?page=2&status=completed&scoreMin=60
```

Dùng `useSearchParams` + `router.push` hoặc `nuqs` library.

**API:** `GET /audits?page&limit&search&status&scoreMin&scoreMax&dateFrom&dateTo`

**Hooks:**
```typescript
const params = useSearchParams();
const filters = parseFilters(params);
const { data, isLoading } = useAudits(filters);
```

**Real-time update:** Nếu có audit `pending/crawling/analyzing` trong list, subscribe WS cho các auditId đó, update status/score khi có event.

---

## 10. Tạo audit `/audits/new`

**Mục đích:** Form nhập URL + options, submit → enqueue.

**Layout:**

```
<PageHeader>
  Title: "Tạo Audit mới"
  Breadcrumb: Audits > New
</PageHeader>

<Card padding="lg">
  <FormGroup>
    <Label>URL website</Label>
    <UrlInput placeholder="https://example.com" autoFocus />
    <Hint>Nhập URL đầy đủ bao gồm https://</Hint>
  </FormGroup>

  <FormGroup>
    <Label>Chế độ</Label>
    <RadioGroup value={mode} onChange={setMode}>
      <Radio value="single">
        <Title>Single URL</Title>
        <Desc>Audit 1 trang duy nhất (~10-30s)</Desc>
      </Radio>
      <Radio value="site">
        <Title>Site-wide</Title>
        <Desc>Audit toàn bộ site qua sitemap (~5-30 phút)</Desc>
      </Radio>
    </RadioGroup>
  </FormGroup>

  {mode === 'site' && (
    <FormGroup>
      <Label>Tối đa số URL</Label>
      <NumberInput value={maxUrls} min={10} max={500} step={10} />
      <Hint>Giới hạn 500 URL. Nhiều URL → thời gian lâu hơn.</Hint>
    </FormGroup>
  )}

  <FormGroup>
    <Label>Target keyword <span className="text-muted">(tuỳ chọn)</span></Label>
    <Input placeholder="vd: seo tiếng việt" />
    <Hint>Dùng để phân tích mật độ + vị trí keyword + verdict</Hint>
  </FormGroup>

  <FormActions>
    <Button variant="ghost" onClick={() => router.back()}>Huỷ</Button>
    <Button type="submit" loading={isSubmitting}>Bắt đầu audit</Button>
  </FormActions>
</Card>
```

**Validation:**
```typescript
const schema = z.object({
  url: z.string().url().refine(u => /^https?:\/\//.test(u), 'URL phải bắt đầu bằng http:// hoặc https://'),
  mode: z.enum(['single', 'site']),
  maxUrls: z.number().int().min(10).max(500).optional(),
  targetKeyword: z.string().max(255).optional(),
});
```

**API:** `POST /audits` → trả `{ auditId, status }`.

**Success:** `router.push('/audits/' + auditId)` → page detail tự subscribe WS.

**Errors:**
- 400 SSRF blocked → "URL nội bộ không được phép. Chỉ audit được URL public."
- 400 invalid URL → validation message.
- 403 rate limit → "Bạn đã vượt giới hạn 5 audit/giờ. Thử lại sau {X}s."

---

## 11. Chi tiết audit `/audits/:id`

**Mục đích:** Trang cốt lõi nhất — xem kết quả, hoặc xem real-time khi đang chạy.

### 11.1 Kiến trúc 3 trạng thái

```
fetch GET /audits/:id
 │
 ├─ status=pending/crawling/analyzing/reporting
 │     → hiển thị <RealtimeAuditView>  (sub WS, progress bar, live log)
 │
 ├─ status=completed
 │     → hiển thị <CompletedAuditView>  (tabs với kết quả)
 │
 └─ status=failed
       → hiển thị <FailedAuditView>  (error message + retry button)
```

### 11.2 `<RealtimeAuditView>` (đang chạy)

**Cấu trúc:**

```
<Card variant="hero">
  <h1>Audit URL: https://example.com</h1>
  <p>Đang {vietnameseStage(stage)}...</p>

  <ProgressBar progress={progress} animated />
  <ProgressSteps current={currentStep}>
    ✓ Pending
    ✓ Crawling
    → Analyzing (đang chạy)
    ○ Reporting
    ○ Completed
  </ProgressSteps>

  <EstimatedTime>~10 giây còn lại</EstimatedTime>
</Card>

<LiveLogCard collapsible>
  Các event timestamp + message nhận qua WS
</LiveLogCard>
```

**WS subscribe:**
```typescript
useAuditRealtime(auditId, {
  onProgress: ({ progress, stage, message }) => setState({ progress, stage, messages: [...messages, message] }),
  onCompleted: () => queryClient.invalidateQueries(['audits', 'detail', auditId]),
  onFailed: ({ error }) => setError(error),
});
```

### 11.3 `<CompletedAuditView>` (đã xong)

**Header:**

```
<Header>
  URL: https://example.com ↗ (open new tab)
  Domain: example.com
  Tạo lúc: 2026-04-18 10:30
  Actions: [📄 Export PDF] [🔗 Share] [🔁 Re-audit] [🗑️ Delete]
</Header>
```

**Score hero:**

```
<Card variant="dark">
  <LeftColumn>
    <ScoreGauge value={finalScore} size="xl" /> // Circular 120px
    <Classification badge>Excellent / Good / Fair / Poor</Classification>
    <ScoreBreakdown>
      Analyzer: 82 × 0.7 = 57.4
      CWV Perf: 75 × 0.3 = 22.5
      Final: 80
    </ScoreBreakdown>
  </LeftColumn>
  <RightColumn>
    <StatRow>
      <Stat label="Total Issues" value={totalIssues} />
      <Stat label="Critical" value={criticalIssues} color="red" />
      <Stat label="Warnings" value={warnIssues} color="yellow" />
      <Stat label="Passed" value={passCount} color="green" />
    </StatRow>
  </RightColumn>
</Card>
```

**Tabs:**

```
<Tabs defaultValue="overview">
  <TabsList>
    <Tab>Tổng quan</Tab>
    <Tab>21 Rule</Tab>
    <Tab>Keyword</Tab>
    <Tab>Core Web Vitals</Tab>
    {mode === 'site' && <Tab>Pages ({auditedUrls})</Tab>}
  </TabsList>

  <TabContent value="overview">
    <CategoryBarsCard>
      Meta:       ████████░░ 80%
      Headings:   ██████░░░░ 60%
      Images:     ██████████ 100%
      ...
    </CategoryBarsCard>
    <TopIssuesCard>
      Top 5 critical issue với suggestion
    </TopIssuesCard>
  </TabContent>

  <TabContent value="rules">
    <IssuesTable
      columns={['Rule', 'Category', 'Status', 'Score', 'Weight', 'Action']}
      groupBy="category"
      expandable // row expand để xem message + suggestion + metadata
    />
  </TabContent>

  <TabContent value="keywords">
    <TargetKeywordCard>
      Keyword: "seo tiếng việt"
      Frequency: 12 lần
      Density: 2.47% → <Badge>Optimal</Badge>
      Placement: ✓ Title, ✓ H1, ✗ Meta desc, ✓ First paragraph
    </TargetKeywordCard>
    <Top20KeywordsTable>
      Cols: Rank | Keyword | Freq | Density | Placement (icons)
    </Top20KeywordsTable>
  </TabContent>

  <TabContent value="cwv">
    <CwvGridMobile>
      <CwvTile metric="LCP" value={lcpMs} unit="ms" threshold={2500} />
      <CwvTile metric="INP" value={inpMs} unit="ms" threshold={200} />
      <CwvTile metric="CLS" value={cls} threshold={0.1} />
    </CwvGridMobile>
    <CwvGridDesktop similar />
    <LighthouseCategoryBars>
      Performance: 75
      Accessibility: 92
      Best Practices: 88
      SEO: 90
    </LighthouseCategoryBars>
  </TabContent>

  {mode === 'site' && (
    <TabContent value="pages">
      <PagesTable>
        Cols: URL | Score | Issues | Fetched At
        Sort by score asc (worst first)
        Paginate
      </PagesTable>
    </TabContent>
  )}
</Tabs>
```

**API:**
- `GET /audits/:id` — full data.
- `GET /audits/:id/status` — fallback nếu WS fail.

**Edge cases:**
- WS disconnect → fall back to polling `/status` mỗi 3s.
- Re-audit button → tạo audit mới cùng URL + `router.push(newId)`.

### 11.4 `<FailedAuditView>`

```
<Alert variant="error">
  <Icon>⚠️</Icon>
  <Title>Audit thất bại</Title>
  <Description>{audit.errorMessage}</Description>
  <Actions>
    [Thử lại] (tạo audit mới cùng URL)
    [Xoá audit]
    [Liên hệ hỗ trợ]
  </Actions>
</Alert>
```

---

## 12. So sánh 2 audit `/audits/:id/compare?with=<otherId>`

**Mục đích:** Xem delta giữa 2 audit cùng URL / cùng domain.

**Layout:**

```
<Header>
  Compare: audit A (2026-04-01) vs audit B (2026-04-18)
  ScoreDelta: 65 → 78 (+13 ↑)
</Header>

<ComparisonSummary>
  Issues fixed: 3
  New issues: 1
  Rules improved: 5
  Rules worsened: 0
</ComparisonSummary>

<RuleDeltaTable>
  Cols: Rule | Status Before | Status After | Score Δ
  Rows highlight:
    - Fixed: green (fail → pass)
    - Regressed: red (pass → fail)
    - Unchanged: muted
</RuleDeltaTable>
```

**API:** `GET /audits/compare?audit1=&audit2=`.

---

## 13. Hồ sơ `/settings/profile`

**Form:**
- Avatar upload (optional)
- Full name
- Email (readonly, có link verify lại nếu chưa)
- Created at (readonly)
- Button "Lưu thay đổi"

**API:** `PATCH /users/profile`.

---

## 14. Bảo mật `/settings/security`

**Sections:**

### Đổi mật khẩu

Form:
- Current password
- New password
- Confirm new password
- Button "Đổi mật khẩu"

API: `PATCH /users/password`.

### Session active

Danh sách refresh token chưa revoked: userAgent, IP, issued at, last used.
Action: "Revoke" từng session.

(Hiện backend chưa expose endpoint này — có thể thêm `GET /auth/sessions` + `DELETE /auth/sessions/:id` sau.)

### Xoá tài khoản

Danger zone: confirm password → xoá account cascade (audits, refresh tokens).

(Backend cần thêm endpoint này.)

---

## 15. Admin: Quản lý user `/admin/users`

**Layout:** Sidebar + admin banner cảnh báo "Bạn đang ở admin panel".

**Table:**

```
<UserTable>
  Cols: Email | Full Name | Role | Verified | Locked | Created | Actions
  Filter: search (email/name), role, verified, locked
  Actions per row:
    - Toggle verified
    - Toggle locked
    - Change role (user ↔ admin)
    - Reset password (admin gửi link) — chưa có endpoint
</UserTable>
```

**API:** `GET /admin/users`, `PATCH /admin/users/:id`.

**Guard:** self-demotion (admin đổi role chính mình về user) bị chặn.

---

## 16. Admin: Quản lý rule `/admin/rules`

**Layout:** List 21 rule group by category, mỗi rule có slider weight.

```
<RulesManagement>
  <CategoryGroup title="Meta">
    <RuleCard>
      Title: "Title tag"
      Description: "Kiểm tra title độ dài 50-60"
      WeightSlider min={1} max={10} value={weight} showValue />
      ToggleEnabled checked={isEnabled} />
    </RuleCard>
    ... (4 rule)
  </CategoryGroup>
  ... (7 category)
</RulesManagement>

<StickyFooter>
  <Alert>Đã thay đổi {dirty} rule</Alert>
  <Button variant="ghost" onClick={reset}>Huỷ</Button>
  <Button onClick={save}>Lưu thay đổi</Button>
</StickyFooter>
```

**API:**
- `GET /admin/rules` — load initial.
- `PUT /admin/rules` — batch save.

**Debounce save:** optional auto-save mỗi rule nhưng UX tốt hơn khi "Lưu thay đổi" explicit.

---

## 17. Admin: Thống kê `/admin/stats`

**Widgets:**

```
<MetricCards>
  Total Users: 123
  Total Audits: 456
  Avg Score: 72.4
  Completion Rate: 94%
</MetricCards>

<AuditVolumeChart period="30d">
  Line chart: audits/day
</AuditVolumeChart>

<StatusDistributionPie>
  Pie: completed (400) / failed (20) / pending (2)
</StatusDistributionPie>

<TopFailingRulesChart>
  Bar: rule có % FAIL cao nhất (trong 30 ngày)
</TopFailingRulesChart>
```

**API:** `GET /admin/stats?period=30d`.

---

## 18. Public share `/shared/:token`

**Layout:** Minimal — có brand logo trên, footer dưới, không sidebar.

**Behavior:**
- Server Component fetch `GET /shared/audits/:token` → nếu 404 hiển thị "Link không tồn tại hoặc đã bị thu hồi".
- Nếu OK → render như tab "Overview" của [11.3](#113-completedauditview-đã-xong) nhưng:
  - Readonly.
  - Không có action Share/Delete/Re-audit.
  - Có watermark "Chia sẻ công khai".
  - Có CTA "Audit website của bạn" → link đăng ký.

**SEO:**
- `metadata` Next.js: `<title>SEO Audit của example.com | SEO Analyst</title>`
- Open Graph + Twitter card cho Facebook/Twitter preview đẹp.

---

## 19. Các pattern lặp lại

### ScoreBadge

```tsx
function ScoreBadge({ score }: { score: number }) {
  const classification = classify(score);
  const color = {
    excellent: 'green',
    good: 'blue',
    fair: 'yellow',
    poor: 'red',
  }[classification];
  return <Badge color={color}>{score}</Badge>;
}
```

### StatusBadge

```tsx
function StatusBadge({ status }: { status: AuditStatus }) {
  const variants = {
    pending: { color: 'gray', icon: '⏸', label: 'Đang chờ' },
    crawling: { color: 'blue', icon: '🕷', label: 'Đang tải' },
    analyzing: { color: 'blue', icon: '🔍', label: 'Đang phân tích' },
    reporting: { color: 'blue', icon: '📊', label: 'Đang tổng hợp' },
    completed: { color: 'green', icon: '✓', label: 'Hoàn thành' },
    failed: { color: 'red', icon: '✗', label: 'Thất bại' },
  };
  const v = variants[status];
  return <Badge color={v.color}>{v.icon} {v.label}</Badge>;
}
```

### EmptyState

```tsx
function EmptyState({ icon, title, description, action }) {
  return (
    <Card padding="xl" align="center">
      <Illustration name={icon} />
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </Card>
  );
}
```

### ConfirmDialog

Dùng cho delete/revoke/destructive actions:

```tsx
<ConfirmDialog
  open={open}
  onOpenChange={setOpen}
  title="Xoá audit này?"
  description="Hành động này không thể hoàn tác."
  confirmLabel="Xoá"
  variant="destructive"
  onConfirm={handleDelete}
/>
```

---

## 20. Đi tiếp

- Design tokens + components style → [32-design-system.md](32-design-system.md)
- Realtime progress chi tiết → [33-realtime-ux.md](33-realtime-ux.md)
- Mapping từ mockup HTML sang spec → [34-ui-mockup-mapping.md](34-ui-mockup-mapping.md)
