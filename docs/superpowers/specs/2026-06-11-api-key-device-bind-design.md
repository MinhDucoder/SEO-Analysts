# API Key Device-Bind — Hard-cap "one key, one install"

**Date:** 2026-06-11
**Status:** Draft → pending plan
**Owner:** improve/main
**Branch target:** TBD (likely a `feat/api-key-device-bind` cut from `improve/main`)
**Related:**
- Public API base: `apps/gateway/src/public-api/`
- Extension: `apps/extension/`
- Web: `apps/web/src/app/[locale]/(app)/settings/api-keys/`
- CLI: `packages/seo-check-cli/`
- Memory: `project_admin_godmode.md` (admin bypass policy), `project_migrations_manual_deploy.md` (manual `prisma migrate deploy`)

---

## 1. Problem

`/api/v1/public/check` is BYOK-authenticated by an `sk_(live|test)_<43>` key. Today the gateway treats **every request with a valid key as legitimate**, regardless of where it comes from. This makes the key effectively unlimited-share:

- A user on a paid plan (`api_keys_max: 5`) can create one key and hand it to 5 teammates. Each teammate gets the full per-key quota (20/min, 500/day, plus concurrency). The gateway sees 5 independent valid users; the SaaS subscription sees one.
- The same key can be used **simultaneously** from N IPs / N extension installs / curl on a server. The only enforcement is rate-limit, but rate-limit is **per-key**, not per-physical-user. Horizontal sharing is free.

Business model expects one paying user = one operator. The current implementation does not enforce that. This is the core defect we are fixing.

## 2. Goal & non-goals

**Goal:** make a single API key usable from exactly one extension install (or one CLI machine) at a time. Sharing the key string with someone else must fail at the gateway, not just be discouraged.

**Non-goals:**
- Not introducing per-user (instead of per-key) rate limits in this spec — explicitly skipped per discussion (approach "A only").
- Not changing the create / revoke / list lifecycle of keys.
- Not adding telemetry of share attempts to the admin dashboard.
- Not introducing an OAuth-like "Connect with SEO Analyst" flow — still BYOK.
- Not encrypting `chrome.storage.local` — same reasoning as `apps/extension/lib/storage.ts` doc comment.

## 3. Trust model

We do not trust the extension or the CLI to be honest. The hard guarantee we want is: **two physical operators cannot both make a successful call with the same plaintext key**.

The mechanism is a server-side recorded `installId` that the client supplies on every request. The first request after key creation (or rebind) records the value; subsequent requests with a different value are rejected.

A malicious user who knows both the key and the install_id of the legitimate device can impersonate that device — but as soon as the legitimate device makes one more request, the impersonator's next call still fails the consistency check (they collide on the same `installId` so the malicious client looks identical to the real one, which means they effectively *replace* the real one). This makes share-with-friends unworkable in practice: every request from one side eventually invalidates the other unless they coordinate per-call.

This is the same trade-off Slack/Discord client tokens make. Good enough.

## 4. Architecture

```
[Extension install]
  background.ts onInstalled
    └─ ensureInstallId()  → crypto.randomUUID() saved to chrome.storage.local key 'installId'
       (idempotent — survives reload, cleared only by user uninstall)

[Every audit request]
  popup → background → client.check({ apiKey, installId, ... })
  HTTP:
    POST /api/v1/public/check
    Authorization: Bearer sk_...
    X-Install-Id: 4f8d3a2b-1c5e-4a7f-9b2d-8e3c5f1a6d04   ← NEW

[Gateway ApiKeyGuard]
  ApiKeyService.verify(auth, installHeader)
    ┌─ regex check key + installId (UUID v4)
    ├─ Redis cache (60s, includes installId in payload)
    ├─ DB row lookup
    ├─ row.installId === null    → BIND: UPDATE installId, installBoundAt; INVALIDATE cache
    ├─ row.installId === header  → PASS
    └─ row.installId !== header  → 401 { code: 'KEY_INSTALL_MISMATCH' }

[Rebind path — user-initiated, from web only]
  Web /settings/api-keys → POST /users/me/api-keys/:id/rebind  (JWT-protected)
    └─ UPDATE installId=NULL, installBoundAt=NULL WHERE id=? AND userId=?
    └─ INVALIDATE Redis cache for that key hash
```

