# PHASE 1 — Agent A3: Auth Recovery Pages (forgot-password + reset-password)

> **Self-contained spec.** Đọc cold.

---

## 0. Mission

Design 2 auth recovery page **không có AppShell**:
1. `auth-forgot-password` — single email input + submit.
2. `auth-reset-password` — token (from URL) + newPassword + confirm.

**File output**:
- `design/page/auth-forgot-password.pen`
- `design/page/auth-reset-password.pen`

Mỗi file = clone từ `design/system-tokens.pen` foundation.

---

## 1. Inputs

| File | Đọc gì |
|---|---|
| `design/INTENT.md` | §3 tier 4 polish, §6 typography, §9 error UX |
| `design/BACKEND-API.md` | §4.1 auth endpoints (forgot-password, reset-password), §6 ForgotPasswordDto/ResetPasswordDto |
| `design/.planning/PHASE-0.md` | Foundation reference |
| `design/.planning/PHASE-1-AGENT-A2.md` | **Đọc reference** — copy convention (logo, card structure, footer link) cho consistency với A2 |
| `design/system-tokens.pen` | Foundation để clone |

---

## 2. Why this agent

A3 làm 2 page recovery tách riêng A2 vì:
- 2 page cần consistency với 3 page A2 (cùng layout + logo + card pattern).
- Tách load → A3 chạy parallel với A2/A4 (4x agent thật).
- 2 page reset là "second-tier auth flow" (dùng ít hơn login/register, nhưng quan trọng compliance).

---

## 3. Backend contract slice

### 3.1 Forgot password
- **Endpoint**: `POST /api/v1/auth/forgot-password`
- **Body** (ForgotPasswordDto): `{ email: string }`
- **Response 200**: `{ message }` — luôn thành công (không leak existence của email).
- **Note**: BE chưa wire email service → user dev sẽ nhận token qua DB hoặc log. UX vẫn show "đã gửi link" message.

### 3.2 Reset password
- **Endpoint**: `POST /api/v1/auth/reset-password`
- **Body** (ResetPasswordDto):
  ```ts
  { token: string; newPassword: string }
  // newPassword cùng rule register: 8..72, ≥1 uppercase, ≥1 digit, ≥1 special
  ```
- **Response 200**: `{ message }` — sau đó BE revoke all refresh tokens (user phải re-login mọi device).
- **Errors**:
  - 400: token invalid/expired hoặc newPassword không đúng rule.
  - 400: token thiếu.

### 3.3 URL convention (FE infer)
- Reset link backend gửi (sau khi wire email): `${FRONTEND_URL}/auth/reset-password?token=<resetToken>`.
- FE parse `searchParams.get('token')` → pre-fill hidden field.

---

## 4. Pages to deliver

### 4.1 `auth-forgot-password.pen` — page `Page/AuthForgotPassword`

**Layout**: cùng pattern A2 — full-screen centered, card width 400.

**Card content** (top to bottom):
1. **Logo + brand** (same A2): icon gauge + wordmark "SEO Audit".
2. **Header**:
   - Title "Quên mật khẩu?" `$text-2xl` `$weight-semibold`.
   - Subtitle "Nhập email để nhận link đặt lại mật khẩu" `$text-sm` `$color-fg-muted`.
3. **Form** (vertical, gap `$space-4`):
   - Input email: label "Email", placeholder "you@example.com", type=email.
4. **Submit button**: Primary md fill_container, label "Gửi link đặt lại".
5. **Footer link**: "Nhớ mật khẩu rồi? <link>Quay lại đăng nhập</link>" `$text-sm` `$color-fg-muted`.

**State variants** (frames cạnh nhau):
- `Page/AuthForgotPassword/Default` — empty form.
- `Page/AuthForgotPassword/Loading` — submit button spinner + label "Đang gửi...".
- `Page/AuthForgotPassword/Success` — card thay nội dung:
  - Icon mail-check large 64×64 `$color-class-excellent`.
  - Title "Đã gửi link!" `$text-2xl`.
  - Description "Nếu email tồn tại trong hệ thống, link đặt lại sẽ được gửi đến hộp thư của bạn. Vui lòng kiểm tra cả thư mục Spam."
  - Helper text small dev-mode: "Dev mode: kiểm tra logs backend cho reset token" mono `$text-xs` fill `$color-fg-subtle` (frame có border dashed `$color-border-strong`).
  - Button "Quay lại đăng nhập" outline.
- `Page/AuthForgotPassword/Error/Validation` — email field stroke error + helper "Email không hợp lệ".
- `Page/AuthForgotPassword/Error/RateLimit` — Toast error countdown.

### 4.2 `auth-reset-password.pen` — page `Page/AuthResetPassword`

**Layout**: cùng pattern, card width 440.

**Card content**:
1. **Logo + brand**.
2. **Header**:
   - Title "Đặt lại mật khẩu".
   - Subtitle "Tạo mật khẩu mới cho tài khoản của bạn".
