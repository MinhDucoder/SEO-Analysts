# PHASE 2 CHECKPOINT — pencil persist BLOCKED

**Time**: 2026-05-10 ~10:30
**Branch**: `feat/web-fresh` HEAD `2531755`
**Status**: 5 domain + 6 AppShell components built **in pencil memory**, NOT persisted to disk.

## ⚠️ Blocker

`design/system-tokens.pen` MD5 unchanged: `04b344528143a5c919e510a9d2aee00e` (262995 bytes from 2026-05-09 16:34).

All Phase 2 foundation work (5 domain + 6 AppShell components) is held **in-memory by pencil MCP server** (PID 96823). VS Code autoSave does NOT trigger because the .pen file is not open as the pencil custom editor's active tab.

Same root cause as Phase 1 pre-breakthrough: pencil writes to its in-memory state, not to disk. VS Code only autoSaves text editor buffers — pencil canvas changes never reach VS Code's dirty-state.

## ✅ What's done in pencil memory (will be LOST if pencil server stops)

### 5 Domain components added to frame `tGelB`:

| Component | ID | Notes |
|---|---|---|
| ScoreDelta | `n1MOW` | Pill shape, +5.2 green example. Children: deltaIcon `j7jwG`, deltaLabel `knyTV` |
| RuleResultRow | `ssYiN` | 960w horizontal row. Children: statusIcon `O6w6Sz`, nameCol `M7t86` (ruleName `eeJNd`, ruleMeta `JkzjR`), scoreBadge `uqeib` (scoreVal `ezpgW`), ruleWeight `R8hMgV`, chevron `JRvVR` |
| CwvCard | `PGwdO` | 960w card, 3 metric (LCP/INP/CLS) inline. Header `h1Li51` (cwvTitle `R1YDjR`, cwvSub `bqHIR`), metricRow `YJowB` with 3 metric frames `LdKAx`/`ctGIP`/`WZOlh` |
| KeywordTable | `TXFZz` | 960w, header `L4Dank` (8 cols) + 1 sample row `I4oYpB` (8 cells with check/x icons + rank) |
| CategoryRadar | `jIcAb` | 340×340, hexOuter `S5uWv`, hexMid `pNBl8`, axisV `Shoxu`, dataPolygon `RjafA` (#22C55E33 fill), 6 axis text labels + 6 vertex ellipses |

### 6 AppShell components added to NEW frame `JtSvc` (top-level, x=0 y=4570):

| Component | ID | Notes |
|---|---|---|
| Sidebar/NavItem | `lHH3k` | 208w horizontal item, navIcon `W1fXe`, navLabel `yI9JR`. Default fill transparent |
| Sidebar/Header | `EpH1u` | 240×64, logoIcon `VsL4n`, logoText `M3LzGz`, collapseToggle `G9eImt` |
| Sidebar/Footer | `O4rhI` | 240w, avatar ellipse `hGEGd`, userName `qyO11`, userPlan `MUNWG`, themeToggle `bT2lL` |
| Sidebar/Container | `hjgEm` | 240×720, embeds Header `EpH1u` + 6 NavItems (overview ZmBHC active, audits TitXQ, scheduled RzcxC, compare fcZVj, settings B5ke8, admin LbZ3E) + Footer |
| Topbar | `uqtHE` | 1200×56, breadcrumb (crumb1 `sV4ak`, crumbSep `CPja2`, crumb2 `so1f9`) + actions slot (`tkerq`) with bell + user menu icons |
| AppShell/Wrapper | `oNDBJ` | 1440×820, horizontal layout: Sidebar (240w) + mainCol `lu6Li` (Topbar + mainSlot `oZFJO` slot for page content) |

### Foundation file structure summary

- 4 top-level frames: Tokens (`StUxZ`), Base (`w7tVO`), Domain (`tGelB`), AppShell (`JtSvc`)
- 26 page state frames (Phase 1 done)
- **17 reusable components total**: 11 from Phase 1 + 5 domain + 6 AppShell

## 🔧 How to unblock

User cần làm 1 trong 2:

### Option A — Manual save trong VS Code (faster nếu VS Code đã mở)
1. Mở VS Code workspace `/media/minhducoder/New Volume2/Learn_On_Drive/DO_AN/`
2. File Explorer → click `design/system-tokens.pen` → mở bằng pencil custom editor
3. Click vào canvas → bấm Ctrl+S
4. Verify: `md5sum design/system-tokens.pen` should show new MD5
5. `git diff --stat design/system-tokens.pen` should show changes
6. Resume Claude Code session

### Option B — Restart pencil + redo (worst case)
Nếu pencil server crash trước khi save → ALL work mất. Phải redo từ đầu (5 domain + 6 AppShell).

## 📍 Where we were before block

Just finished `batch_design` cho 6 AppShell components. About to commit foundation extension. Then continue with 9 Phase 2 pages in this order:
1. A1: settings (6 states) + audit-create (5) + audit-list (5)
2. A2: audit-detail (11 states — heaviest)
3. A3: audit-compare (4) + scheduled-list (3)
4. A4: admin-stats (3) + admin-users (4) + admin-rules (4)

Total remaining: 9 pages × ~5 states = ~45 state frames.

## Component ID quick-ref (for next session prompt)

```
# Phase 1 (already in foundation — persisted)
Button/Primary o8AJkQ, Secondary NaTK3, Outline QThUr, Ghost VDsXn, Destructive tibBu
Input/Default F7L51P (label hAriX, box A0Qou, placeholder tgH70)
Card h62450 (header iuXjT, body ndInL)
Badge/Success o7UmW, Error GSTlC, Warn lXuzr
ScoreRing/Lg lHEAG (track d8oK6m, fill iAuA4, num GM65e, suffix S9h7E)

# Phase 2 (in pencil memory — NEED PERSIST)
ScoreDelta n1MOW
RuleResultRow ssYiN
CwvCard PGwdO
KeywordTable TXFZz
CategoryRadar jIcAb
Sidebar/NavItem lHH3k
Sidebar/Header EpH1u
Sidebar/Footer O4rhI
Sidebar/Container hjgEm
Topbar uqtHE
AppShell/Wrapper oNDBJ
```