Why headers (not body, not param):
- `Authorization` is already a header; pairing with another header keeps the auth bundle in one place.
- Forwarded by all proxies; mirrors `Authorization` survival semantics.
- Lowercase normalised by `express` → consistent reading on the guard side.

## 5. Data model

Prisma model `ApiKey` in `apps/gateway/prisma/schema.prisma`:

```prisma
model ApiKey {
  id             String    @id @default(uuid())
  userId         String
  name           String
  prefix         String
  hashedKey      String    @unique
  environment    String
  installId      String?                           // NEW
  installBoundAt DateTime?                         // NEW
  lastUsedAt     DateTime?
  lastUsedIp     String?
  createdAt      DateTime  @default(now())
  revokedAt      DateTime?
  user           User      @relation(fields: [userId], references: [id])

  @@index([installId])
}
```

**Migration** (`apps/gateway/prisma/migrations/<ts>_apikey_install_bind/`):
- Add `installId TEXT NULL`
- Add `installBoundAt TIMESTAMP NULL`
- Add `CREATE INDEX "ApiKey_installId_idx" ON "ApiKey"("installId");`
- No backfill — existing keys carry `installId=null` and bind on first authenticated call (no breaking change for active users).
- Deployment: per memory `project_migrations_manual_deploy.md`, local watch mode does NOT auto-migrate. Must run `npx prisma migrate deploy --schema apps/gateway/prisma/schema.prisma` against the local Postgres before the new code path can be tested.

**Why nullable, not default empty string:** "never bound" and "bound to empty" are different states. `NULL` is the explicit "not yet bound" sentinel; this avoids accidentally matching a malformed client that sends `X-Install-Id: ""`.

**Why no separate `apiKeyInstall` table:** 1:1 with `ApiKey`, no history of past binds needed in v1. `installBoundAt` is sufficient audit data.

## 6. API contract changes

### 6.1 `ApiKeyService.verify` (`apps/gateway/src/public-api/services/api-key.service.ts`)

```ts
type ApiKeyVerifyResult =
  | { valid: true; apiKeyId: string; userId: string; environment: ApiKeyEnvironment }
  | { valid: false; reason:
      | 'invalid_format'
      | 'not_found'
      | 'revoked'
      | 'user_disabled'
      | 'missing_install_id'   // NEW
      | 'install_mismatch'     // NEW
    };

async verify(authHeader: string | undefined, installId: string | undefined): Promise<ApiKeyVerifyResult>
```

Behaviour:

1. As today: regex-validate the `sk_...` plaintext; reject `invalid_format` if bad. **Do this BEFORE looking at `installId`**: a malformed key must not leak an install-id error message and must not get cached.
2. Validate `installId` against `UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i`. Reject `missing_install_id` if absent or malformed.
3. Hash key, look up Redis cache. Cache payload now includes `installId` (the stored DB value, or `null` for never-bound).
4. On cache hit:
   - If cached `installId === null` → fall through to DB to do the bind transactionally; do NOT bind from cache.
   - If cached `installId === requestInstallId` → return `valid: true`.
   - Otherwise → return `install_mismatch`.
5. On cache miss: DB lookup as today (`include: { user: { select: { isLocked: true } } }`).
6. Apply the bind/match logic in section 4. The bind UPDATE goes through Prisma with `where: { id: row.id, installId: null }` (conditional update) to avoid a race where two installs land within the same millisecond — the second update will affect 0 rows and we re-read the row to compare.
7. After a successful bind (or a successful match), set the cache to the *post-state*: `{ apiKeyId, userId, environment, installId: <bound> }`. After a failed bind race re-read, recompute and cache.
8. Cache key is unchanged (`PUBLIC_API_REDIS_KEYS.apiKeyVerify(hash)`). Cache invalidation calls added on bind and on rebind.

`recordUsage` is unchanged.

### 6.2 `ApiKeyGuard` (`apps/gateway/src/public-api/guards/api-key.guard.ts`)

