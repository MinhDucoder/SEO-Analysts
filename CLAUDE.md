<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a persistent knowledge graph (407 files, ~2.1k nodes,
~15k edges). ALWAYS use graph MCP tools BEFORE Grep/Glob/Read for structural
questions.** Graph is cheaper (fewer tokens), faster, and answers "who calls X",
"what does X import", "which tests cover X" in one call instead of many.

See also: `.claude/CLAUDE.md` (system brain), `apps/CLAUDE.md` (service map).

### Decision tree — task → tool

| Task | First tool | Second |
|---|---|---|
| "What does this PR change / is it risky?" | `detect_changes_tool` | `get_affected_flows_tool` |
| "Who calls / depends on X?" | `query_graph_tool(pattern="callers_of", node="X")` | `get_impact_radius_tool` |
| "Where is function/class X defined?" | `semantic_search_nodes_tool(query="X")` | `query_graph_tool(pattern="children_of")` |
| "Is X tested? what covers it?" | `query_graph_tool(pattern="tests_for", node="X")` | — |
| "Explain the codebase / a module" | `get_architecture_overview_tool` | `list_communities_tool` + `get_community_tool` |
| "Full source for review" | `get_review_context_tool` | `get_minimal_context_tool` |
| "Plan a rename / find dead code" | `refactor_tool(mode="rename"\|"dead_code")` | — |

### Token-efficiency rules (mandatory)

- ALWAYS start a graph task with `get_minimal_context_tool(task="…")`.
- Use `detail_level="minimal"` on every call; escalate to `"standard"` only if minimal is insufficient.
- Target: ≤5 graph tool calls and ≤800 output tokens per review/debug/refactor task.

### DO NOT use Grep/Glob for these (use graph)

- Finding callers → NOT `grep -r "funcName("`. Use `query_graph_tool(pattern="callers_of")`.
- Finding importers → NOT `grep -r "from .* import X"`. Use `query_graph_tool(pattern="imports_of")`.
- Finding tests of X → NOT `grep -r "describe.*X"`. Use `query_graph_tool(pattern="tests_for")`.
- Mapping a module → NOT `ls + cat`. Use `get_community_tool` / `get_architecture_overview_tool`.

### When graph is NOT authoritative — fall back to Grep/Read

Graph indexes symbol references. It will MISS:
- Dynamic dispatch: `this[methodName]()`, `eval`, reflection, DI container lookups by string token.
- String-based imports/keys: NestJS `Reflector` metadata keys, BullMQ queue names, Socket.IO event names, gRPC method strings.
- Comments, TODOs, docstrings, Markdown content — full-text search only.
- Generated code excluded by `.code-review-graphignore` (`*.generated.ts`, `*_pb2.py`, `vendor/`, `dist/`).
- Cross-service gRPC wires — graph sees proto usage inside one service, not end-to-end call paths.

If your question is about any of the above, use Grep/Read.

### Pre-commit review workflow (concrete)

```bash
# 1. Staged-change risk scan (also runs as .git/hooks/pre-commit --brief)
code-review-graph detect-changes
```

Then in Claude: `detect_changes_tool` → for each HIGH-risk symbol: `get_impact_radius_tool(node=...)` → `query_graph_tool(pattern="tests_for")` → if no tests, propose test or flag. Finish with `get_affected_flows_tool` to confirm no critical flow broken.

### Auto-update

PostToolUse hook runs `code-review-graph update --skip-flows` after Edit/Write/Bash. Run `code-review-graph postprocess` manually if you need flows/communities refresh.
