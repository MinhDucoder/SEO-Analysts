# /diagram $ARGUMENTS

Bạn đang tạo PlantUML diagram từ code hoặc concept: **$ARGUMENTS**

Trước khi bắt đầu, đọc skill reference:
- `.claude/skills/code-visualization/SKILL.md` → quy tắc, decision matrix, presets
- `.claude/skills/code-visualization/references/plantuml-patterns.md` → syntax patterns
- `.claude/skills/code-visualization/references/project-templates.md` → Avada-specific templates

--------------------------------------------------
STEP 1 — PARSE INPUT & FLAGS
--------------------------------------------------

Parse `$ARGUMENTS` theo format:
```
/diagram <target> [--type TYPE] [--trace] [--focus FUNCTION]
```

**Flags**:
| Flag | Mô tả | Ví dụ |
|------|--------|-------|
| `--type TYPE` | Chọn diagram type (activity/sequence/class/component/state) | `--type sequence` |
| `--trace` | Trace theo imports, vẽ cross-file diagram | `--trace` |
| `--focus FN` | Chỉ vẽ 1 function cụ thể trong file | `--focus getMeta` |

**Xác định input type**:
1. **File path** (chứa `/` hoặc `.js`, `.ts`) → Read file, phân tích code
2. **Function name** → Grep tìm definition, đọc file chứa nó
3. **Known flow** → Map sang project flows (xem bảng bên dưới), đọc code liên quan
4. **Free concept** (mô tả tự do, không phải code) → Vẽ diagram từ context user cung cấp (xem STEP 2B)

**Known System Flows** (cho concept input):
| Concept | Entry Files |
|---------|-------------|
| auth flow | `handlers/auth.js`, `handlers/authSa.js` |
| image pipeline | `handlers/pubsub/optimizeSubscriber*.js` |
| audit flow | `services/audit/`, `services/auditOnPage/` |
| webhook flow | `handlers/webhook/` |
| meta tag flow | `controllers/seoController.js`, `helpers/afterInstall/updateAssets.js` |
| speed optimization | `services/hyperSpeedService.js`, `services/extractCriticalCssService.js` |
| cron jobs | `handlers/cron/` |

**Auto-detect diagram type** (nếu không có `--type`):
| Code pattern | Type | Lý do |
|-------------|------|-------|
| Single function, nhiều if/else, loops | **activity** | Flow control rõ ràng |
| Multi-layer (Handler→Controller→Service→Repo) | **activity + swimlanes** | Hiển thị layer separation |
| Multi-service interaction, API calls, PubSub | **sequence** | Tương tác theo thời gian |
| Data models, repository relationships | **class** | Cấu trúc và quan hệ |
| System overview, architecture | **component** | High-level modules |
| State transitions, job status, Redux | **state** | State machine |

--------------------------------------------------
STEP 2A — PHÂN TÍCH CODE FLOW (cho file/function input)
--------------------------------------------------

1. **Đọc source file** chính (Read tool)

2. **Nếu `--trace`**: Đọc thêm imported files (max 3 levels deep):
   - Level 1: Direct imports
   - Level 2: Imports of imports (chỉ cho services/repos)
   - Level 3: Chỉ nếu cần hiểu data flow

3. **Nếu `--focus FUNCTION`**: Chỉ phân tích function được chỉ định

4. **Xác định**:
   - Entry point (function exported/gọi đầu tiên)
   - **Layers** (Handler / Controller / Service / Repository / External)
   - Actors/Participants (services, repos, Shopify API, PubSub, Firestore)
   - Decision points (if/else, switch, error handling)
   - Async operations (await, Promise.all, publishTopic)
   - Loops (for, while, map, forEach)
   - Error paths (try/catch, throw, .catch())
   - Return values / side effects

5. **Đánh giá complexity**:
   - < 30 nodes → vẽ bình thường
   - 30-60 nodes → dùng partition/group để nhóm
   - 60-80 nodes → scale 0.8, nhóm chặt hơn
   - > 80 nodes → PHẢI tách thành 2+ diagrams (overview + detail)

--------------------------------------------------
STEP 2B — PHÂN TÍCH CONCEPT (cho free concept input)
--------------------------------------------------

Khi user cung cấp mô tả tự do (VD: "luồng thanh toán MoMo", "OAuth2 flow", "CI/CD pipeline"):

1. **Thu thập context**:
   - Hỏi user bổ sung nếu mô tả quá chung chung (ai là actors? có bao nhiêu bước?)
   - Nếu user đã mô tả đủ chi tiết → tiến hành vẽ luôn
   - Nếu concept liên quan tới codebase → tìm code liên quan bằng Grep/Glob

2. **Xác định từ mô tả**:
   - **Actors**: Ai/cái gì tham gia? (User, App, Payment Gateway, Database, v.v.)
   - **Steps**: Các bước chính theo thứ tự thời gian
   - **Decision points**: Các điểm rẽ nhánh (success/failure, điều kiện)
   - **Error/edge cases**: Timeout, payment failed, invalid data
   - **Async steps**: Callback, webhook, polling