```ts
async canActivate(ctx) {
  const req = ctx.switchToHttp().getRequest<RequestWithApiKey>();
  const auth = req.headers?.authorization;
  const install = typeof req.headers?.['x-install-id'] === 'string'
    ? req.headers['x-install-id']
    : undefined;

  if (!auth) throw new UnauthorizedException({ code: 'MISSING_API_KEY', ... });

  const r = await this.svc.verify(auth, install);
  if (!r.valid) {
    switch (r.reason) {
      case 'user_disabled':       throw new ForbiddenException({ code: 'KEY_DISABLED', ... });
      case 'missing_install_id':  throw new UnauthorizedException({ code: 'MISSING_INSTALL_ID', message: 'X-Install-Id header required (UUID v4)' });
      case 'install_mismatch':    throw new UnauthorizedException({ code: 'KEY_INSTALL_MISMATCH', message: 'Key đang được bound thiết bị khác. Rebind tại web app hoặc dùng thiết bị gốc.' });
      default:                    throw new UnauthorizedException({ code: 'INVALID_API_KEY', ... });
    }
  }
  // unchanged below
}
```

### 6.3 New endpoint: rebind

In `apps/gateway/src/public-api/controllers/api-keys.controller.ts`:

```ts
@Post(':id/rebind')
@HttpCode(204)
@ApiOperation({ summary: 'Clear the device binding so the next request from any install rebinds the key.' })
async rebind(@Req() req: AuthedRequest, @Param('id') id: string): Promise<void> {
  await this.svc.rebind(id, req.user.id);
}
```

`ApiKeyService.rebind(id, userId)`:
- `UPDATE ApiKey SET installId=NULL, installBoundAt=NULL WHERE id=:id AND userId=:userId AND revokedAt IS NULL`
- Throws `NotFoundException({ code: 'NOT_FOUND' })` if 0 rows affected (key missing, not owner, or already revoked).
- Invalidates Redis cache for the key's hash.

### 6.4 Enriched `ApiKeyDto`

`ApiKeyDto` and `CreateApiKeyResponseDto` gain:

```ts
installId: string | null;
installBoundAt: Date | null;
```

`ApiKeysController.list()` and `create()` already SELECT all fields; just propagate them in `toDto`.

### 6.5 Error codes

Append to `docs/public-api/error-codes.md`:
- `MISSING_INSTALL_ID` — 401. Cause: extension didn't send `X-Install-Id` header, or header is not a valid UUID v4. Fix: update extension/CLI to ≥ this version.
- `KEY_INSTALL_MISMATCH` — 401. Cause: key is bound to a different install than the requester. Fix: rebind via web app, or use the original device.

Both fit the existing 15-code Vietnamese error catalogue introduced in the localisation phase (see memory `project_gateway_public_check_ai.md`).

## 7. Extension changes (`apps/extension/`)

### 7.1 New file: `lib/install-id.ts`

```ts
const STORAGE_KEY = 'installId';
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidInstallId(v: unknown): v is string {
  return typeof v === 'string' && UUID_V4_REGEX.test(v);
}

export async function loadInstallId(): Promise<string | null> {
  const out = (await chrome.storage.local.get(STORAGE_KEY)) as Record<string, unknown>;
  return isValidInstallId(out[STORAGE_KEY]) ? out[STORAGE_KEY] : null;
}

export async function ensureInstallId(): Promise<string> {
  const existing = await loadInstallId();
  if (existing) return existing;
  const fresh = crypto.randomUUID();   // available in MV3 service workers
  await chrome.storage.local.set({ [STORAGE_KEY]: fresh });
  return fresh;
}
```

Test surface mirrors `storage.spec.ts` style — node-env unit tests against a `chrome.storage.local` fake.

### 7.2 `entrypoints/background.ts`

- In the existing `chrome.runtime.onInstalled` handler, call `await ensureInstallId()` before the existing `if (!(await loadApiKey()))` check. This ensures the install_id exists by the time the first audit goes out.
- In `runAudit`, call `await ensureInstallId()` (cheap, just a storage read after first run) and pass into `check({ apiKey, installId, ... })`.

### 7.3 `lib/client.ts`

```ts
export interface CheckArgs {
  apiKey: string;
  installId: string;                 // NEW, required
  baseUrl: string;
  body: PublicCheckRequest;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}

// In the request:
headers: {
  authorization: `Bearer ${args.apiKey}`,
  'x-install-id': args.installId,    // NEW
  'content-type': 'application/json',
},
```

`installId` is a required field, not optional, so TypeScript enforces that the caller always provides it.

### 7.4 `lib/errors.ts`

