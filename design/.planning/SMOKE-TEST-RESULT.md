# SMOKE TEST RESULT — Pencil Dual-Theme Variables

**Date**: 2026-05-09
**Tested on**: branch `feat/web-fresh`, commit `2ba97e7e`, file `design/_smoke-test.pen` (copy of `system-tokens.pen`, deleted after test)
**MCP server**: `pencil` (active)
**Schema version**: `2.11`

## Verdict

- [x] **PASS** — Phase 0 proceed như spec hiện tại (1 file dual-theme `system-tokens.pen`)
- [ ] FAIL — Phase 0 fallback: 2 file `system-dark.pen` + `system-light.pen`

Tất cả 3 câu hỏi PASS. Không cần fallback. Phase 0 build dual-theme variables trong 1 file là khả thi.

---

## Q1: Multi-entry theme-aware variable

- **Status**: PASS
- **Evidence** — `set_variables` accepted multi-entry value với `theme` discriminator:

  Input:
  ```json
  {
    "test-color-bg": {
      "type": "color",
      "value": [
        { "value": "#0A0A0B", "theme": { "theme": "dark" } },
        { "value": "#FFFFFF", "theme": { "theme": "light" } }
      ]
    },
    "test-color-fg": {
      "type": "color",
      "value": [
        { "value": "#FAFAFA", "theme": { "theme": "dark" } },
        { "value": "#0A0A0B", "theme": { "theme": "light" } }
      ]
    }
  }
  ```
  Tool response: `{"message":"Successfully set variables."}`

  `get_variables()` confirm 2 entry mỗi var:
  ```json
  {
    "themes": {"theme": ["dark", "light"]},
    "variables": {
      "test-color-bg": {"type":"color","value":[
        {"theme":{"theme":"dark"},"value":"#0A0A0B"},
        {"theme":{"theme":"light"},"value":"#FFFFFF"}
      ]},
      "test-color-fg": {"type":"color","value":[
        {"theme":{"theme":"dark"},"value":"#FAFAFA"},
        {"theme":{"theme":"light"},"value":"#0A0A0B"}
      ]}
    }
  }
  ```
- **Notes**:
  - Variable name **KHÔNG có prefix `$`** khi truyền vào `set_variables`. Prefix `$` chỉ dùng khi reference từ property (e.g. `fill: "$test-color-bg"`).
  - Schema `Document.variables[name].value` accept `Color | Variable | { value, theme? }[]` — confirm spec.

---

## Q2: themes config setable via MCP

- **Status**: PASS (auto, không cần thao tác riêng)
- **Evidence**: KHÔNG hề gọi action set themes config. Sau khi `set_variables` gọi xong, `get_variables()` trả về:
  ```json
  "themes": { "theme": ["dark", "light"] }
  ```
- **Notes**:
  - Tool description xác nhận: *"Don't specify themes separately! If a variable is using theming, theme axes and values that aren't yet present in the document will be automatically registered."*
  - **Implication cho Phase 0**: KHÔNG cần manual edit JSON cho `themes` config. Chỉ cần định nghĩa variables với entries `{ value, theme: { theme: "dark"|"light" } }` là document tự register `themes: {"theme": ["dark","light"]}`.

---

## Q3: Screenshot render per theme

- **Status**: PASS
- **Approach work**: per-node `theme: { theme: "<value>" }` override qua `batch_design` `U()` operation. Đây là field `theme?: Theme` trên `Entity` interface (mọi node đều có).
- **Approach NOT in public API**: `get_screenshot` không nhận `theme` param (schema chỉ có `filePath` + `nodeId`). Nhưng không cần — vì có thể override trên node trước khi screenshot.

### Dark screenshot (default — không set theme override trên frame)
- Render: bg đen `#0A0A0B`, text "Theme Test" trắng `#FAFAFA`, swatch rectangle bg đen với border trắng.
- Verified inline trong session (không save thành file riêng — MCP `get_screenshot` trả image inline, không expose file path).
- Conclusion: document default theme = `dark` (axis-first value? hoặc undefined → first registered theme axis value, here `"dark"`).

### Light screenshot (sau khi `U("CXn6e", {theme: {theme: "light"}})`)
- Render: bg trắng `#FFFFFF`, text "Theme Test" đen `#0A0A0B`, swatch rectangle bg trắng với border đen.
- Verified inline trong session.
- Conclusion: per-frame theme override work — variables resolve đúng theo override.

- **Notes**:
  - Theme override propagate xuống children — set trên parent frame thì text con + rectangle con render đúng light theme.
  - Workflow QA visual cho FE:
    1. Build screen với theme-aware vars (KHÔNG hardcode color).
    2. Default screenshot → check dark theme.
    3. `U("<frameId>", {theme: {theme: "light"}})` → screenshot lại → check light theme.
    4. Revert override (hoặc bỏ qua nếu file là throwaway).
  - Có thể alternate: clone frame và set `theme: {theme: "light"}` trên copy → giữ cả 2 visual cạnh nhau trong cùng canvas (good for design review).

---

## Recommendation cho coordinator

**Proceed Phase 0 nguyên xi spec hiện tại — 1 file `system-tokens.pen` dual-theme.** Pencil MCP support đầy đủ: theme-aware variables, auto themes-config registration, và per-node theme override cho QA visual cả 2 theme. Phase 1+ chỉ cần build clone-foundation theo spec, dùng `$token-name` references — variables sẽ tự resolve theo theme override khi render.

---

## Done checklist

- [x] File `_smoke-test.pen` đã test xong và đã `rm`.
- [x] File `.planning/SMOKE-TEST-RESULT.md` viết xong với verdict + 3 evidence.
- [x] `git status` clean wrt scope smoke test (chỉ thêm file result mới — `system-tokens.pen M` đã có sẵn từ trước).
- [x] Screenshot evidence đính trong evidence section (inline render verified, MCP không expose file path để link absolute).
- [x] Recommendation 1-2 câu rõ ràng.

---

## Side-finding: pencil MCP auto-save persistence

- Khi gọi `rm design/_smoke-test.pen` lần đầu (ngay sau test), pencil MCP đã **re-save** file xuống disk vì document còn đang open trong editor MCP.
- Có thể reproduce: `rm` → wait few seconds → file xuất hiện lại với mtime updated.
- **Workaround Phase 0**: trước khi `rm` test artifact, nên `mcp__pencil__open_document` sang file khác để release editor lock, hoặc accept rằng cần `rm -f` 2 lần.
- Áp dụng cho coordinator: nếu Phase 0 dùng throwaway `_*.pen` file cho QA, phải nhớ clean ngầm sau khi switch editor sang file khác.
