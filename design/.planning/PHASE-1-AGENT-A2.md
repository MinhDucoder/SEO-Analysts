# PHASE 1 — Agent A2: Auth Pages (login + register + oauth-success)

> **Self-contained spec.** Đọc cold.

---

## 0. Mission

Design 3 auth page **không có AppShell** (full-screen auth flow):
1. `auth-login` — email/password form + Google OAuth button.
2. `auth-register` — fullName + email + password (có rules hint) + verify token display dev.
3. `auth-oauth-success` — loading state khi parse `?token=` từ URL.

**File output** (mỗi page 1 file riêng):
- `design/page/auth-login.pen`
- `design/page/auth-register.pen`
- `design/page/auth-oauth-success.pen`

Mỗi file = clone từ `design/system-tokens.pen` (foundation Phase 0) + design page trong frame mới.

---

## 1. Inputs

| File | Đọc gì |
|---|---|
| `design/INTENT.md` | §3 tier 1 pages, §6 typography, §9 error UX |
| `design/BACKEND-API.md` | §1.1 token model, §1.3 Google OAuth, §4.1 auth endpoints, §6 RegisterDto/LoginDto |
| `design/.planning/PHASE-0.md` | Foundation reference (variables + base components) |
| `design/system-tokens.pen` | Foundation file để clone |
| Pencil guide `Web App` + `Design System` | Load qua get_guidelines |

---

## 2. Why no AppShell

Auth pages = pre-authentication. UX convention (Linear/Vercel/Stripe) là **full-screen centered card** với background subtle. Không sidebar, không topbar.

---

## 3. Backend contract slice

### 3.1 Login
- **Endpoint**: `POST /api/v1/auth/login`
- **Body**: `{ email: string, password: string }` (LoginDto — password chỉ check non-empty)
- **Response 200**: `{ user: UserPublic, accessToken }` (set cookie `refresh_token`)
- **Errors**:
  - 400: validation fail
  - 403: account locked / unverified
  - 400/403 với detail "Da dat gioi han" → rate limit (10/email/15min)
- **Google OAuth**: button → `window.location = /api/v1/auth/google` (server redirect Google)

### 3.2 Register
- **Endpoint**: `POST /api/v1/auth/register`
- **Body** (RegisterDto):
  ```ts
  {
    email: string;        // IsEmail
    fullName: string;     // 2..100 chars
    password: string;     // 8..72, ≥1 uppercase, ≥1 digit, ≥1 special !@#$%^&*
  }
  ```
- **Response 201**: `{ user, message, verifyToken }` — verifyToken **dev-only** (TODO khi có email service).
- **Errors**:
  - 409: email đã tồn tại → inline error trên field email
  - 400: password rules fail → highlight password field
  - 400 rate limit (5/IP/1h)

### 3.3 OAuth callback
- Sau Google login, server redirect: `${FRONTEND_URL}/auth/oauth-success?token=<accessToken URL-encoded>`
- FE page: parse `searchParams.get('token')` → save store → redirect dashboard.
- Failure case: token thiếu/invalid → error message + nút "Quay lại đăng nhập".

---

## 4. Pages to deliver

### 4.1 `auth-login.pen` — page `Page/AuthLogin`

**Layout**:
- Top frame `Page/AuthLogin`, width 1440, height 900, fill `$color-bg`, layout horizontal, alignItems center, justifyContent center.
- Centered card: width 400, fit_content height, fill `$color-bg-elevated`, radius `$radius-lg`, stroke 1 `$color-border`, padding `$space-8`, layout vertical, gap `$space-6`.

**Card content** (top to bottom):
1. **Logo + brand**: horizontal frame center, gap `$space-2`:
   - Icon `gauge` 28×28 fill `$color-fg`.
   - Wordmark "SEO Audit" `$font-ui` `$text-2xl` `$weight-semibold` `$color-fg`.
2. **Header** (vertical, gap `$space-1`):
   - Title "Đăng nhập" `$text-2xl` `$weight-semibold` `$color-fg`.
   - Subtitle "Truy cập dashboard SEO của bạn" `$text-sm` `$color-fg-muted`.
3. **Form** (vertical, gap `$space-4`):
   - Input email (Component/Input/Default): label "Email", placeholder "you@example.com", type=email.
   - Input password: label "Mật khẩu", placeholder "••••••••", type=password, with eye icon toggle visibility (right slot in input).
   - Row checkbox + link: horizontal justifyContent space-between, alignItems center.
     - Checkbox "Ghi nhớ tôi" (Component/Checkbox).
     - Link text "Quên mật khẩu?" `$text-sm` `$color-primary` underline-on-hover.
