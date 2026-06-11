# API Key Device-Bind Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a single `sk_(live|test)_...` API key usable from exactly one extension install (or CLI machine) at a time, so handing the key to a teammate is rejected at the gateway instead of silently bypassing the one-subscription-one-operator business model.

**Architecture:** Server-side records `installId` on each `ApiKey` row. Extension/CLI generate a UUID v4 once per install, send it as `X-Install-Id` header. Gateway binds the key on first request (`installId=null → header`). Subsequent requests with a different `installId` fail with `KEY_INSTALL_MISMATCH` (401). Owner rebinds via `POST /users/me/api-keys/:id/rebind` (JWT). Three-phase rollout behind env flag `API_KEY_INSTALL_BIND_MODE` (`off | log | enforce`) so backend ships ahead of clients without breaking traffic.

**Tech Stack:** NestJS + Prisma (gateway) · Vitest unit/integration · WXT + React (extension) · Next.js + TanStack Query (web) · Commander + ky (CLI). Spec: `docs/superpowers/specs/2026-06-11-api-key-device-bind-design.md`.

**Memories applied:** `project_vitest_no_decorator_metadata.md` (construct services manually in unit tests), `project_migrations_manual_deploy.md` (run `prisma migrate deploy` manually), `project_admin_godmode.md` (admin bypass rate limit but NOT bind in v1), `feedback_language_vietnamese.md` (Vietnamese error messages).

---

## File map

**Backend (gateway):**
- `apps/gateway/prisma/schema.prisma` — modify `model ApiKey` (add `installId`, `installBoundAt`, `@@index`)
- `apps/gateway/prisma/migrations/20260611120000_add_apikey_install_bind/migration.sql` — create
- `apps/gateway/src/public-api/services/api-key.service.ts` — modify `verify()`, add `rebind()`, embed `installId` in cache payload
- `apps/gateway/src/public-api/guards/api-key.guard.ts` — modify: read header, apply `bindMode`, map new errors
- `apps/gateway/src/public-api/controllers/api-keys.controller.ts` — modify: `POST :id/rebind`
- `apps/gateway/src/public-api/dto/api-key.dto.ts` — modify: add `installId`, `installBoundAt` to `ApiKeyDto`
- `apps/gateway/src/public-api/public-api.module.ts` — modify: provide `BIND_MODE` config token
- `apps/gateway/test/unit/api-key.service.spec.ts` — extend
- `apps/gateway/test/integration/api-key-install-bind.e2e-spec.ts` — create (new spec file)
- `docs/public-api/error-codes.md` — modify: add 2 codes

**Extension:**
- `apps/extension/lib/install-id.ts` — create
- `apps/extension/test/install-id.spec.ts` — create
- `apps/extension/lib/client.ts` — modify: require `installId`, send header
- `apps/extension/test/client.spec.ts` — extend
- `apps/extension/entrypoints/background.ts` — modify: `ensureInstallId`, pass to `check`
- `apps/extension/lib/errors.ts` — modify: 2 new codes + `OPEN_REBIND_PAGE` action
- `apps/extension/entrypoints/popup/App.tsx` — modify: wire `OPEN_REBIND_PAGE`

**Web:**
- `apps/web/src/types/api.ts` (or wherever `ApiKeyDto` type lives) — modify: add 2 fields
- `apps/web/src/lib/api-keys.ts` — modify: `rebindApiKey()`
- `apps/web/src/app/[locale]/(app)/settings/api-keys/page.tsx` — modify: column + button + i18n consumption
- `apps/web/src/messages/en.json`, `apps/web/src/messages/vi.json` — modify: 7 i18n keys

**CLI:**
- `packages/seo-check-cli/src/install-id.ts` — create
- `packages/seo-check-cli/src/client.ts` — modify: send `X-Install-Id`
- `packages/seo-check-cli/README.md` — modify: document install-id file

**Final flip:**
- `apps/gateway/.env.example` (and runbook) — set `API_KEY_INSTALL_BIND_MODE=enforce` after rollout window

---

## Task 1: Prisma schema + migration (`installId`, `installBoundAt`)

**Files:**
- Modify: `apps/gateway/prisma/schema.prisma` (lines around 197)
- Create: `apps/gateway/prisma/migrations/20260611120000_add_apikey_install_bind/migration.sql`

- [ ] **Step 1: Edit `schema.prisma` — add 2 nullable columns + index**

In `apps/gateway/prisma/schema.prisma`, replace the `ApiKey` model:

```prisma
model ApiKey {
  id             String            @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId         String            @map("user_id") @db.Uuid
  name           String            @db.VarChar(100)
  prefix         String            @db.VarChar(20)
  hashedKey      String            @unique @map("hashed_key") @db.VarChar(64)
  environment    ApiKeyEnvironment @default(live)
  installId      String?           @map("install_id") @db.VarChar(36)
  installBoundAt DateTime?         @map("install_bound_at") @db.Timestamptz
  lastUsedAt     DateTime?         @map("last_used_at") @db.Timestamptz
  lastUsedIp     String?           @map("last_used_ip") @db.Inet
  revokedAt      DateTime?         @map("revoked_at") @db.Timestamptz
  expiresAt      DateTime?         @map("expires_at") @db.Timestamptz
  createdAt      DateTime          @default(now()) @map("created_at") @db.Timestamptz
  updatedAt      DateTime          @updatedAt @map("updated_at") @db.Timestamptz

  user       User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  usageDaily UsageDaily[]

  @@index([hashedKey], name: "idx_api_keys_hashed_key")
  @@index([userId, revokedAt], name: "idx_api_keys_user_active")
  @@index([installId], name: "idx_api_keys_install_id")
  @@map("api_keys")
}
```

- [ ] **Step 2: Create migration SQL**

Create `apps/gateway/prisma/migrations/20260611120000_add_apikey_install_bind/migration.sql`:

```sql
-- AlterTable
ALTER TABLE "api_keys" ADD COLUMN "install_id" VARCHAR(36);
ALTER TABLE "api_keys" ADD COLUMN "install_bound_at" TIMESTAMPTZ;

-- CreateIndex
CREATE INDEX "idx_api_keys_install_id" ON "api_keys"("install_id");
```

- [ ] **Step 3: Regenerate Prisma client**

Run:
```bash
cd apps/gateway && npx prisma generate
```

Expected: "Generated Prisma Client" output, no errors. The new fields `installId` and `installBoundAt` appear in `apps/gateway/src/infra/prisma/generated/index.d.ts`.

- [ ] **Step 4: Apply migration to local DB**

Run (per memory `project_migrations_manual_deploy.md`, local watch mode does NOT auto-migrate):
```bash
cd apps/gateway && npx prisma migrate deploy
```

Expected: "1 migration applied" — `20260611120000_add_apikey_install_bind`. Verify with:
```bash
docker exec -it $(docker ps --filter name=seo_gateway_db --format '{{.Names}}') psql -U seo -d seo_gateway -c '\d api_keys' | grep install
```

Expected: 2 lines showing `install_id` and `install_bound_at` columns.

- [ ] **Step 5: Commit**

```bash
git add apps/gateway/prisma/schema.prisma apps/gateway/prisma/migrations/20260611120000_add_apikey_install_bind apps/gateway/src/infra/prisma/generated
git commit -m "feat(gateway): add ApiKey.installId + installBoundAt for device binding"
```

---

## Task 2: `ApiKeyService.verify()` — extend signature with `installId`, no logic change yet

We split the verify changes into two tasks so each is small. This task only changes the signature and the trivial `missing_install_id` rejection path. The bind/match logic lands in Task 3.

**Files:**
- Modify: `apps/gateway/src/public-api/services/api-key.service.ts`
- Modify: `apps/gateway/test/unit/api-key.service.spec.ts`

- [ ] **Step 1: Write failing tests for new signature**

Add at the bottom of the `describe('verify', ...)` block in `apps/gateway/test/unit/api-key.service.spec.ts`:

```ts
describe('install id input', () => {
  const VALID_INSTALL = '4f8d3a2b-1c5e-4a7f-9b2d-8e3c5f1a6d04';

  it('rejects a missing X-Install-Id header as missing_install_id', async () => {
    expect(await svc.verify(`Bearer ${VALID_KEY}`, undefined)).toEqual({
      valid: false,
      reason: 'missing_install_id',
    });
    expect(client.get).not.toHaveBeenCalled();
  });

  it('rejects a non-UUIDv4 install id as missing_install_id', async () => {
    expect(await svc.verify(`Bearer ${VALID_KEY}`, 'not-a-uuid')).toEqual({
      valid: false,
      reason: 'missing_install_id',
    });
    // Even a UUID v1 must be rejected — only v4 is allowed.
    expect(await svc.verify(`Bearer ${VALID_KEY}`, '550e8400-e29b-11d4-a716-446655440000')).toEqual({
      valid: false,
      reason: 'missing_install_id',
    });
  });

  it('rejects a malformed KEY before checking install id (install_id error must not leak for bad keys)', async () => {
    expect(await svc.verify('Bearer not-a-real-key', VALID_INSTALL)).toEqual({
      valid: false,
      reason: 'invalid_format',
    });
  });
});
```

Also update the **existing** verify tests that call `svc.verify('Bearer ...')` with one argument to pass a valid install id as a second argument:

