---
phase: 0
feature_slug: web-bootstrap
tier: large
status: approved
date: 2026-04-18
---

# Phase 0 — Design Input Digest

## Sources consumed

| File | Sections used |
|---|---|
| [docs/design/web-bootstrap/PRD.md](../../../docs/design/web-bootstrap/PRD.md) | All — 22 acceptance criteria, 8 user stories |
| [docs/design/web-bootstrap/DESIGN.md](../../../docs/design/web-bootstrap/DESIGN.md) | All — folder structure, file table (40+ files), data flow, decisions |
| [docs/design/web-bootstrap/mockups/REFERENCES.md](../../../docs/design/web-bootstrap/mockups/REFERENCES.md) | All — mockup references catalog |
| [docs/design/30-frontend-architecture.md](../../../docs/design/30-frontend-architecture.md) | §1 stack, §2 folder, §3 strategy, §5 auth, §6 query, §7 ws, §8 env, §9 perf |
| [docs/design/32-design-system.md](../../../docs/design/32-design-system.md) | §2 colors, §3 fonts, §4 spacing, §5 radius, §6 shadow, §7 primitives, §12 tokens.css |
| [docs/design/33-realtime-ux.md](../../../docs/design/33-realtime-ux.md) | §3 socket singleton (consumed for stub) |

## Requirements (from PRD)

**Goal:** Stand up `apps/web/` Next.js 14 monorepo workspace with full design-system
tokens, UI primitives, providers, HTTP/WS clients, and test harness — ready for slugs
2-9 to consume without further infrastructure work.

**22 acceptance criteria** (verbatim summary):

1. `apps/web/package.json` with Next 14 + React 18 + TS 5 + Tailwind 3 + TanStack
   Query 5 + socket.io-client + ky + RHF + zod + zustand + next-intl + dayjs +
   recharts + lucide-react + cva + tw-merge + clsx.
2. `next.config.mjs` App Router + VI locale + image domains.
3. `tailwind.config.ts` with token preset + content scan for app + packages/ui.
4. `src/styles/tokens.css` with CSS variables per 32 §12.
5. `src/styles/globals.css` Tailwind + tokens + font face.
6. `src/app/layout.tsx` Manrope+Inter, `<html lang="vi">`, providers, metadata.
7. `src/app/providers.tsx` QueryClient + Toaster + theme stub.
8. `src/app/page.tsx` placeholder landing.
9. `src/components/ui/` shadcn primitives: button, input, label, card, badge,
   dialog, dropdown-menu, separator, skeleton, tabs, sonner.
10. `src/lib/api/client.ts` ky instance with refresh interceptor stub.
11. `src/lib/api/types.ts` re-export from `@repo/shared`.
12. `src/lib/ws/client.ts` `getSocket()` singleton with auto-reconnect.
13. `src/lib/auth/store.ts` Zustand store stub.
14. `src/lib/queries/keys.ts` factory template.
15. `src/lib/utils/cn.ts` clsx + twMerge.
16. `.env.example` with NEXT_PUBLIC_* vars.
17. `tsconfig.json` extends `@repo/typescript-config/nextjs.json`.
18. `components.json` shadcn manifest.
19. `tests/unit/smoke.test.tsx` Vitest smoke.
20. `tests/e2e/landing.spec.ts` Playwright smoke.
21. `turbo.json` includes `apps/web` (verify).
22. `npm run dev --filter=web` runs successfully.

## Technical direction (from DESIGN)

- **Framework:** Next.js 14 App Router (RSC + streaming).
- **Stack:** TS strict, Tailwind 3.4, shadcn/ui copied locally to
  `apps/web/src/components/ui/` (NOT into `packages/ui` — avoid touching existing
  monorepo shared package).
- **Folder layout:** standard Next.js + app/, components/, lib/, styles/, types/,
  tests/. Per [DESIGN.md](../../../docs/design/web-bootstrap/DESIGN.md) "Folder structure".
- **Decisions:** ky for HTTP, sonner for toast, Vitest+RTL+Playwright for tests,
  port 3001 for dev (3000 reserved for gateway), Tailwind v3 stable (not v4 alpha).
- **Stub strategy:** auth store, WS client, HTTP refresh interceptor are skeletons
  that compile + run; slug 2 wires real auth flow; slug 5 wires real WS hooks.
- **41 files** to create, 0 to modify (root `package.json` may add convenience
  scripts; `turbo.json` only verified, not changed if `apps/*` glob is sufficient).

## Visual references

- **3 root mockups** ([../../../docs/design/webaudit.html](../../../docs/design/webaudit.html),
  [aigenerate.html](../../../docs/design/aigenerate.html),
  [learning.html](../../../docs/design/learning.html)) establish design language;
  consumed by slugs 5, 5, 9 respectively.
- **12 stitch sub-page mockups** in `docs/design/stitch_d_n_m_i/` ready for slugs
  3, 5, 9.
- For `web-bootstrap` itself, the only visual surface is a placeholder landing
  rendering the Manrope wordmark "SEO Analyst" — sufficient to verify token wiring.

## Tier classification

| Trigger | Match? | Notes |
|---|---|---|
| ≤ 2 files, copy/style tweak | ❌ | 41 files |
| 1 page or 3-5 components | ❌ | Multiple subsystems |
| Multi-page / new design-system primitive | ✅ | Introduces tokens + primitives + providers |
| Touches new API / proto / BullMQ / auth | ⚠️ partial | Touches auth STORE (stub only); no API/proto/BullMQ change |

→ **Tier = Large** (locked).
→ **Impact = scaffold-only** (no backend touch, no proto change).

## Phase 0 status

✅ All required artifacts present for Large tier:
   - `docs/design/web-bootstrap/PRD.md` (162 lines)
   - `docs/design/web-bootstrap/DESIGN.md` (200+ lines)
   - `docs/design/web-bootstrap/mockups/REFERENCES.md` (acts as mockups index)

→ Ready for Phase 1 (Onboard via Agent:Explore subagent).