Extend the 15-code dispatch with the two new codes:

```ts
KEY_INSTALL_MISMATCH: {
  vi: 'Key đang được bound thiết bị khác. Rebind tại web app hoặc dùng thiết bị gốc.',
  en: 'Key is bound to another device. Rebind via the web app or use the original device.',
  action: 'OPEN_REBIND_PAGE',
},
MISSING_INSTALL_ID: {
  vi: 'Extension chưa khởi tạo install_id. Thử tải lại extension.',
  en: 'Extension hasn\'t initialised install_id. Try reloading the extension.',
  action: 'RELOAD_EXTENSION',
},
```

`OPEN_REBIND_PAGE` action handled in popup → `chrome.tabs.create({ url: <webBase>/settings/api-keys })`.

### 7.5 Popup UI

When the audit result is an error with code `KEY_INSTALL_MISMATCH`, the existing error card gains a "Open rebind page" button (mirrors the existing "Open options" button for `MISSING_API_KEY`). No new component — extend `IssueCard` / error card consumer.

## 8. Web app changes (`apps/web/`)

### 8.1 `/settings/api-keys` page

The existing API keys table gains a "Device" column between "Environment" and "Last used":

- `installId === null` → grey badge `unbound`
- `installId !== null` → badge `bound · {installBoundAt relative}` (e.g., "3 days ago")
- Hover: full UUID + copy button (use the existing tooltip primitive)

The actions menu per row gains a "Rebind device" entry alongside the existing "Revoke":

- Confirmation dialog: title `Rebind device?`, body i18n `apiKeys.rebind.confirmBody` — "Sau khi rebind, thiết bị đang dùng key sẽ không truy cập được nữa. Thiết bị tiếp theo gọi key sẽ trở thành thiết bị mới."
- On confirm → `POST /api/v1/users/me/api-keys/:id/rebind`
- Optimistic update + toast `apiKeys.rebind.success`

### 8.2 API client

`apps/web/src/lib/api/api-keys.ts` (or wherever the existing client lives) gains `rebindApiKey(id: string): Promise<void>`.

`useApiKeys` query (TanStack Query) gets a `useRebindApiKey` mutation that invalidates the list.

### 8.3 i18n keys

Add to both `messages/en.json` and `messages/vi.json`:

```
apiKeys.column.device
apiKeys.badge.bound
apiKeys.badge.unbound
apiKeys.action.rebind
apiKeys.rebind.confirmTitle
apiKeys.rebind.confirmBody
apiKeys.rebind.success
apiKeys.rebind.errorGeneric
```

## 9. CLI compatibility (`packages/seo-check-cli/`)

The CLI also hits `/public/check` and is also affected. It must:

1. Generate and persist its own `install_id` (UUID v4) in `${XDG_CONFIG_HOME ?? ~/.config}/seo-check-cli/install-id`. File mode `0600`.
2. Send `X-Install-Id: <uuid>` on every request.
3. Document in `packages/seo-check-cli/README.md`: "Each CLI installation binds to a fresh `install_id`. Deleting the file or moving to another machine will require rebinding the key via the web app (one rebind per move)."

Mirror semantics with extension — no special `cli:` prefix, no machine ID guessing. Keeps the gateway logic uniform.

## 10. Rollout

Three phases, each behind a feature gate (env var on gateway: `API_KEY_INSTALL_BIND_MODE = 'off' | 'log' | 'enforce'`):

**Phase 1 — backend ships, mode `log`:**
- Migration applied.
- `ApiKeyGuard` reads `X-Install-Id`:
  - If header is missing/invalid → log warning, skip bind, **allow** the request (don't break clients that haven't shipped the new version yet).
  - If header is present and valid, and `row.installId === null` → bind as normal (this lets early-adopter clients start populating `installId` before enforcement flips on).
  - If header is present and valid, and `row.installId !== header` → log warning, **allow** the request (do not throw `KEY_INSTALL_MISMATCH` yet).
- Net effect: traffic patterns are observable in logs (how many requests come in without the header, how many would have been rejected) without breaking anyone.

**Phase 2 — clients ship:**
- Extension v3.6 and CLI vX.Y release with `X-Install-Id`.
- Web `/settings/api-keys` rebind UI live.