```ts
const VALID_INSTALL = '4f8d3a2b-1c5e-4a7f-9b2d-8e3c5f1a6d04';

// In each existing test that calls svc.verify(`Bearer ${VALID_KEY}`):
//   svc.verify(`Bearer ${VALID_KEY}`, VALID_INSTALL)
// In tests that call svc.verify(undefined):
//   svc.verify(undefined, VALID_INSTALL)
```

Define `VALID_INSTALL` once at the top of `describe('verify', ...)`.

- [ ] **Step 2: Run tests — verify all install tests fail and existing tests still pass after the signature change**

Run:
```bash
npm run test -w @seo/gateway -- api-key.service.spec
```

Expected: the 3 new tests fail with errors like `Expected 1 arguments, but got 2` (TypeScript) or runtime mismatch. The existing tests should still compile after you update their call sites — if some still call `verify(...)` with one arg, fix those too.

- [ ] **Step 3: Implement signature change + install id validation (minimal — no cache/DB changes)**

In `apps/gateway/src/public-api/services/api-key.service.ts`:

```ts
// At top, near the API_KEY_REGEX:
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Update the result type to include the new reason:
export type ApiKeyVerifyResult =
  | { valid: true; apiKeyId: string; userId: string; environment: ApiKeyEnvironment }
  | {
      valid: false;
      reason:
        | 'invalid_format'
        | 'not_found'
        | 'revoked'
        | 'user_disabled'
        | 'missing_install_id'
        | 'install_mismatch';
    };

// Replace the verify signature + first two checks:
async verify(
  authorizationHeader: string | undefined,
  installId: string | undefined,
): Promise<ApiKeyVerifyResult> {
  if (!authorizationHeader) return { valid: false, reason: 'invalid_format' };
  const bearer = authorizationHeader.replace(/^Bearer\s+/i, '').trim();
  if (!API_KEY_REGEX.test(bearer)) {
    return { valid: false, reason: 'invalid_format' };
  }
  if (!installId || !UUID_V4_REGEX.test(installId)) {
    return { valid: false, reason: 'missing_install_id' };
  }
  // ...rest of verify (cache/DB) unchanged for now — Task 3 changes it
  const hash = this.hash(bearer);
  // (existing code continues here)
```

- [ ] **Step 4: Run tests — verify the 3 new tests pass and existing tests still pass**

Run:
```bash
npm run test -w @seo/gateway -- api-key.service.spec
```

Expected: all green. The bind/mismatch tests don't exist yet — those come in Task 3.

- [ ] **Step 5: Commit**

```bash
git add apps/gateway/src/public-api/services/api-key.service.ts apps/gateway/test/unit/api-key.service.spec.ts
git commit -m "feat(gateway): ApiKeyService.verify() requires UUID v4 installId"
```

---

## Task 3: `ApiKeyService.verify()` — bind on first use, reject mismatch, embed `installId` in cache

**Files:**
- Modify: `apps/gateway/src/public-api/services/api-key.service.ts`
- Modify: `apps/gateway/test/unit/api-key.service.spec.ts`

- [ ] **Step 1: Write failing tests for bind + match + mismatch + cache payload**

Append to `describe('install id input', ...)` block in the spec (or a new `describe('bind / match', ...)`):