4. **Submit button**: Component/Button/Primary md, fill_container width, label "Đăng nhập".
5. **Divider**: horizontal frame center alignItems center, gap `$space-4`, fill_container.
   - Line left: rectangle height 1 fill `$color-border` fill_container.
   - Text "hoặc" `$text-xs` `$color-fg-muted`.
   - Line right: rectangle height 1 fill `$color-border` fill_container.
6. **Google OAuth button**: Component/Button/Outline md, fill_container width, label "Đăng nhập với Google", icon-left lucide `chrome` (placeholder cho Google logo — note metadata sẽ replace bằng `brand-google` icon ở FE).
7. **Footer link**: text center "Chưa có tài khoản? <link>Đăng ký ngay</link>" `$text-sm` `$color-fg-muted`. Link `$color-primary`.

**State variants** (build trong file, mỗi state = 1 frame top-level riêng cạnh nhau):
- `Page/AuthLogin/Default` — empty form.
- `Page/AuthLogin/Loading` — submit button có spinner + label "Đang đăng nhập...", input disabled.
- `Page/AuthLogin/Error/Validation` — email field stroke `$color-error` + helper text "Email không hợp lệ".
- `Page/AuthLogin/Error/RateLimit` — Toast `Component/Toast/Error` ở góc trên-phải với detail "Đã đạt giới hạn. Thử lại sau 600s." + countdown.
- `Page/AuthLogin/Error/AccountLocked` — modal Component/Dialog với title "Tài khoản bị khoá", description "Liên hệ admin để mở khoá." + button "Đóng".

### 4.2 `auth-register.pen` — page `Page/AuthRegister`

**Layout**: tương tự login, card width 440 (lớn hơn vì có rules hint).

**Card content**:
1. Logo + brand (same).
2. Header: title "Tạo tài khoản", subtitle "Bắt đầu audit SEO miễn phí".
3. **Form**:
   - Input fullName: label "Họ tên", placeholder "Nguyễn Văn A". Helper text "2-100 ký tự".
   - Input email: label "Email", placeholder, type=email.
   - Input password với password rules visual indicator:
     - Input field, type=password, eye toggle.
     - Below input: 4 rule item vertical stack gap `$space-1`:
       - "Tối thiểu 8 ký tự" — icon check 14×14 (state pass) hoặc circle outline (state pending).
       - "Có ít nhất 1 chữ hoa".
       - "Có ít nhất 1 chữ số".
       - "Có ít nhất 1 ký tự đặc biệt (!@#$%^&*)".
       - Text size `$text-xs`, fill `$color-fg-muted` (pending) / `$color-class-excellent` (pass).
4. **Terms checkbox**: "Tôi đồng ý với <link>Điều khoản</link> và <link>Chính sách</link>".
5. **Submit button**: "Tạo tài khoản", primary fill_container.
6. **Divider** + Google OAuth (same as login).
7. **Footer link**: "Đã có tài khoản? <link>Đăng nhập</link>".

**State variants** (frames cạnh nhau):
- `Page/AuthRegister/Default`.
- `Page/AuthRegister/PasswordTyping` — 2/4 rule passed (icon check ở 2 đầu, outline 2 dưới).
- `Page/AuthRegister/PasswordValid` — 4/4 rule passed.
- `Page/AuthRegister/Success/DevTokenDisplay` — sau register thành công:
  - Card content thay bằng:
    - Icon check large 64×64 `$color-class-excellent` center.
    - Title "Đăng ký thành công!" `$text-2xl`.
    - Description "Email xác thực đã được gửi (dev mode: token bên dưới)".
    - Code block (frame with mono font, padding, bg `$color-bg-overlay`, fill_container) hiển thị verify token (mock string `verify_abc123def456...`). Có copy button.
    - Button "Đến trang đăng nhập" primary.
- `Page/AuthRegister/Error/EmailTaken` — email field stroke `$color-error` + helper "Email đã được đăng ký".

### 4.3 `auth-oauth-success.pen` — page `Page/AuthOAuthSuccess`

**Layout**: full-screen, fill `$color-bg`, layout center center.

**Content** (vertical center, gap `$space-6`):

**State `Loading` (default)**:
- Spinner 48×48 (note: animation describe — Pencil không animate. Render circle outline với stroke gap để imply spinner).
- Text "Đang xác thực với Google..." `$text-lg` `$weight-medium` `$color-fg`.
- Subtext "Vui lòng đợi trong giây lát" `$text-sm` `$color-fg-muted`.

**State `Success` (transient, before redirect)**:
- Icon check large 64×64 `$color-class-excellent`.
- Text "Đăng nhập thành công!".
- Subtext "Đang chuyển đến dashboard...".