**Phase 3 — flip enforce (~2 weeks after Phase 2):**
- Set `API_KEY_INSTALL_BIND_MODE=enforce`. Missing/invalid header → 401 `MISSING_INSTALL_ID`. Mismatch → 401 `KEY_INSTALL_MISMATCH`.
- Update `docs/public-api/error-codes.md` to GA.

**Rollback:** at any phase, set the env var back to `off`. Migration columns stay (data is benign).

**Admin god-mode interplay:** the `entitlement.isAdmin(userId)` check in the controller stays. Admins still bypass rate limit. The install-bind check happens *inside* `ApiKeyGuard.verify`, so admins are subject to install-bind too — this is intentional: admins generally use the web app or curl with their own keys, and we don't want admin keys to be share-bypassable. If this becomes annoying for staff debugging on a customer's behalf, add `isAdmin` bypass to the bind step explicitly in a follow-up — but not in v1.

## 11. Tests

**Gateway unit (`apps/gateway/test/unit/api-key.service.spec.ts` — extend):**
- `verify()` with valid key + valid `installId` against a row where `installId=null` → returns `valid`, calls Prisma UPDATE with `installBoundAt`, calls Redis DEL.
- `verify()` with same key + same `installId` against row where `installId=stored` → returns `valid` from cache (no DB hit).
- `verify()` with same key + DIFFERENT `installId` → returns `{ valid: false, reason: 'install_mismatch' }`.
- `verify()` with missing/malformed install header → returns `missing_install_id`.
- `rebind()` happy path → row updated, cache invalidated.
- `rebind()` for non-owned key → throws.

Per memory `project_vitest_no_decorator_metadata.md`: construct `ApiKeyService` manually in tests, do not rely on NestJS DI in the unit layer.

**Gateway integration (`apps/gateway/test/integration/public-api.e2e-spec.ts` — extend):**
- Real Prisma, real Redis.
- Create a key as user A. POST /public/check with install_id `A1` → 200, DB row now has `installId=A1`.
- POST same key with install_id `A2` → 401 `KEY_INSTALL_MISMATCH`.
- POST same key without `X-Install-Id` (with feature flag in `enforce`) → 401 `MISSING_INSTALL_ID`.
- Same key, POST `/users/me/api-keys/:id/rebind` as user A → 204; subsequent POST with install_id `A2` now succeeds.
- POST rebind as user B → 404.

**Extension unit (`apps/extension/test/install-id.spec.ts` — new):**
- `ensureInstallId` returns existing on second call.
- `ensureInstallId` returns new UUID v4 on first call.
- `loadInstallId` returns null when storage is empty.
- `loadInstallId` returns null when storage has a malformed string (defence in depth).

**Extension unit (`apps/extension/test/client.spec.ts` — extend):**
- `check` includes `x-install-id` header in the fetch request.

**Manual E2E (Phase complete checklist before flipping to enforce):**
1. Create key A on web.
2. Paste into Chrome install 1 → audit OK; verify DB row `installId` populated.
3. Paste same key into Chrome install 2 (separate profile, separate `chrome.storage.local`) → audit fails `KEY_INSTALL_MISMATCH`.
4. On web, rebind key A → audit from install 2 succeeds; immediate next audit from install 1 fails `KEY_INSTALL_MISMATCH`.

## 12. Open questions

- **Should rebind cost a rate-limit token?** Cheap to abuse without auth, but it IS auth'd (JWT). Probably fine without throttle; reconsider if we see abuse.
- **Should we email the owner on rebind?** Nice-to-have, low priority. Skip for v1.
- **Audit log for rebinds?** Useful for security-conscious customers. Skip for v1; the `installBoundAt` timestamp gives one row of history. If we need full history, add `ApiKeyBindHistory` table later.
- **What about the `seo-check-cli` published version?** Not blocking the extension rollout — Phase 1 (`log` mode) keeps CLI working unchanged. CLI ship can happen in Phase 2 alongside or after extension.

## 13. Out of scope (explicit)

- Per-user rate limits (Approach C from discussion). User asked for "A only".
- OAuth-like connect flow (replacing paste-key UX with `chrome.identity` / deep-link handshake).
- Multi-key switching UI in extension.
- Encrypting `chrome.storage.local` for the key (already argued against in `lib/storage.ts`).
- Quota display in the popup (separate UX initiative).

---
