# SMOKE TEST — Pencil Dual-Theme Variables

> **Mục đích**: Verify pencil hỗ trợ theme-aware variable + screenshot render đúng theme trước khi commit Phase 0. Nếu fail, fallback sang 2 file `system-dark.pen` + `system-light.pen` riêng.
>
> **Thời gian**: 15-30 min. KHÔNG commit gì lên git. KHÔNG dùng worktree (test trên branch hiện tại).

---

## 1. Mission

Trả lời 3 câu hỏi với evidence:

1. **Q1**: `set_variables` tool có chấp nhận multi-entry value với `theme` discriminator không? Ví dụ:
   ```js
   "$test-color": {
     type: "color",
     value: [
       { value: "#0A0A0B", theme: { theme: "dark" } },
       { value: "#FFFFFF", theme: { theme: "light" } }
     ]
   }
   ```
2. **Q2**: `themes` config top-level Document có cách nào set qua MCP không (vì `set_variables` chỉ set vars, không set themes config)?
3. **Q3**: `get_screenshot` có render đúng theme nào? Có flag chuyển theme không, hay render theo "current" theme document?

---

## 2. Setup

```bash
# KHÔNG worktree, work direct trên branch hiện tại (feat/web-fresh).
# KHÔNG commit. Mọi thay đổi sẽ revert sau test.
cd "/media/minhducoder/New Volume2/Learn_On_Drive/DO_AN/design"
```

File test: tạo `design/_smoke-test.pen` (underscore prefix → tạm thời).

---

## 3. Test steps

### Step 1 — Open clean test file

```js
mcp__pencil__open_document({
  path: ".../design/_smoke-test.pen"
})
// Nếu file không tồn tại → tool sẽ báo lỗi → tạo trống bằng cách copy template:
// (nếu MCP không hỗ trợ tạo trống) tạo file ngoài: cp design/system-tokens.pen design/_smoke-test.pen
```

### Step 2 — Get state + schema

```js
mcp__pencil__get_editor_state({ include_schema: true })
mcp__pencil__get_variables() // baseline
```

### Step 3 — Set themes config (TEST Q2)

Thử qua `batch_design` update Document root:
```js
// Approach A: U on document
U("document", { themes: { theme: ["dark", "light"] } })
```
hoặc
```js
// Approach B: get_editor_state → check schema có expose update path cho themes không
```

**Evidence**: Output của `get_variables` sau action — `themes` field có set không?

### Step 4 — Set theme-aware variable (TEST Q1)

```js
mcp__pencil__set_variables({
  variables: {
    "$test-color-bg": {
      type: "color",
      value: [
        { value: "#0A0A0B", theme: { theme: "dark" } },
        { value: "#FFFFFF", theme: { theme: "light" } }
      ]
    },
    "$test-color-fg": {
      type: "color",
      value: [
        { value: "#FAFAFA", theme: { theme: "dark" } },
        { value: "#0A0A0B", theme: { theme: "light" } }
      ]
    }
  }
})
```

**Evidence**: Tool return success/error. Nếu error → log error message. Nếu success → `get_variables()` confirm 2 entry mỗi var.

### Step 5 — Build mini test frame

```js
mcp__pencil__batch_design({
  ops: [
    `frame=I("document", {type: "frame", layout: "vertical", width: 400, height: 300, padding: 24, gap: 12, fill: "$test-color-bg"})`,
    `text=I(frame, {type: "text", content: "Theme Test", fill: "$test-color-fg", fontSize: 24, fontWeight: "700"})`,
    `swatch=I(frame, {type: "rectangle", width: 100, height: 100, fill: "$test-color-bg", stroke: {fill: "$test-color-fg", thickness: 2, align: "inside"}})`
  ]
})
```

### Step 6 — Screenshot baseline (TEST Q3 — default theme)

```js
mcp__pencil__get_screenshot({ nodeId: "frame_id_from_step_5" })
```

**Expected nếu default = dark**: bg đen, text trắng. Save screenshot path.

### Step 7 — Try toggle theme

Thử các cách:
```js
// A: set theme via batch_design U on document
U("document", { theme: { theme: "light" } })

// B: get_screenshot with theme param (kiểm tra schema có không)
mcp__pencil__get_screenshot({ nodeId: "frame_id", theme: { theme: "light" } })
```

**Evidence**: 
- Nếu Approach A work → screenshot lại frame, expect bg trắng, text đen.
- Nếu Approach B work → save screenshot light theme.
- Nếu cả 2 fail → ghi rõ vào kết quả.

### Step 8 — Cleanup

```bash
# Xóa test file (KHÔNG commit)
rm design/_smoke-test.pen
git status # verify clean (chỉ có .planning/SMOKE-TEST-RESULT.md mới)
```

---

## 4. Output: viết `.planning/SMOKE-TEST-RESULT.md`

Format:

```markdown
# SMOKE TEST RESULT — Pencil Dual-Theme Variables

## Verdict
- [ ] PASS — Phase 0 proceed như spec hiện tại (1 file dual-theme)
- [ ] FAIL — Phase 0 fallback: 2 file `system-dark.pen` + `system-light.pen`

## Q1: Multi-entry theme-aware variable
- Status: PASS / FAIL
- Evidence: <paste tool output>
- Notes: ...

## Q2: themes config setable via MCP
- Status: PASS / FAIL
- Evidence: ...
- Notes: ...

## Q3: Screenshot render per theme
- Status: PASS / PARTIAL / FAIL
- Dark screenshot: <path>
- Light screenshot: <path or "không thể render light theme">
- Notes: ...

## Recommendation
1-2 câu cho coordinator: proceed Phase 0 như spec, hoặc adjust thế nào.
```

---

## 5. Decision criteria (cho coordinator đọc result)

| Result | Action |
|---|---|
| Q1 PASS + Q2 PASS + Q3 PASS | Phase 0 spec OK, proceed nguyên xi |
| Q1 PASS + Q2 PASS + Q3 PARTIAL (chỉ render được 1 theme) | Phase 0 OK build dual-theme variables, nhưng QA visual chỉ 1 theme. Acceptable — light theme verify thủ công khi FE implement |
| Q1 PASS + Q2 FAIL | Phase 0 vẫn build variables. Themes config thủ công edit JSON sau (small fix) |
| Q1 FAIL | **Fallback critical**: chia 2 file `system-dark.pen` + `system-light.pen`. Phase 0 spec phải rewrite để build 2 file. Phase 1+ clone foundation theo theme target (mặc định dark). Light support deferred. |

---

## 6. Done checklist

- [ ] File `_smoke-test.pen` đã test xong và đã `rm`.
- [ ] File `.planning/SMOKE-TEST-RESULT.md` viết xong với verdict + 3 evidence.
- [ ] `git status` clean (no untracked artifact).
- [ ] Screenshot files (nếu có) đính link absolute path trong result.
- [ ] Recommendation 1-2 câu rõ ràng.

---

## 7. KHÔNG làm

- ❌ KHÔNG commit `_smoke-test.pen`.
- ❌ KHÔNG modify `design/system-tokens.pen` (foundation file đang có 1 frame Tokens — không đụng).
- ❌ KHÔNG worktree (test trên branch hiện tại để tránh setup overhead).
- ❌ KHÔNG mở PR. Result file đủ.