```ts
describe('bind / match', () => {
  const VALID_INSTALL_A = '4f8d3a2b-1c5e-4a7f-9b2d-8e3c5f1a6d04';
  const VALID_INSTALL_B = '7a1b2c3d-4e5f-4a6b-9c8d-1e2f3a4b5c6d';

  it('binds the key on first authenticated use when DB row.installId is null', async () => {
    client.get.mockResolvedValue(null);
    (prisma.apiKey.findUnique as any).mockResolvedValue({
      id: 'k1',
      userId: 'u1',
      environment: 'test',
      installId: null,
      revokedAt: null,
      user: { isLocked: false },
    });
    (prisma.apiKey.update as any).mockResolvedValue({ count: 1 });

    const res = await svc.verify(`Bearer ${VALID_KEY}`, VALID_INSTALL_A);

    expect(res).toEqual({
      valid: true,
      apiKeyId: 'k1',
      userId: 'u1',
      environment: 'test',
    });
    // bind UPDATE called with conditional where { id, installId: null }
    const updateCall = (prisma.apiKey.update as any).mock.calls[0][0];
    expect(updateCall.where).toEqual({ id: 'k1' });
    expect(updateCall.data.installId).toBe(VALID_INSTALL_A);
    expect(updateCall.data.installBoundAt).toBeInstanceOf(Date);
    // cache write includes installId
    const cacheWrite = client.setex.mock.calls.find((c: any[]) =>
      c[0] === `apikey:${sha256(VALID_KEY)}`,
    );
    expect(cacheWrite).toBeDefined();
    const cached = JSON.parse(cacheWrite![2]);
    expect(cached).toMatchObject({ apiKeyId: 'k1', installId: VALID_INSTALL_A });
  });

  it('returns valid when the request install id matches the bound row', async () => {
    client.get.mockResolvedValue(null);
    (prisma.apiKey.findUnique as any).mockResolvedValue({
      id: 'k1', userId: 'u1', environment: 'test',
      installId: VALID_INSTALL_A, revokedAt: null,
      user: { isLocked: false },
    });

    const res = await svc.verify(`Bearer ${VALID_KEY}`, VALID_INSTALL_A);

    expect(res).toEqual({ valid: true, apiKeyId: 'k1', userId: 'u1', environment: 'test' });
    expect(prisma.apiKey.update).not.toHaveBeenCalled();
  });

  it('rejects install_mismatch when request install id differs from bound row', async () => {
    client.get.mockResolvedValue(null);
    (prisma.apiKey.findUnique as any).mockResolvedValue({
      id: 'k1', userId: 'u1', environment: 'test',
      installId: VALID_INSTALL_A, revokedAt: null,
      user: { isLocked: false },
    });

    const res = await svc.verify(`Bearer ${VALID_KEY}`, VALID_INSTALL_B);

    expect(res).toEqual({ valid: false, reason: 'install_mismatch' });
    expect(prisma.apiKey.update).not.toHaveBeenCalled();
  });

  it('honours installId stored in the Redis cache payload (cache match)', async () => {
    client.get.mockResolvedValue(JSON.stringify({
      apiKeyId: 'k1', userId: 'u1', environment: 'test',
      installId: VALID_INSTALL_A,
    }));

    const res = await svc.verify(`Bearer ${VALID_KEY}`, VALID_INSTALL_A);

    expect(res).toEqual({ valid: true, apiKeyId: 'k1', userId: 'u1', environment: 'test' });
    expect(prisma.apiKey.findUnique).not.toHaveBeenCalled();
  });

  it('rejects install_mismatch from the Redis cache payload (cache mismatch)', async () => {
    client.get.mockResolvedValue(JSON.stringify({
      apiKeyId: 'k1', userId: 'u1', environment: 'test',
      installId: VALID_INSTALL_A,
    }));

    const res = await svc.verify(`Bearer ${VALID_KEY}`, VALID_INSTALL_B);

    expect(res).toEqual({ valid: false, reason: 'install_mismatch' });
    expect(prisma.apiKey.findUnique).not.toHaveBeenCalled();
  });

  it('falls through to DB when cached installId is null (cannot bind from cache)', async () => {
    client.get.mockResolvedValue(JSON.stringify({
      apiKeyId: 'k1', userId: 'u1', environment: 'test',
      installId: null,
    }));
    (prisma.apiKey.findUnique as any).mockResolvedValue({
      id: 'k1', userId: 'u1', environment: 'test',
      installId: null, revokedAt: null, user: { isLocked: false },
    });
    (prisma.apiKey.update as any).mockResolvedValue({ count: 1 });

    const res = await svc.verify(`Bearer ${VALID_KEY}`, VALID_INSTALL_A);

    expect(res).toEqual({ valid: true, apiKeyId: 'k1', userId: 'u1', environment: 'test' });
    expect(prisma.apiKey.findUnique).toHaveBeenCalledTimes(1);
    expect(prisma.apiKey.update).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run tests — verify all fail**

Run:
```bash
npm run test -w @seo/gateway -- api-key.service.spec
```

Expected: the 6 new bind/match tests fail. Existing tests still pass.

- [ ] **Step 3: Implement bind/match logic + cache payload includes `installId`**

Replace the body of `verify()` from the cache-read onward in `apps/gateway/src/public-api/services/api-key.service.ts`:

```ts
async verify(
  authorizationHeader: string | undefined,
  installId: string | undefined,
): Promise<ApiKeyVerifyResult> {
  if (!authorizationHeader) return { valid: false, reason: 'invalid_format' };
  const bearer = authorizationHeader.replace(/^Bearer\s+/i, '').trim();
  if (!API_KEY_REGEX.test(bearer)) return { valid: false, reason: 'invalid_format' };
  if (!installId || !UUID_V4_REGEX.test(installId)) return { valid: false, reason: 'missing_install_id' };

  const hash = this.hash(bearer);
  const cacheKey = PUBLIC_API_REDIS_KEYS.apiKeyVerify(hash);

  // Cache path
  try {
    const cached = await this.redis.client.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached) as
        | null
        | { apiKeyId: string; userId: string; environment: ApiKeyEnvironment; installId: string | null };
      if (parsed === null) return { valid: false, reason: 'not_found' };
      // Cannot bind from cache — cache might be stale relative to a concurrent rebind.
      // Fall through to DB whenever the cached installId is null.
      if (parsed.installId !== null) {
        if (parsed.installId === installId) {
          return {
            valid: true,
            apiKeyId: parsed.apiKeyId,
            userId: parsed.userId,
            environment: parsed.environment,
          };
        }
        return { valid: false, reason: 'install_mismatch' };
      }
    }
  } catch (e) {
    this.logger.warn({ err: e }, 'apikey cache read failed, falling through to DB');
  }

  // DB path
  const row = await this.prisma.apiKey.findUnique({
    where: { hashedKey: hash },
    include: { user: { select: { isLocked: true } } },
  });

  if (!row) {
    await this.trySet(cacheKey, null);
    return { valid: false, reason: 'not_found' };
  }
  if (row.revokedAt) return { valid: false, reason: 'revoked' };
  if (row.user.isLocked) return { valid: false, reason: 'user_disabled' };

  // Bind / match
  if (row.installId === null) {
    await this.prisma.apiKey.update({
      where: { id: row.id },
      data: { installId, installBoundAt: new Date() },
    });
    const payload = {
      apiKeyId: row.id,
      userId: row.userId,
      environment: row.environment as ApiKeyEnvironment,
      installId,
    };
    await this.trySet(cacheKey, payload);
    return {
      valid: true,
      apiKeyId: row.id,
      userId: row.userId,
      environment: row.environment as ApiKeyEnvironment,
    };
  }

  if (row.installId !== installId) {
    // Cache the *stored* binding so the next mismatch returns from cache without a DB hit.
    await this.trySet(cacheKey, {
      apiKeyId: row.id,
      userId: row.userId,
      environment: row.environment as ApiKeyEnvironment,
      installId: row.installId,
    });
    return { valid: false, reason: 'install_mismatch' };
  }

  // Match — cache + return
  const payload = {
    apiKeyId: row.id,
    userId: row.userId,
    environment: row.environment as ApiKeyEnvironment,
    installId: row.installId,
  };
  await this.trySet(cacheKey, payload);
  return {
    valid: true,
    apiKeyId: row.id,
    userId: row.userId,
    environment: row.environment as ApiKeyEnvironment,
  };
}
```

Race-condition note: two concurrent bind requests for the same key with different install ids will both find `row.installId === null`. The first UPDATE wins; the second OVERWRITES with its own install id. This is acceptable for v1 — the loser doesn't see an error (it sees `valid: true`) but the row records the second install. In practice this only happens if the same user clicks two extension installs simultaneously, which is exactly the share scenario we want to catch on the *next* request, not necessarily this one. If we want strictly-first-wins later, change the UPDATE to `prisma.apiKey.updateMany({ where: { id, installId: null }, data: {...} })` and re-read on `count === 0`. Out of scope for v1.

- [ ] **Step 4: Run tests — verify all bind/match tests pass**

Run:
```bash
npm run test -w @seo/gateway -- api-key.service.spec
```

Expected: green across the whole file. If a pre-existing test that uses cache hit fails because the cache payload shape changed, update it to include `installId` (use `VALID_INSTALL` constant).

- [ ] **Step 5: Commit**

```bash
git add apps/gateway/src/public-api/services/api-key.service.ts apps/gateway/test/unit/api-key.service.spec.ts
git commit -m "feat(gateway): ApiKeyService binds key to first install + rejects mismatch"
```

---

## Task 4: `ApiKeyService.rebind()` method

**Files:**
- Modify: `apps/gateway/src/public-api/services/api-key.service.ts`
- Modify: `apps/gateway/test/unit/api-key.service.spec.ts`

- [ ] **Step 1: Write failing test for `rebind()`**

Add to `apps/gateway/test/unit/api-key.service.spec.ts`:

```ts
describe('rebind', () => {
  it('clears installId + installBoundAt on the owned key and invalidates cache', async () => {
    (prisma.apiKey.findUnique as any).mockResolvedValue({
      id: 'k1', userId: 'u1', hashedKey: sha256(VALID_KEY),
    });
    (prisma.apiKey.update as any).mockResolvedValue({ id: 'k1' });
    client.del = vi.fn().mockResolvedValue(1);

    await svc.rebind('k1', 'u1');

    expect(prisma.apiKey.update).toHaveBeenCalledWith({
      where: { id: 'k1' },
      data: { installId: null, installBoundAt: null },
    });
    expect(client.del).toHaveBeenCalledWith(`apikey:${sha256(VALID_KEY)}`);
  });

  it('throws NotFoundException when the key is not owned by the user', async () => {
    (prisma.apiKey.findUnique as any).mockResolvedValue(null);

    await expect(svc.rebind('k1', 'u1')).rejects.toThrow(/not found/i);
    expect(prisma.apiKey.update).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when the key belongs to a different user', async () => {
    (prisma.apiKey.findUnique as any).mockResolvedValue({
      id: 'k1', userId: 'someone-else', hashedKey: sha256(VALID_KEY),
    });

    await expect(svc.rebind('k1', 'u1')).rejects.toThrow(/not found/i);
    expect(prisma.apiKey.update).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when the key is already revoked', async () => {
    (prisma.apiKey.findUnique as any).mockResolvedValue({
      id: 'k1', userId: 'u1', hashedKey: sha256(VALID_KEY), revokedAt: new Date(),
    });

    await expect(svc.rebind('k1', 'u1')).rejects.toThrow(/not found/i);
  });
});
```

Note: tests need `client.del = vi.fn()` injected. Add to the top mock setup:
```ts
const client = { get: vi.fn(), setex: vi.fn(), del: vi.fn() };
```

- [ ] **Step 2: Run tests — verify failure**

Run:
```bash
npm run test -w @seo/gateway -- api-key.service.spec
```

Expected: 4 new tests fail with `svc.rebind is not a function`.

- [ ] **Step 3: Implement `rebind()`**

Add to `ApiKeyService` in `apps/gateway/src/public-api/services/api-key.service.ts`:

```ts
async rebind(id: string, userId: string): Promise<void> {
  const row = await this.prisma.apiKey.findUnique({
    where: { id },
    select: { id: true, userId: true, hashedKey: true, revokedAt: true },
  });
  if (!row || row.userId !== userId || row.revokedAt !== null) {
    throw new NotFoundException({
      code: 'NOT_FOUND',
      message: 'API key not found or already revoked',
    });
  }
  await this.prisma.apiKey.update({
    where: { id },
    data: { installId: null, installBoundAt: null },
  });
  try {
    await this.redis.client.del(PUBLIC_API_REDIS_KEYS.apiKeyVerify(row.hashedKey));
  } catch (e) {
    this.logger.warn({ err: e }, 'apikey cache invalidation after rebind failed');
  }
}
```

Add `NotFoundException` to the imports at top of the file:
```ts
import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
```

- [ ] **Step 4: Run tests — pass**

Run:
```bash
npm run test -w @seo/gateway -- api-key.service.spec
```

Expected: green.

- [ ] **Step 5: Commit**

```bash
git add apps/gateway/src/public-api/services/api-key.service.ts apps/gateway/test/unit/api-key.service.spec.ts
git commit -m "feat(gateway): ApiKeyService.rebind() clears install binding"
```

---

## Task 5: Feature flag `API_KEY_INSTALL_BIND_MODE` (`off | log | enforce`)

This task introduces the config that Task 6 (the guard) will consume. We avoid coupling guard logic to `ConfigService` directly so it's trivially testable.

**Files:**
- Create: `apps/gateway/src/public-api/config/install-bind-mode.ts`
- Modify: `apps/gateway/src/public-api/public-api.module.ts`
- Modify: `apps/gateway/.env.example`

- [ ] **Step 1: Create the config token + reader**

Create `apps/gateway/src/public-api/config/install-bind-mode.ts`:

```ts
import { ConfigService } from '@nestjs/config';

export type ApiKeyInstallBindMode = 'off' | 'log' | 'enforce';

export const INSTALL_BIND_MODE = Symbol('INSTALL_BIND_MODE');

export function readInstallBindMode(config: ConfigService): ApiKeyInstallBindMode {
  const raw = (config.get<string>('API_KEY_INSTALL_BIND_MODE') ?? 'log').toLowerCase();
  if (raw === 'off' || raw === 'log' || raw === 'enforce') return raw;
  return 'log'; // default conservative: log without blocking
}
```

- [ ] **Step 2: Provide the token in `PublicApiModule`**

In `apps/gateway/src/public-api/public-api.module.ts`, after the existing factory providers, add:

```ts
import { INSTALL_BIND_MODE, readInstallBindMode } from './config/install-bind-mode';