3. **Form**:
   - Hidden token field (token từ URL) — visualize trong design như:
     - Frame nhỏ horizontal `$space-2` padding, fill `$color-bg-overlay`, radius `$radius-sm`.
     - Icon `key` 14×14 fill `$color-fg-muted`.
     - Mono text "Token: reset_abc...xyz" truncate, `$text-xs` fill `$color-fg-muted`.
     - (Note metadata: token nằm hidden field trong FE, design hiển thị để QA biết).
   - Input newPassword: label "Mật khẩu mới", placeholder, type=password, eye toggle.
   - Password rules (same A2 register, 4 rule visual):
     - "Tối thiểu 8 ký tự" / "Có ít nhất 1 chữ hoa" / "Có ít nhất 1 chữ số" / "Có ít nhất 1 ký tự đặc biệt".
   - Input confirmPassword: label "Xác nhận mật khẩu", type=password, eye toggle.
4. **Submit button**: Primary, label "Đặt lại mật khẩu".
5. **Footer link**: "Quay lại đăng nhập" `$color-primary`.

**State variants** (frames cạnh nhau):
- `Page/AuthResetPassword/Default` — empty form.
- `Page/AuthResetPassword/PasswordValid` — 4/4 rule passed, confirm field empty.
- `Page/AuthResetPassword/MismatchError` — confirm field stroke error + helper "Mật khẩu xác nhận không khớp".
- `Page/AuthResetPassword/Success` — card thay:
  - Icon check large 64×64 green.
  - Title "Đặt lại thành công!".
  - Description "Mật khẩu của bạn đã được cập nhật. Tất cả phiên đăng nhập trên các thiết bị khác đã bị huỷ. Vui lòng đăng nhập lại."
  - Button "Đến trang đăng nhập" primary.
- `Page/AuthResetPassword/Error/InvalidToken` — banner alert ở top:
  - Frame Component/Toast/Error variant inline (không phải toast nổi).
  - Title "Link đã hết hạn hoặc không hợp lệ".
  - Description "Vui lòng yêu cầu link mới."
  - Button "Yêu cầu link mới" outline → link đến forgot-password.
- `Page/AuthResetPassword/Error/MissingToken` — full-screen error (token không có trong URL):
  - Card content thay bằng:
    - Icon alert-triangle large 64×64 `$color-class-fair`.
    - Title "Link không hợp lệ".
    - Description "URL không chứa token đặt lại. Vui lòng dùng link từ email."
    - Button "Quay lại đăng nhập" outline.

---

## 5. Cross-cutting

- **Consistency với A2**: cùng card pattern, cùng logo placement, cùng footer link style.
- **Theme**: dark default.
- **Vietnamese copy**: natural, không robot.
- **Token visualization**: trong design hiển thị token preview để QA visual, runtime nó hidden.

---

## 6. Anti-patterns — refuse

(Same A2 + thêm)
- ❌ Hiển thị token đầy đủ trên UI runtime (chỉ dev preview trong design — note metadata).
- ❌ Multi-step wizard (1 form duy nhất).
- ❌ Auto-redirect sau success không có CTA button (luôn có button explicit).
- ❌ Forgot password reveal account existence ("Email này không tồn tại" — KHÔNG. Luôn show generic message).
- ❌ Reset password skip confirmPassword field.

---

## 7. Workflow

1. **Setup worktree**:
   ```bash
   git worktree add .claude/worktrees/design-phase-1-a3 -b design/phase-1-a3
   cd .claude/worktrees/design-phase-1-a3
   ```
2. **Clone foundation**:
   ```bash
   cp design/system-tokens.pen design/page/auth-forgot-password.pen
   cp design/system-tokens.pen design/page/auth-reset-password.pen
   git add design/page/*.pen
   git commit -m "design(phase-1-a3): clone foundation for auth recovery pages"
   ```
3. Cho mỗi page:
   - Open → get_editor_state.
   - Hide foundation frames (Tokens/Base/Domain → enabled false).
   - Build state frames cạnh nhau.
   - Screenshot mỗi state.

---

## 8. Done checklist

### auth-forgot-password
- [ ] 5 state frame: Default / Loading / Success / Error/Validation / Error/RateLimit.
- [ ] Form 1 field email.
- [ ] Success state có dev-mode helper text.
- [ ] Footer link về login.
- [ ] Copy tiếng Việt.

### auth-reset-password
- [ ] 6 state frame: Default / PasswordValid / MismatchError / Success / Error/InvalidToken / Error/MissingToken.
- [ ] Token visualization frame.
- [ ] Password rules 4 rule visual.
- [ ] confirmPassword field với mismatch validation.
- [ ] Success state mention "all sessions revoked".

### Cross
- [ ] Consistency với A2 (cùng logo, card width pattern, footer link).
- [ ] Foundation frames hidden ở cả 2 file.
- [ ] All component refs.
- [ ] No anti-pattern (no token reveal runtime, no email existence leak).

### Hand-off
- [ ] `.planning/PHASE-1-A3-DONE.md` với 11 screenshot link (5+6 state).
- [ ] Branch push.
- [ ] PR: `design(phase-1-a3): auth-forgot-password + auth-reset-password`.

---

## 9. Worktree + commit convention

- **Worktree path**: `.claude/worktrees/design-phase-1-a3/`
- **Branch**: `design/phase-1-a3`
- **Commit splits**:
  1. `design(phase-1-a3): clone foundation for auth recovery pages`
  2. `design(phase-1-a3): hide foundation frames`
  3. `design(phase-1-a3): add auth-forgot-password 5 states`
  4. `design(phase-1-a3): add auth-reset-password form + password rules`
  5. `design(phase-1-a3): add auth-reset-password 6 states`
  6. `design(phase-1-a3): hand-off doc + screenshots`