3. **Auto-detect diagram type cho concept**:
   | Concept pattern | Type |
   |----------------|------|
   | Nhiều actors tương tác qua lại | **sequence** |
   | Luồng xử lý tuần tự có rẽ nhánh | **activity** |
   | Trạng thái chuyển đổi (pending → success → failed) | **state** |
   | Kiến trúc hệ thống, modules | **component** |
   | Mặc định cho hầu hết concept | **sequence** |

4. **Output location cho concept**: `diagrams/concepts/<tên-concept-kebab-case>.puml`
   - VD: "luồng thanh toán MoMo" → `diagrams/concepts/momo-payment-flow.puml`
   - VD: "OAuth2 flow" → `diagrams/concepts/oauth2-flow.puml`

5. **Quy tắc vẽ concept**:
   - Sử dụng kiến thức domain chính xác (VD: MoMo API thực tế, OAuth2 spec chuẩn)
   - Nếu không chắc chắn về chi tiết kỹ thuật → hỏi user hoặc ghi note trong diagram
   - Label bằng tiếng Việt hoặc Anh tùy user dùng ngôn ngữ gì
   - Ghi rõ trong header: `' Type: concept (not from code)`

--------------------------------------------------
STEP 3 — SINH PLANTUML
--------------------------------------------------

**Output location**:
- **Code-based**: `diagrams/` mirror cấu trúc source → `diagrams/packages/functions/.../file.puml`
- **Concept-based**: `diagrams/concepts/<tên-concept>.puml` → `diagrams/concepts/momo-payment-flow.puml`

**Cấu trúc file .puml**:
```plantuml
@startuml <diagram-name>
' ========================================
' <Tiêu đề mô tả>
' Source: <đường dẫn file gốc>
' Generated: <ngày tạo>
' Type: <activity|sequence|class|component|state>
' ========================================

!pragma layout smetana
scale max 1920 width

' --- Theme & Style ---
<style block hoặc skinparam từ SKILL.md>

' --- Diagram content ---
<nội dung>

caption Source: <đường dẫn ngắn>

legend right
  |= Color |= Meaning |
  | <#E8F5E9> | Normal flow |
  | <#FF6B6B> | Error path |
  | <#E3F2FD> | Shopify API |
  | <#FFF8E1> | Firestore |
endlegend

@enduml
```

**Quy tắc vẽ**:
- Mỗi function/method chính → 1 partition
- Backend flows → ƯU TIÊN swimlanes (`|Handler|`, `|Controller|`, `|Service|`, `|Repository|`)
- Tên node = tiếng Anh, ngắn gọn (< 40 chars)
- Decision labels rõ ràng (yes/no hoặc condition cụ thể)
- Error paths: `#FF6B6B` (đỏ)
- Shopify API calls: `#E3F2FD` (xanh dương nhạt)
- Firestore operations: `#FFF8E1` (vàng nhạt)
- PubSub messages: dùng `A ->> B` (async arrow) trong sequence
- Không vẽ: logging, console.log, debug, import statements
- Luôn có `caption` với source path
- Luôn có `legend` giải thích color coding

--------------------------------------------------
STEP 4 — OUTPUT & INDEX
--------------------------------------------------

1. **Tạo file .puml** bằng Write tool

2. **Cập nhật `diagrams/INDEX.md`** (tạo nếu chưa có):
```markdown
# Diagram Index

| Diagram | Source | Type | Generated |
|---------|--------|------|-----------|
| [updateAssets](packages/functions/.../updateAssets.puml) | `helpers/afterInstall/updateAssets.js` | activity | 2026-03-12 |
```

3. **Hiển thị summary**:
```
Diagram created: <đường dẫn file .puml>

| Property | Value |
|----------|-------|
| Type | <activity/sequence/class/component/state> |
| Source | <đường dẫn source file> |
| Layers | <Handler → Service → Repository> |
| Actors | <số lượng và tên> |
| Decision Points | <số lượng> |
| Nodes | <tổng số nodes> |
| Complexity | <low/medium/high> |
```

4. **Gợi ý xem**: "Mở `.puml` bằng PlantUML extension trong VS Code hoặc paste vào plantuml.com"

--------------------------------------------------
QUY TẮC ỔN ĐỊNH
--------------------------------------------------

- PHẢI đọc source code trước khi vẽ — không bao giờ vẽ từ tưởng tượng
- PHẢI áp dụng style preset từ SKILL.md
- PHẢI đặt file trong `diagrams/` (mirror cấu trúc source)
- PHẢI có header comment (source + date + type)
- PHẢI có caption + legend
- PHẢI cập nhật `diagrams/INDEX.md`
- Backend flows → ưu tiên swimlanes cho layer separation
- Không vẽ logging, debug, imports
- Node labels < 40 ký tự
- Nếu > 80 nodes → tách thành overview + detail diagrams
- Nếu file đã có diagram → hỏi user: update hay tạo mới?