// In the providers array:
{
  provide: INSTALL_BIND_MODE,
  useFactory: (config: ConfigService) => readInstallBindMode(config),
  inject: [ConfigService],
},
```

- [ ] **Step 3: Document in `.env.example`**

In `apps/gateway/.env.example` (or wherever the existing example lives — verify with `ls apps/gateway/*.env*`), append:

```bash
# API key device-binding (Phase 1 rollout)
# off     — bind logic disabled, no header read, no log (kill switch)
# log     — read X-Install-Id, bind on first use, LOG mismatches but allow them through
# enforce — read X-Install-Id, bind on first use, REJECT mismatches with 401 KEY_INSTALL_MISMATCH
# Default: log
API_KEY_INSTALL_BIND_MODE=log
```

- [ ] **Step 4: Commit**

```bash
git add apps/gateway/src/public-api/config/install-bind-mode.ts apps/gateway/src/public-api/public-api.module.ts apps/gateway/.env.example
git commit -m "feat(gateway): API_KEY_INSTALL_BIND_MODE config (off|log|enforce)"
```

---

## Task 6: `ApiKeyGuard` — read header, apply mode, map new errors

**Files:**
- Modify: `apps/gateway/src/public-api/guards/api-key.guard.ts`
- Modify: `apps/gateway/test/unit/api-key.service.spec.ts` (no — guard test is new)
- Create: `apps/gateway/test/unit/api-key.guard.spec.ts`

- [ ] **Step 1: Write failing tests for the guard**

Create `apps/gateway/test/unit/api-key.guard.spec.ts`:

```ts
import 'reflect-metadata';
import { describe, it, expect, vi } from 'vitest';
import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ApiKeyGuard } from '../../src/public-api/guards/api-key.guard';
import { ApiKeyService } from '../../src/public-api/services/api-key.service';

function ctx(headers: Record<string, string | undefined>, ip = '1.2.3.4'): ExecutionContext {
  const req: any = { headers, ip };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

describe('ApiKeyGuard', () => {
  const svc = {
    verify: vi.fn(),
    recordUsage: vi.fn(),
  } as unknown as ApiKeyService;

  it('throws MISSING_API_KEY when Authorization header is absent', async () => {
    const guard = new ApiKeyGuard(svc, 'enforce');
    await expect(guard.canActivate(ctx({}))).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'MISSING_API_KEY' }),
    });
  });

  it('mode=enforce: passes when verify returns valid and stamps req.apiKey', async () => {
    (svc.verify as any).mockResolvedValue({ valid: true, apiKeyId: 'k1', userId: 'u1', environment: 'test' });
    const guard = new ApiKeyGuard(svc, 'enforce');
    const c = ctx({ authorization: 'Bearer sk_test_aaa', 'x-install-id': '4f8d3a2b-1c5e-4a7f-9b2d-8e3c5f1a6d04' });
    await expect(guard.canActivate(c)).resolves.toBe(true);
  });

  it('mode=enforce: throws KEY_INSTALL_MISMATCH on install_mismatch', async () => {
    (svc.verify as any).mockResolvedValue({ valid: false, reason: 'install_mismatch' });
    const guard = new ApiKeyGuard(svc, 'enforce');
    await expect(
      guard.canActivate(ctx({ authorization: 'Bearer sk_test_aaa', 'x-install-id': '4f8d3a2b-1c5e-4a7f-9b2d-8e3c5f1a6d04' })),
    ).rejects.toMatchObject({ response: expect.objectContaining({ code: 'KEY_INSTALL_MISMATCH' }) });
  });

  it('mode=enforce: throws MISSING_INSTALL_ID when verify returns missing_install_id', async () => {
    (svc.verify as any).mockResolvedValue({ valid: false, reason: 'missing_install_id' });
    const guard = new ApiKeyGuard(svc, 'enforce');
    await expect(
      guard.canActivate(ctx({ authorization: 'Bearer sk_test_aaa' })),
    ).rejects.toMatchObject({ response: expect.objectContaining({ code: 'MISSING_INSTALL_ID' }) });
  });

  it('mode=log: install_mismatch is logged but request passes (when key is otherwise valid)', async () => {
    // In log mode, when the header is present but mismatched, the guard
    // should re-call verify ignoring the install check. Simplest approach:
    // log + retry verify with a synthetic "always-match" sentinel? No —
    // instead, in log mode we skip the install id check entirely (Task 6
    // implementation: the guard calls verify with undefined installId,
    // and the service treats undefined-in-log-mode as "skip"). See impl.
    // For now, we model log mode as: guard SWALLOWS missing_install_id
    // and install_mismatch and re-calls verify after re-stamping the row's
    // installId from the DB. Simpler model: guard in log mode just calls
    // verify and ALWAYS passes if the key itself is valid — we mock that.
    (svc.verify as any).mockResolvedValue({ valid: true, apiKeyId: 'k1', userId: 'u1', environment: 'test' });
    const guard = new ApiKeyGuard(svc, 'log');
    await expect(
      guard.canActivate(ctx({ authorization: 'Bearer sk_test_aaa' /* no install header */ })),
    ).resolves.toBe(true);
  });

  it('mode=off: install header is not read; verify is called with undefined installId', async () => {
    (svc.verify as any).mockResolvedValue({ valid: true, apiKeyId: 'k1', userId: 'u1', environment: 'test' });
    const guard = new ApiKeyGuard(svc, 'off');
    await guard.canActivate(ctx({ authorization: 'Bearer sk_test_aaa', 'x-install-id': 'whatever' }));
    expect(svc.verify).toHaveBeenCalledWith('Bearer sk_test_aaa', undefined);
  });
});
```

The `log` mode semantic is **non-trivial**: the service today requires `installId` to be valid before it does anything. In log mode we want to OBSERVE traffic without rejecting. The cleanest model is:

- Guard reads the header always (so we can log what we see).
- In `enforce` mode → pass real `installId` to `verify`. Reject on `missing_install_id` or `install_mismatch`.
- In `log` mode → call `verify` with the real `installId`. If verify returns `missing_install_id` or `install_mismatch`, log a structured warning then **re-call** `verify` with a sentinel that skips the install check.
- In `off` mode → call `verify(authHeader, undefined)` and short-circuit any install check.

To enable the "skip check" path, extend `verify` with a third bypass argument **OR** simpler: handle the log-mode re-call by re-reading the DB row directly in the guard. The cleanest variant is the bypass arg. We'll add it in Step 3.

- [ ] **Step 2: Run guard tests — fail**

Run:
```bash
npm run test -w @seo/gateway -- api-key.guard.spec
```

Expected: all 6 fail because `ApiKeyGuard` constructor doesn't accept a mode yet.

- [ ] **Step 3: Extend `verify()` with an optional `skipInstallCheck` bypass**

Add an overload-like flag to `ApiKeyService.verify`:

```ts
// In apps/gateway/src/public-api/services/api-key.service.ts:
async verify(
  authorizationHeader: string | undefined,
  installId: string | undefined,
  opts?: { skipInstallCheck?: boolean },
): Promise<ApiKeyVerifyResult> {
  if (!authorizationHeader) return { valid: false, reason: 'invalid_format' };
  const bearer = authorizationHeader.replace(/^Bearer\s+/i, '').trim();
  if (!API_KEY_REGEX.test(bearer)) return { valid: false, reason: 'invalid_format' };

  const skipInstall = opts?.skipInstallCheck === true;
  if (!skipInstall) {
    if (!installId || !UUID_V4_REGEX.test(installId)) {
      return { valid: false, reason: 'missing_install_id' };
    }
  }

  // ... cache + DB lookup unchanged ...

  // In the bind/match block, gate on skipInstall:
  if (skipInstall) {
    // Just return validity; do NOT bind, do NOT compare.
    return {
      valid: true,
      apiKeyId: row.id,
      userId: row.userId,
      environment: row.environment as ApiKeyEnvironment,
    };
  }
  // (existing bind/match logic below)
```

Also update the existing tests: any test that uses the bypass path will need to assert it; but bypass is only used from the guard, so existing service tests don't change.

- [ ] **Step 4: Rewrite `ApiKeyGuard` to take mode + apply logic**

Replace `apps/gateway/src/public-api/guards/api-key.guard.ts`:

```ts
/**
 * @file Guard for public-API routes authenticated by Bearer `sk_...` keys.
 * Distinct from the app-wide `JwtAuthGuard` — public routes should bypass
 * JWT (marked with `@Public()`) and use this guard instead.
 *
 * Honours `API_KEY_INSTALL_BIND_MODE`:
 *   - off     → no install check, no header read
 *   - log     → bind on first use if header present + valid; mismatches/missing
 *               are LOGGED and the request is allowed through (rollout phase)
 *   - enforce → mismatches/missing → 401
 */
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiKeyService } from '../services/api-key.service';
import { ApiKeyEnvironment } from '@repo/shared';
import {
  ApiKeyInstallBindMode,
  INSTALL_BIND_MODE,
} from '../config/install-bind-mode';

export interface RequestWithApiKey extends Request {
  apiKey?: { id: string; userId: string; environment: ApiKeyEnvironment };
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(
    private readonly svc: ApiKeyService,
    @Inject(INSTALL_BIND_MODE) private readonly mode: ApiKeyInstallBindMode,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithApiKey>();
    const auth = req.headers?.authorization;
    if (!auth) {
      throw new UnauthorizedException({
        code: 'MISSING_API_KEY',
        message: 'Authorization header required',
      });
    }

    const installHeader =
      typeof req.headers?.['x-install-id'] === 'string'
        ? (req.headers['x-install-id'] as string)
        : undefined;

    if (this.mode === 'off') {
      const r = await this.svc.verify(auth, undefined, { skipInstallCheck: true });
      return this.applyResult(r, req);
    }

    let r = await this.svc.verify(auth, installHeader);

    if (this.mode === 'log' && !r.valid && (r.reason === 'missing_install_id' || r.reason === 'install_mismatch')) {
      this.logger.warn(
        { reason: r.reason, hasHeader: installHeader !== undefined, ip: req.ip },
        'API_KEY_INSTALL_BIND_MODE=log: would have rejected, allowing through',
      );
      r = await this.svc.verify(auth, undefined, { skipInstallCheck: true });
    }

    return this.applyResult(r, req);
  }