**State `Error/MissingToken`**:
- Icon x large 64×64 `$color-class-poor`.
- Text "Xác thực thất bại".
- Subtext "Token không hợp lệ hoặc đã hết hạn".
- Button "Quay lại đăng nhập" primary.

**State `Error/InvalidToken`**:
- Tương tự MissingToken nhưng subtext khác: "Đường dẫn đăng nhập không hợp lệ".

Build cả 4 state làm 4 frame top-level cạnh nhau trong file.

---

## 5. Cross-cutting (cả 3 page)

- **Theme**: design dark first (default theme variable).
- **Background**: solid `$color-bg`. Optional: subtle radial gradient subtle ở center (nhưng INTENT cấm gradient mesh — chỉ dùng nếu không vi phạm. Em recommend solid bg).
- **Card max-width**: 400 (login, oauth-success) / 440 (register).
- **Mobile responsive**: KHÔNG ở phase này (INTENT §10 out of scope).
- **Vietnamese copy**: dùng tiếng Việt natural, không Google Translate.

---

## 6. Anti-patterns — refuse

- ❌ Hero illustration / stock photo bên cạnh form.
- ❌ Gradient button (chỉ solid).
- ❌ Card với drop shadow lớn (subtle hoặc no shadow).
- ❌ Marketing copy ("Giải pháp SEO #1!" — không. Functional copy only).
- ❌ Multi-step register wizard (1 form duy nhất).
- ❌ Email field type=text (phải type=email).
- ❌ Password field không có toggle visibility.
- ❌ Quên handle rate-limit state.

---

## 7. Workflow

1. **Setup worktree**:
   ```bash
   git worktree add .claude/worktrees/design-phase-1-a2 -b design/phase-1-a2
   cd .claude/worktrees/design-phase-1-a2
   ```
2. **Clone foundation 3 lần**:
   ```bash
   cp design/system-tokens.pen design/page/auth-login.pen
   cp design/system-tokens.pen design/page/auth-register.pen
   cp design/system-tokens.pen design/page/auth-oauth-success.pen
   git add design/page/*.pen
   git commit -m "design(phase-1-a2): clone foundation for auth pages"
   ```
3. Cho mỗi page:
   - Open file → get_editor_state.
   - **Hide foundation frames**: 3 top-level frame `Tokens` / `Base` / `Domain` set `enabled: false` hoặc move offscreen (giữ components reusable, không render).
   - Build page frames theo §4.
   - Mỗi state variant = 1 frame top-level riêng (đặt cạnh nhau ngang, gap `$space-12`).
   - Screenshot mỗi state.
   - Commit atomic.

---

## 8. Done checklist

### auth-login
- [ ] 5 state frame: Default / Loading / Error/Validation / Error/RateLimit / Error/AccountLocked.
- [ ] Form đầy đủ field email + password + remember + forgot link.
- [ ] Google OAuth button có icon.
- [ ] Footer link đến register.
- [ ] Copy tiếng Việt natural.

### auth-register
- [ ] 5 state frame: Default / PasswordTyping / PasswordValid / Success/DevTokenDisplay / Error/EmailTaken.
- [ ] Password rules visual 4 rule với pass/pending state.
- [ ] Terms checkbox với 2 link.
- [ ] DevTokenDisplay state có code block + copy button.

### auth-oauth-success
- [ ] 4 state frame: Loading / Success / Error/MissingToken / Error/InvalidToken.
- [ ] Spinner placeholder render đúng.
- [ ] Error states có CTA button rõ ràng.

### Cross
- [ ] All 3 file: foundation frames hidden (enabled false hoặc moved).
- [ ] All component refs use foundation reusable (Button/Input/Checkbox/...).
- [ ] No hardcoded color/spacing.
- [ ] Theme dark render đúng.
- [ ] No anti-pattern.

### Hand-off
- [ ] `.planning/PHASE-1-A2-DONE.md` với 14 screenshot link (5+5+4 state).
- [ ] Branch `design/phase-1-a2` push.
- [ ] PR: `design(phase-1-a2): auth-login + register + oauth-success`.

---

## 9. Worktree + commit convention

- **Worktree path**: `.claude/worktrees/design-phase-1-a2/`
- **Branch**: `design/phase-1-a2`
- **Commit splits**:
  1. `design(phase-1-a2): clone foundation for 3 auth pages`
  2. `design(phase-1-a2): hide foundation frames in page files`
  3. `design(phase-1-a2): add auth-login default + form`
  4. `design(phase-1-a2): add auth-login error/loading states`
  5. `design(phase-1-a2): add auth-register form + password rules`
  6. `design(phase-1-a2): add auth-register success + error states`
  7. `design(phase-1-a2): add auth-oauth-success 4 states`
  8. `design(phase-1-a2): hand-off doc + screenshots`