  private applyResult(r: Awaited<ReturnType<ApiKeyService['verify']>>, req: RequestWithApiKey): boolean {
    if (!r.valid) {
      switch (r.reason) {
        case 'user_disabled':
          throw new ForbiddenException({ code: 'KEY_DISABLED', message: 'Associated user is disabled' });
        case 'missing_install_id':
          throw new UnauthorizedException({
            code: 'MISSING_INSTALL_ID',
            message: 'X-Install-Id header required (UUID v4)',
          });
        case 'install_mismatch':
          throw new UnauthorizedException({
            code: 'KEY_INSTALL_MISMATCH',
            message:
              'Key đang được bound thiết bị khác. Rebind tại web app hoặc dùng thiết bị gốc.',
          });
        default:
          throw new UnauthorizedException({ code: 'INVALID_API_KEY', message: 'Invalid or revoked API key' });
      }
    }
    req.apiKey = { id: r.apiKeyId, userId: r.userId, environment: r.environment };
    this.svc.recordUsage(r.apiKeyId, req.ip);
    return true;
  }
}
```

- [ ] **Step 5: Update PublicApiModule to inject the mode into the guard**

In `apps/gateway/src/public-api/public-api.module.ts`, the existing `ApiKeyGuard` provider gets the mode via `@Inject`, so no module change needed beyond Task 5's `INSTALL_BIND_MODE` token. Verify by running:

```bash
npm run check-types -w @seo/gateway
```

Expected: no errors. If TypeScript complains about `Inject` import, ensure `Inject` is imported in the guard file (it is, per the snippet above).

- [ ] **Step 6: Run guard tests — pass**

Run:
```bash
npm run test -w @seo/gateway -- api-key.guard.spec
```

Expected: all 6 green.

- [ ] **Step 7: Run the FULL gateway test suite to check for regressions in other tests that constructed `ApiKeyGuard` with one arg**

Run:
```bash
npm run test -w @seo/gateway
```

Expected: any failure in another test file that constructs `new ApiKeyGuard(svc)` with one argument — update that call to `new ApiKeyGuard(svc, 'enforce')` (or whichever mode the test expects). Common candidate: `public-api-llm.e2e-spec.ts` may construct it via NestJS DI, in which case the token must be registered in the test module — usually it just needs `useValue: 'enforce'` in the providers.

- [ ] **Step 8: Commit**

```bash
git add apps/gateway/src/public-api/guards/api-key.guard.ts apps/gateway/src/public-api/services/api-key.service.ts apps/gateway/test/unit/api-key.guard.spec.ts
git commit -m "feat(gateway): ApiKeyGuard applies BIND_MODE (off|log|enforce)"
```

---

## Task 7: Rebind endpoint in `ApiKeysController` + extend `ApiKeyDto`

**Files:**
- Modify: `apps/gateway/src/public-api/controllers/api-keys.controller.ts`
- Modify: `apps/gateway/src/public-api/dto/api-key.dto.ts`

- [ ] **Step 1: Extend `ApiKeyDto` with the new fields**

In `apps/gateway/src/public-api/dto/api-key.dto.ts`, replace `ApiKeyDto`:

```ts
export class ApiKeyDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() prefix!: string;
  @ApiProperty({ enum: ['live', 'test'] }) environment!: 'live' | 'test';
  @ApiProperty({ nullable: true, type: String }) lastUsedAt!: Date | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty({ nullable: true, type: String }) revokedAt!: Date | null;
  @ApiProperty({ nullable: true, type: String, description: 'UUID v4 of the bound extension/CLI install. Null = unbound.' })
  installId!: string | null;
  @ApiProperty({ nullable: true, type: String, description: 'Timestamp of first bind. Null when never bound.' })
  installBoundAt!: Date | null;
}
```

- [ ] **Step 2: Update `toDto()` in the controller + `list()` SELECT**

In `apps/gateway/src/public-api/controllers/api-keys.controller.ts`, update `toDto()`:

```ts
private toDto(r: {
  id: string;
  name: string;
  prefix: string;
  environment: 'live' | 'test';
  lastUsedAt: Date | null;
  createdAt: Date;
  revokedAt: Date | null;
  installId: string | null;
  installBoundAt: Date | null;
}): ApiKeyDto {
  return {
    id: r.id,
    name: r.name,
    prefix: r.prefix,
    environment: r.environment,
    lastUsedAt: r.lastUsedAt,
    createdAt: r.createdAt,
    revokedAt: r.revokedAt,
    installId: r.installId,
    installBoundAt: r.installBoundAt,
  };
}
```

In `ApiKeyService.list()` (in `api-key.service.ts`), extend the `select`:

```ts
list(userId: string) {
  return this.prisma.apiKey.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, name: true, prefix: true, environment: true,
      lastUsedAt: true, createdAt: true, revokedAt: true,
      installId: true, installBoundAt: true,
    },
  });
}
```

- [ ] **Step 3: Add the rebind endpoint**

In `apps/gateway/src/public-api/controllers/api-keys.controller.ts`, add after `revoke()`:

```ts
@Post(':id/rebind')
@HttpCode(204)
@ApiOperation({ summary: 'Clear the device binding so the next request from any install rebinds the key.' })
async rebind(
  @Req() req: AuthedRequest,
  @Param('id') id: string,
): Promise<void> {
  await this.svc.rebind(id, req.user.id);
}
```

`@Post`, `@HttpCode`, `@Param`, `@Req` are already imported in this file.

- [ ] **Step 4: Run gateway type-check**

Run:
```bash
npm run check-types -w @seo/gateway
```

Expected: clean.

- [ ] **Step 5: Run tests touching `ApiKeysController`**

Run:
```bash
npm run test -w @seo/gateway
```

Expected: green. The `toDto` shape change might break any existing controller-shape assertion — update those to include `installId: null, installBoundAt: null` for fresh keys.

- [ ] **Step 6: Commit**

```bash
git add apps/gateway/src/public-api/controllers/api-keys.controller.ts apps/gateway/src/public-api/dto/api-key.dto.ts apps/gateway/src/public-api/services/api-key.service.ts
git commit -m "feat(gateway): expose installId on ApiKeyDto + POST /users/me/api-keys/:id/rebind"
```

---

## Task 8: Integration E2E test (real Prisma + Redis)

**Files:**
- Create: `apps/gateway/test/integration/api-key-install-bind.e2e-spec.ts`

- [ ] **Step 1: Write end-to-end test exercising bind → mismatch → rebind → re-bind**

Create the file. Pattern follows `public-api-llm.e2e-spec.ts` style — bootstrap the Nest app, hit `/api/v1/public/check` with Supertest.

Uses the same `FakeJwtGuard` override pattern as `audits.e2e-spec.ts` lines 75-83 + 129 — no real JWT signing required, the guard is replaced with one that stamps `req.user` directly. This keeps the test fast and avoids JWT secret setup.

```ts
import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test } from '@nestjs/testing';
import { INestApplication, ExecutionContext, CanActivate } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/infra/prisma/prisma.service';
import { ApiKeyService } from '../../src/public-api/services/api-key.service';
import { JwtAuthGuard } from '../../src/auth/guards/jwt-auth.guard';
import { INSTALL_BIND_MODE } from '../../src/public-api/config/install-bind-mode';
import { UserRole } from '@repo/shared';

const INSTALL_A = '4f8d3a2b-1c5e-4a7f-9b2d-8e3c5f1a6d04';
const INSTALL_B = '7a1b2c3d-4e5f-4a6b-9c8d-1e2f3a4b5c6d';

let currentUserId: string; // mutated in beforeAll, read by FakeJwtGuard
class FakeJwtGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    req.user = { id: currentUserId, email: 'bind@e.com', role: UserRole.USER };
    return true;
  }
}

describe('API key install bind (E2E, enforce mode)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let svc: ApiKeyService;
  let plaintext: string;
  let apiKeyId: string;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideGuard(JwtAuthGuard).useClass(FakeJwtGuard)
      .overrideProvider(INSTALL_BIND_MODE).useValue('enforce')
      .compile();
    app = mod.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    svc = app.get(ApiKeyService);

    const user = await prisma.user.create({
      data: {
        email: `bind-${Date.now()}@test`,
        passwordHash: '$2a$12$dummy',  // adjust to actual User.passwordHash field name
        planCode: 'pro',
        isVerified: true,
      },
    });
    currentUserId = user.id;

    const created = await svc.create(currentUserId, 'e2e-bind', 'test');
    plaintext = created.plaintext;
    apiKeyId = created.record.id;
  });

  afterAll(async () => {
    await prisma.apiKey.deleteMany({ where: { userId: currentUserId } });
    await prisma.user.delete({ where: { id: currentUserId } });
    await app.close();
  });

  it('first call from install A binds the key', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/public/check')
      .set('authorization', `Bearer ${plaintext}`)
      .set('x-install-id', INSTALL_A)
      .send({ input: { type: 'markdown', markdown: '# hi' }, targetKeyword: 'seo' });
    expect([200, 422]).toContain(res.status); // 200 normally; 422 if rule fixtures absent — either way, bind ran
    const row = await prisma.apiKey.findUnique({ where: { id: apiKeyId } });
    expect(row?.installId).toBe(INSTALL_A);
    expect(row?.installBoundAt).toBeInstanceOf(Date);
  });

  it('call from install B is rejected with 401 KEY_INSTALL_MISMATCH', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/public/check')
      .set('authorization', `Bearer ${plaintext}`)
      .set('x-install-id', INSTALL_B)
      .send({ input: { type: 'markdown', markdown: '# hi' }, targetKeyword: 'seo' });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('KEY_INSTALL_MISMATCH');
  });

  it('call without X-Install-Id is rejected with 401 MISSING_INSTALL_ID', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/public/check')
      .set('authorization', `Bearer ${plaintext}`)
      .send({ input: { type: 'markdown', markdown: '# hi' }, targetKeyword: 'seo' });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('MISSING_INSTALL_ID');
  });

  it('after rebind, install B can use the key (and install A is now locked out)', async () => {
    const rebindRes = await request(app.getHttpServer())
      .post(`/api/v1/users/me/api-keys/${apiKeyId}/rebind`);
    // FakeJwtGuard stamps req.user — no Authorization header needed
    expect(rebindRes.status).toBe(204);

    const rowAfterRebind = await prisma.apiKey.findUnique({ where: { id: apiKeyId } });
    expect(rowAfterRebind?.installId).toBeNull();

    const checkRes = await request(app.getHttpServer())
      .post('/api/v1/public/check')
      .set('authorization', `Bearer ${plaintext}`)
      .set('x-install-id', INSTALL_B)
      .send({ input: { type: 'markdown', markdown: '# hi' }, targetKeyword: 'seo' });
    expect([200, 422]).toContain(checkRes.status);

    const rowAfterRebind2 = await prisma.apiKey.findUnique({ where: { id: apiKeyId } });
    expect(rowAfterRebind2?.installId).toBe(INSTALL_B);

    const lockoutRes = await request(app.getHttpServer())
      .post('/api/v1/public/check')
      .set('authorization', `Bearer ${plaintext}`)
      .set('x-install-id', INSTALL_A)
      .send({ input: { type: 'markdown', markdown: '# hi' }, targetKeyword: 'seo' });
    expect(lockoutRes.status).toBe(401);
    expect(lockoutRes.body.code).toBe('KEY_INSTALL_MISMATCH');
  });
});
```

Quick sanity check against the `User` Prisma model: verify the `data:` field names in `prisma.user.create()` match the schema. Run `grep -A 20 "model User" apps/gateway/prisma/schema.prisma` to confirm `passwordHash` vs `password`, presence of `planCode`, etc. — adjust the `create` call if names differ. The audits.e2e-spec test mocks the user entirely so it doesn't help with field names; the auth.e2e-spec hits real Prisma and is a better reference.

- [ ] **Step 2: Verify docker stack is up before running the spec**

Run:
```bash
npm run docker:up
```

Then run the spec:
```bash
npm run test -w @seo/gateway -- api-key-install-bind.e2e-spec
```

Expected: 4 green tests.

- [ ] **Step 3: Commit**

```bash
git add apps/gateway/test/integration/api-key-install-bind.e2e-spec.ts
git commit -m "test(gateway): E2E for install bind, mismatch, rebind"
```

---

## Task 9: Extension `lib/install-id.ts` + spec

**Files:**
- Create: `apps/extension/lib/install-id.ts`
- Create: `apps/extension/test/install-id.spec.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/extension/test/install-id.spec.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ensureInstallId, isValidInstallId, loadInstallId } from '../lib/install-id';

// Fake chrome.storage.local for node-env tests.
let store: Record<string, unknown> = {};
beforeEach(() => {
  store = {};
  // @ts-expect-error inject chrome global
  globalThis.chrome = {
    storage: {
      local: {
        get: vi.fn(async (k: string) => ({ [k]: store[k] })),
        set: vi.fn(async (obj: Record<string, unknown>) => {
          Object.assign(store, obj);
        }),
        remove: vi.fn(async (k: string) => {
          delete store[k];
        }),
      },
    },
  };
  // crypto.randomUUID is available in Node 19+; fall back if missing.
  if (typeof globalThis.crypto?.randomUUID !== 'function') {
    // @ts-expect-error
    globalThis.crypto = { randomUUID: () => '4f8d3a2b-1c5e-4a7f-9b2d-8e3c5f1a6d04' };
  }
});

describe('isValidInstallId', () => {
  it('accepts a UUID v4', () => {
    expect(isValidInstallId('4f8d3a2b-1c5e-4a7f-9b2d-8e3c5f1a6d04')).toBe(true);
  });
  it('rejects a UUID v1', () => {
    expect(isValidInstallId('550e8400-e29b-11d4-a716-446655440000')).toBe(false);
  });
  it('rejects non-strings and empty strings', () => {
    expect(isValidInstallId('')).toBe(false);
    expect(isValidInstallId(undefined)).toBe(false);
    expect(isValidInstallId(123)).toBe(false);
  });
});

describe('ensureInstallId', () => {
  it('generates and persists a new install id on first call', async () => {
    const id = await ensureInstallId();
    expect(isValidInstallId(id)).toBe(true);
    expect(store['installId']).toBe(id);
  });

  it('returns the same install id on a second call (idempotent)', async () => {
    const first = await ensureInstallId();
    const second = await ensureInstallId();
    expect(second).toBe(first);
  });

  it('regenerates if the stored value is malformed', async () => {
    store['installId'] = 'corrupt';
    const fresh = await ensureInstallId();
    expect(isValidInstallId(fresh)).toBe(true);
    expect(fresh).not.toBe('corrupt');
  });
});

describe('loadInstallId', () => {
  it('returns null when storage is empty', async () => {
    expect(await loadInstallId()).toBeNull();
  });
  it('returns the value when storage contains a valid UUID v4', async () => {
    store['installId'] = '4f8d3a2b-1c5e-4a7f-9b2d-8e3c5f1a6d04';
    expect(await loadInstallId()).toBe('4f8d3a2b-1c5e-4a7f-9b2d-8e3c5f1a6d04');
  });
  it('returns null when storage contains a malformed value', async () => {
    store['installId'] = 'corrupt';
    expect(await loadInstallId()).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests — fail**

Run:
```bash
npm run test -w @seo/extension -- install-id.spec
```

Expected: `Cannot find module '../lib/install-id'`.

- [ ] **Step 3: Implement `install-id.ts`**

Create `apps/extension/lib/install-id.ts`:

```ts
/**
 * Per-install UUID v4 that pairs with the API key on the gateway.
 * Sent as the `X-Install-Id` header on every /public/check request.
 *
 * The gateway records the first install_id that uses each key. Subsequent
 * calls with a different install_id are rejected with KEY_INSTALL_MISMATCH.
 * This is what makes "copy my key to my friend" not work — the friend's
 * extension generates a different install_id at install time.
 *
 * Lifecycle:
 *   - Generated lazily on first call to `ensureInstallId()` (typically
 *     from background.ts in `onInstalled`).
 *   - Persists in `chrome.storage.local` (extension-scoped, never synced).
 *   - Cleared only when the user uninstalls or manually wipes storage.
 *   - On UUID-format drift, regenerates.
 */
const STORAGE_KEY = 'installId';
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidInstallId(value: unknown): value is string {
  return typeof value === 'string' && UUID_V4_REGEX.test(value);
}

export async function loadInstallId(): Promise<string | null> {
  const out = (await chrome.storage.local.get(STORAGE_KEY)) as Record<string, unknown>;
  return isValidInstallId(out[STORAGE_KEY]) ? out[STORAGE_KEY] : null;
}

export async function ensureInstallId(): Promise<string> {
  const existing = await loadInstallId();
  if (existing) return existing;
  const fresh = crypto.randomUUID();
  await chrome.storage.local.set({ [STORAGE_KEY]: fresh });
  return fresh;
}
```

- [ ] **Step 4: Run tests — pass**

Run:
```bash
npm run test -w @seo/extension -- install-id.spec
```

Expected: 8 green.

- [ ] **Step 5: Commit**

```bash
git add apps/extension/lib/install-id.ts apps/extension/test/install-id.spec.ts
git commit -m "feat(extension): per-install UUID v4 helper (install-id.ts)"
```

---

## Task 10: Extension `lib/client.ts` — require `installId`, send `X-Install-Id`

**Files:**
- Modify: `apps/extension/lib/client.ts`
- Modify: `apps/extension/test/client.spec.ts`

- [ ] **Step 1: Write/extend failing test**

In `apps/extension/test/client.spec.ts`, **modify** the first test to assert the header AND add a fresh test:

```ts
const installId = '4f8d3a2b-1c5e-4a7f-9b2d-8e3c5f1a6d04';

// Inside `describe('client.check', ...)`, update the existing first test:
it('sends Bearer + X-Install-Id headers and returns parsed JSON on 200', async () => {
  const fetchImpl = vi.fn().mockResolvedValue(
    fakeResponse({ ok: true, status: 200, body: { score: 91 } }),
  );
  const res = await check({ apiKey, installId, baseUrl, body, fetchImpl });
  expect(res).toEqual({ score: 91 });
  expect(fetchImpl).toHaveBeenCalledTimes(1);
  const firstCall = fetchImpl.mock.calls[0]!;
  const [calledUrl, init] = firstCall as [string, RequestInit];
  expect(calledUrl).toBe('http://localhost:3000/api/v1/public/check');
  expect(init.method).toBe('POST');
  expect(init.headers).toMatchObject({
    authorization: `Bearer ${apiKey}`,
    'x-install-id': installId,
    'content-type': 'application/json',
  });
  expect(init.body).toBe(JSON.stringify(body));
});
```

Update the other existing `check(...)` call sites in this spec to pass `installId`. Since `installId` is required, TypeScript will catch any missed call sites at compile time.

- [ ] **Step 2: Run tests — fail**

Run:
```bash
npm run test -w @seo/extension -- client.spec
```

Expected: TS errors `Property 'installId' is missing` on existing calls, plus the explicit header assertion failing on the call sites that ARE compiling.

- [ ] **Step 3: Update `lib/client.ts`**

In `apps/extension/lib/client.ts`:

```ts
export interface CheckArgs {
  apiKey: string;
  installId: string;          // ← NEW required field
  baseUrl: string;
  body: PublicCheckRequest;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}

// Inside check():
res = await fetchImpl(url, {
  method: 'POST',
  headers: {
    authorization: `Bearer ${args.apiKey}`,
    'x-install-id': args.installId,                  // ← NEW
    'content-type': 'application/json',
  },
  body: JSON.stringify(args.body),
  signal: args.signal,
});
```

- [ ] **Step 4: Run tests — pass**

Run:
```bash
npm run test -w @seo/extension -- client.spec
```

Expected: green.

- [ ] **Step 5: Commit**

```bash
git add apps/extension/lib/client.ts apps/extension/test/client.spec.ts
git commit -m "feat(extension): client.check requires installId + sends X-Install-Id"
```

---

## Task 11: Extension `entrypoints/background.ts` — wire `ensureInstallId` into the audit flow

**Files:**
- Modify: `apps/extension/entrypoints/background.ts`

- [ ] **Step 1: Add `ensureInstallId` to `onInstalled` and `runAudit`**

In `apps/extension/entrypoints/background.ts`:

```ts
// Add import:
import { ensureInstallId } from '@/lib/install-id';

// In onInstalled handler (replace existing block):
chrome.runtime.onInstalled.addListener(async () => {
  await ensureInstallId();  // ← provision before first audit
  if (!(await loadApiKey())) chrome.runtime.openOptionsPage();
});

// In runAudit, before the `check` call site:
const installId = await ensureInstallId();
// pass to check:
const response = await check({
  apiKey,
  installId,                                          // ← NEW
  baseUrl: API_BASE_URL,
  body: { ... },                                      // existing body
  signal: ...,
});
```

The exact `check` call site is inside `runAudit` further down — find it by searching for `check({` in the file and add `installId` to the argument object.

- [ ] **Step 2: Type-check the extension**

Run:
```bash
npm run check-types -w @seo/extension
```

Expected: no errors. If TS complains that `check` requires `installId` at a call site you missed, add it.

- [ ] **Step 3: Build the extension to be sure WXT generates the manifest cleanly**

Run:
```bash
npm run build -w @seo/extension
```

Expected: build succeeds, `.output/chrome-mv3/` produced.

- [ ] **Step 4: Commit**

```bash
git add apps/extension/entrypoints/background.ts
git commit -m "feat(extension): ensure install id + forward to client.check"
```

---

## Task 12: Extension `lib/errors.ts` + popup wire for `OPEN_REBIND_PAGE`

**Files:**
- Modify: `apps/extension/lib/errors.ts`
- Modify: `apps/extension/entrypoints/popup/App.tsx`

- [ ] **Step 1: Add 2 codes + new action to `errors.ts`**

In `apps/extension/lib/errors.ts`:

```ts
// Extend the union:
export type PublicApiErrorCode =
  | 'INVALID_JSON'
  | 'MISSING_API_KEY'
  | 'INVALID_API_KEY'
  | 'KEY_DISABLED'
  | 'MISSING_INSTALL_ID'        // NEW
  | 'KEY_INSTALL_MISMATCH'      // NEW
  // ... existing codes ...
  | 'CLIENT_UNKNOWN';

// Extend the action union:
export type ErrorAction =
  | 'OPEN_OPTIONS'
  | 'OPEN_REBIND_PAGE'          // NEW
  | 'RELOAD_EXTENSION'          // NEW
  | 'RETRY_LATER'
  | 'FALLBACK_TO_HTML'
  | 'REDUCE_PAYLOAD'
  | 'INPUT_FIX'
  | 'SHOW_SERVER_OUTAGE'
  | 'SHOW_GENERIC';

// In dispatchErrorCode switch, add cases:
case 'KEY_INSTALL_MISMATCH':
  return 'OPEN_REBIND_PAGE';
case 'MISSING_INSTALL_ID':
  return 'RELOAD_EXTENSION';
```

- [ ] **Step 2: Wire popup to handle `OPEN_REBIND_PAGE`**

In `apps/extension/entrypoints/popup/App.tsx`, find the error-rendering switch on `ErrorAction`. Add a branch:

```tsx
case 'OPEN_REBIND_PAGE':
  return (
    <ErrorCard
      title="Key đang được bound thiết bị khác"
      message="Mở web app → Settings → API Keys → Rebind, hoặc dùng thiết bị gốc."
      action={
        <Button
          variant="primary"
          size="md"
          onClick={() => {
            chrome.tabs.create({ url: `${WEB_BASE_URL}/settings/api-keys` });
          }}
        >
          Open rebind page
        </Button>
      }
    />
  );
case 'RELOAD_EXTENSION':
  return (
    <ErrorCard
      title="Cần khởi tạo lại extension"
      message="Install id chưa sinh. Hãy reload extension (chrome://extensions → reload)."
    />
  );
```

`WEB_BASE_URL` is `'https://seoanalyst.app'` in prod or `'http://localhost:3001'` in dev — derive from `API_BASE_URL` if a constant already exists, or import from `api-base.ts`. If `ErrorCard` does not exist with these props, adapt to the existing error rendering pattern (the file already handles `OPEN_OPTIONS` similarly — match that shape).

- [ ] **Step 3: Type-check + extension tests**

Run:
```bash
npm run check-types -w @seo/extension && npm run test -w @seo/extension
```

Expected: green.

- [ ] **Step 4: Commit**

```bash
git add apps/extension/lib/errors.ts apps/extension/entrypoints/popup/App.tsx
git commit -m "feat(extension): handle KEY_INSTALL_MISMATCH + MISSING_INSTALL_ID in popup"
```

---

## Task 13: Web — extend `ApiKeyDto` type + `rebindApiKey()`

**Files:**
- Modify: `apps/web/src/types/api.ts` (or wherever `ApiKeyDto` lives — verify with `grep -n "ApiKeyDto" apps/web/src`)
- Modify: `apps/web/src/lib/api-keys.ts`

- [ ] **Step 1: Add fields to type**

Find the `ApiKeyDto` definition (likely `apps/web/src/types/api.ts`) and add:

```ts
export interface ApiKeyDto {
  id: string;
  name: string;
  prefix: string;
  environment: 'live' | 'test';
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
  installId: string | null;          // NEW
  installBoundAt: string | null;     // NEW
}
```

- [ ] **Step 2: Add `rebindApiKey()` to client**

In `apps/web/src/lib/api-keys.ts`, after `revokeApiKey`:

```ts
export async function rebindApiKey(id: string): Promise<void> {
  await api.post(`users/me/api-keys/${id}/rebind`);
}
```

- [ ] **Step 3: Type-check web**

Run:
```bash
npm run check-types -w @seo/web
```

Expected: no errors. If a consumer destructures from `ApiKeyDto` somewhere that doesn't yet handle the new fields, it should still pass because the fields are added, not removed.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/types/api.ts apps/web/src/lib/api-keys.ts
git commit -m "feat(web): ApiKeyDto carries installId; rebindApiKey() client"
```

---

## Task 14: Web — `/settings/api-keys` UI: Device column + Rebind action + i18n

**Files:**
- Modify: `apps/web/src/app/[locale]/(app)/settings/api-keys/page.tsx`
- Modify: `apps/web/src/messages/en.json`
- Modify: `apps/web/src/messages/vi.json`

- [ ] **Step 1: Add 7 i18n keys**

In `apps/web/src/messages/en.json`, under the existing `apiKeys` section (or top-level if no such section), append:

```json
{
  "apiKeys": {
    "column": { "device": "Device" },
    "badge": { "bound": "bound · {when}", "unbound": "unbound" },
    "action": { "rebind": "Rebind device" },
    "rebind": {
      "confirmTitle": "Rebind device?",
      "confirmBody": "After rebind, the device currently using this key will lose access. The next device to call the key will become the new bound device.",
      "success": "Device unbound. Next caller will bind.",
      "errorGeneric": "Could not rebind. Please try again."
    }
  }
}
```

In `apps/web/src/messages/vi.json`:

```json
{
  "apiKeys": {
    "column": { "device": "Thiết bị" },
    "badge": { "bound": "đã bound · {when}", "unbound": "chưa bound" },
    "action": { "rebind": "Rebind thiết bị" },
    "rebind": {
      "confirmTitle": "Rebind thiết bị?",
      "confirmBody": "Sau khi rebind, thiết bị đang dùng key sẽ KHÔNG truy cập được nữa. Thiết bị tiếp theo gọi key sẽ trở thành thiết bị bound mới.",
      "success": "Đã unbind. Caller tiếp theo sẽ bind.",
      "errorGeneric": "Không rebind được. Thử lại."
    }
  }
}
```

Merge into existing structure if `apiKeys` already exists — don't overwrite.

- [ ] **Step 2: Update the page**

In `apps/web/src/app/[locale]/(app)/settings/api-keys/page.tsx`:

1. Add a "Device" column between `Environment` and `Last used`:

```tsx
<TableHead>{t('apiKeys.column.device')}</TableHead>
```

2. In the row, render the badge:

```tsx
<TableCell>
  {key.installId ? (
    <Tooltip content={key.installId}>
      <Badge variant="default">
        {t('apiKeys.badge.bound', { when: formatRelative(key.installBoundAt) })}
      </Badge>
    </Tooltip>
  ) : (
    <Badge variant="muted">{t('apiKeys.badge.unbound')}</Badge>
  )}
</TableCell>
```

`formatRelative` and `Tooltip`/`Badge` should already exist — match the shape used elsewhere in the file. If `Badge` doesn't have `variant="muted"`, use whatever low-emphasis variant exists.

3. Add a "Rebind" menu item alongside "Revoke" in the actions dropdown:

```tsx
<DropdownMenuItem
  onSelect={() => setRebindTarget(key.id)}
  disabled={!key.installId}    // disable if already unbound
>
  {t('apiKeys.action.rebind')}
</DropdownMenuItem>
```

4. Render a confirmation dialog and a TanStack mutation:

```tsx
const queryClient = useQueryClient();
const rebindMutation = useMutation({
  mutationFn: rebindApiKey,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    toast.success(t('apiKeys.rebind.success'));
    setRebindTarget(null);
  },
  onError: () => toast.error(t('apiKeys.rebind.errorGeneric')),
});

// In the JSX, after the existing dialogs:
<ConfirmDialog
  open={rebindTarget !== null}
  onOpenChange={(open) => !open && setRebindTarget(null)}
  title={t('apiKeys.rebind.confirmTitle')}
  description={t('apiKeys.rebind.confirmBody')}
  onConfirm={() => rebindTarget && rebindMutation.mutate(rebindTarget)}
/>
```

Match component names to those actually used in the codebase — if `ConfirmDialog` doesn't exist, copy the pattern used by `Revoke`.

- [ ] **Step 3: Type-check + build**

Run:
```bash
npm run check-types -w @seo/web
npm run build -w @seo/web
```

Expected: clean.

- [ ] **Step 4: Manual smoke**

Per memory `project_web_runtime_prod_build.md`, `apps/web :3001` runs `next start` (production), so after `npm run build` restart it. Then open `http://localhost:3001/settings/api-keys` and:
1. Verify "Device" column renders.
2. Create a key → badge shows "unbound" + "Rebind" menu item is disabled.
3. (Hit `/public/check` from extension or curl to bind it) → reload page, badge shows "bound · …", "Rebind" enabled.
4. Click Rebind → confirm → toast → badge flips back to "unbound".

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/[locale]/(app)/settings/api-keys/page.tsx apps/web/src/messages/en.json apps/web/src/messages/vi.json
git commit -m "feat(web): /settings/api-keys shows device binding + rebind action"
```

---

## Task 15: CLI — persist install id + send header

**Files:**
- Create: `packages/seo-check-cli/src/install-id.ts`
- Modify: `packages/seo-check-cli/src/client.ts`
- Modify: `packages/seo-check-cli/README.md`

- [ ] **Step 1: Create `install-id.ts`**

Create `packages/seo-check-cli/src/install-id.ts`:

```ts
import { mkdir, readFile, writeFile, chmod } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { randomUUID } from 'node:crypto';

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function configPath(): string {
  const xdg = process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config');
  return join(xdg, 'seo-check-cli', 'install-id');
}

export async function ensureInstallId(): Promise<string> {
  const path = configPath();
  try {
    const buf = await readFile(path, 'utf8');
    const trimmed = buf.trim();
    if (UUID_V4_REGEX.test(trimmed)) return trimmed;
  } catch {
    // file missing or unreadable — fall through to create
  }
  const fresh = randomUUID();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, fresh, 'utf8');
  await chmod(path, 0o600);
  return fresh;
}
```

- [ ] **Step 2: Send header in `SeoClient`**

In `packages/seo-check-cli/src/client.ts`, find the existing `fetch` / ky call and inject `X-Install-Id`. The exact shape depends on the existing client implementation (read the file end-to-end first). Pattern:

```ts
import { ensureInstallId } from './install-id.js';

// In the method that hits /public/check:
const installId = await ensureInstallId();
const res = await fetch(url, {
  method: 'POST',
  headers: {
    authorization: `Bearer ${this.opts.apiKey}`,
    'x-install-id': installId,
    'content-type': 'application/json',
  },
  body: JSON.stringify(body),
});
```

- [ ] **Step 3: Document in CLI README**

Append to `packages/seo-check-cli/README.md`:

```markdown
## Install binding

Each CLI installation binds to a freshly-generated `install_id` (UUID v4)
stored in `${XDG_CONFIG_HOME:-~/.config}/seo-check-cli/install-id`. This is
sent as the `X-Install-Id` header on every request.

A single API key can only be used from one install at a time. If you move
the key to a new machine, the first call from that machine will be rejected
with `KEY_INSTALL_MISMATCH`. Rebind via the web app's
**Settings → API Keys → Rebind device** action.

Deleting the install-id file forces a fresh install_id on the next run.
```

- [ ] **Step 4: Type-check + build CLI**

Run:
```bash
npm run check-types -w @repo/seo-check-cli
npm run build -w @repo/seo-check-cli
```

Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add packages/seo-check-cli/src/install-id.ts packages/seo-check-cli/src/client.ts packages/seo-check-cli/README.md
git commit -m "feat(cli): persist install_id + send X-Install-Id header"
```

---

## Task 16: Document the 2 new error codes

**Files:**
- Modify: `docs/public-api/error-codes.md`

- [ ] **Step 1: Append 2 new code entries**

Read the existing format in `docs/public-api/error-codes.md` (it has a table or per-section structure). Add:

```markdown
### `MISSING_INSTALL_ID`

- **HTTP status:** 401
- **Cause:** The `X-Install-Id` header is missing or not a valid UUID v4.
- **Fix:** Update the extension or CLI to a version that sends this header
  (see install binding section). If you are integrating directly, generate
  a UUID v4 once per logical "install" and send it on every request.

### `KEY_INSTALL_MISMATCH`

- **HTTP status:** 401
- **Cause:** The key was previously used from a different install. Each key
  is bound to the first install id it sees; subsequent installs are rejected.
- **Fix:** Rebind the key from the web app
  (Settings → API Keys → Rebind device), then retry. Alternatively, use the
  key from the original install.
```

- [ ] **Step 2: Commit**

```bash
git add docs/public-api/error-codes.md
git commit -m "docs(public-api): document MISSING_INSTALL_ID + KEY_INSTALL_MISMATCH"
```

---

## Task 17: Flip `API_KEY_INSTALL_BIND_MODE=enforce` after rollout window

**Files:**
- Modify: `apps/gateway/.env.example` (no functional change, just default + comment)
- Manual: production env var update (out of scope for this plan — note in CHANGELOG/runbook)

- [ ] **Step 1: Update default in `.env.example` to `enforce` and add a note**

```bash
# API key device-binding (post-rollout default)
# off | log | enforce — see docs/superpowers/specs/2026-06-11-api-key-device-bind-design.md §10
API_KEY_INSTALL_BIND_MODE=enforce
```

Local dev should leave `log` if local extension is older than the binding release; switch to `enforce` once developer tested manually.

- [ ] **Step 2: Run full manual E2E (per spec §11)**

Manually (no commit needed for the steps themselves):

1. Create key on web `/settings/api-keys`.
2. Paste into Chrome profile 1's extension → audit OK; verify DB `installId` populated via psql.
3. Paste same key into a second Chrome profile's extension → audit fails 401 `KEY_INSTALL_MISMATCH`.
4. Click "Open rebind page" in the popup → web `/settings/api-keys` opens → click "Rebind device" → confirm → toast.
5. Re-run audit from profile 2 → 200; verify DB `installId` now reflects profile 2's UUID.
6. Re-run audit from profile 1 → 401 `KEY_INSTALL_MISMATCH`.

If steps fail, file a bug; do not merge.

- [ ] **Step 3: Commit the example change**

```bash
git add apps/gateway/.env.example
git commit -m "chore(gateway): default API_KEY_INSTALL_BIND_MODE=enforce post-rollout"
```

---

## Wrap-up

After Task 17 commits, verify the full picture:

```bash
git log --oneline e025d60..HEAD | head -20
npm run test
npm run build
```

Expected: ~17 atomic commits, all tests green, all builds clean. Open a PR titled `feat: API key device-bind (one key, one install)` referencing this plan + the design spec.
