---
name: testing
description: Use this skill when the user asks about "test", "Vitest", "unit test", "integration test", "E2E", "Playwright test", "testing library", "mock", "coverage", or any testing-related work. Provides Vitest patterns for backend/frontend, Playwright E2E, and testing best practices.
allowed-tools: Read, Grep, Glob, Bash(npx vitest *), Bash(npx playwright *), Bash(npm test *), Bash(npm run test*)
---

# Testing Patterns (Vitest + Playwright)

## Test Stack

| Layer | Tool | Purpose |
|-------|------|---------|
| Unit (Backend) | Vitest | Service, utility, rule analyzer tests |
| Unit (Frontend) | Vitest + Testing Library | Component, hook tests |
| Integration | Vitest + Supertest | API endpoint tests |
| E2E | Playwright | Full user flow tests |

---

## Backend Unit Tests (Vitest)

### SEO Rule Analyzer Test

```typescript
// modules/rules/analyzers/on-page/__tests__/title.analyzer.test.ts
import { describe, it, expect } from 'vitest';
import { TitleAnalyzer } from '../title.analyzer';
import { createMockPageData } from '../../../../test/fixtures';

describe('TitleAnalyzer', () => {
  const analyzer = new TitleAnalyzer();

  it('should return critical issue when title is missing', () => {
    const pageData = createMockPageData({ title: '' });
    const issues = analyzer.analyze(pageData);

    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      rule: 'title-tag',
      severity: 'critical',
    });
  });

  it('should return warning when title is too short', () => {
    const pageData = createMockPageData({ title: 'Short' });
    const issues = analyzer.analyze(pageData);

    expect(issues[0].severity).toBe('warning');
  });

  it('should return no issues for valid title (50-60 chars)', () => {
    const pageData = createMockPageData({
      title: 'A perfectly good SEO title that is the right length',
    });
    const issues = analyzer.analyze(pageData);

    expect(issues).toHaveLength(0);
  });
});
```

### Service Test with Mocked Dependencies

```typescript
// modules/audit/__tests__/audit.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditService } from '../audit.service';
import { prisma } from '../../../prisma/client';

// Mock Prisma
vi.mock('../../../prisma/client', () => ({
  prisma: {
    auditJob: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

describe('AuditService', () => {
  const service = new AuditService();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return cached result for duplicate URL within 5 minutes', async () => {
    const cachedResult = { id: '123', url: 'https://example.com', status: 'COMPLETED' };
    vi.mocked(prisma.auditJob.findFirst).mockResolvedValue(cachedResult as any);

    const result = await service.createAudit('https://example.com');

    expect(result).toEqual(cachedResult);
    expect(prisma.auditJob.create).not.toHaveBeenCalled();
  });

  it('should create new job when no recent audit exists', async () => {
    vi.mocked(prisma.auditJob.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.auditJob.create).mockResolvedValue({ id: 'new-123' } as any);

    const result = await service.createAudit('https://example.com');

    expect(prisma.auditJob.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ url: 'https://example.com' }),
    });
  });
});
```

---

## Backend Integration Tests (Supertest)

```typescript
// modules/audit/__tests__/audit.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../../app';

describe('POST /api/audits', () => {
  it('should create audit job with valid URL', async () => {
    const response = await request(app)
      .post('/api/audits')
      .send({ url: 'https://example.com' })
      .expect(201);

    expect(response.body).toMatchObject({
      success: true,
      data: { jobId: expect.any(String) },
    });
  });

  it('should reject invalid URL', async () => {
    const response = await request(app)
      .post('/api/audits')
      .send({ url: 'not-a-url' })
      .expect(400);

    expect(response.body.success).toBe(false);
  });

  it('should enforce rate limiting', async () => {
    // Send many requests to trigger rate limit
    const requests = Array.from({ length: 10 }, () =>
      request(app).post('/api/audits').send({ url: 'https://example.com' })
    );

    const responses = await Promise.all(requests);
    const rateLimited = responses.some(r => r.status === 429);
    expect(rateLimited).toBe(true);
  });
});
```

---

## Frontend Component Tests (Vitest + Testing Library)

### Vitest Config for Next.js

```typescript
// vitest.config.ts (apps/web)
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    setupFiles: './test/setup.ts',
    globals: true,
    css: false, // Skip CSS parsing for speed
  },
});

// test/setup.ts
import '@testing-library/jest-dom/vitest';
```

### Component Test

```typescript
// components/audit/__tests__/url-input.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { URLInput } from '../url-input';

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe('URLInput', () => {
  it('should render input and submit button', () => {
    renderWithProviders(<URLInput />);

    expect(screen.getByPlaceholderText(/https:\/\/example.com/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /analyze/i })).toBeInTheDocument();
  });

  it('should disable button when input is empty', () => {
    renderWithProviders(<URLInput />);

    const button = screen.getByRole('button', { name: /analyze/i });
    // HTML required attr prevents submission of empty input
  });
});
```

---

## E2E Tests (Playwright)

```typescript
// e2e/audit-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('SEO Audit Flow', () => {
  test('should complete full audit flow', async ({ page }) => {
    // 1. Visit landing page
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /seo analysis/i })).toBeVisible();

    // 2. Submit URL
    await page.getByPlaceholder('https://example.com').fill('https://example.com');
    await page.getByRole('button', { name: /analyze/i }).click();

    // 3. Wait for progress page
    await expect(page).toHaveURL(/\/audit\/.+/);
    await expect(page.getByText(/crawling|analyzing|scoring/i)).toBeVisible();

    // 4. Wait for completion (max 60s)
    await expect(page.getByText(/completed/i)).toBeVisible({ timeout: 60000 });

    // 5. Check results
    await expect(page.getByText(/overall score/i)).toBeVisible();
    await expect(page.getByText(/issues/i)).toBeVisible();
  });

  test('should show error for invalid URL', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('https://example.com').fill('not-a-url');
    await page.getByRole('button', { name: /analyze/i }).click();

    await expect(page.getByText(/invalid/i)).toBeVisible();
  });
});
```

### Playwright Config

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 90000,
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## Test Fixtures

```typescript
// test/fixtures.ts
import { PageData } from '@shared/types/audit';

export function createMockPageData(overrides: Partial<PageData> = {}): PageData {
  return {
    url: 'https://example.com',
    title: 'Example Domain - Best Example Website',
    metaDescription: 'This is an example domain for testing SEO analysis.',
    canonical: 'https://example.com',
    h1Tags: ['Example Domain'],
    h2Tags: ['About', 'Services'],
    images: [{ src: '/logo.png', alt: 'Logo' }],
    internalLinks: ['/about', '/contact', '/services'],
    externalLinks: ['https://external.com'],
    statusCode: 200,
    responseTime: 250,
    htmlSize: 15000,
    headers: { 'content-encoding': 'gzip', 'cache-control': 'max-age=3600' },
    schemaOrg: [],
    ...overrides,
  };
}
```

---

## Common Commands

```bash
# Unit + Integration tests
npx vitest                      # Watch mode
npx vitest run                  # Single run
npx vitest run --coverage       # With coverage
npx vitest run modules/rules    # Run specific folder

# E2E tests
npx playwright test             # Run all E2E
npx playwright test --ui        # Visual UI mode
npx playwright test --headed    # See browser
npx playwright show-report      # View HTML report
```

---

## Checklist

```
Structure:
- __tests__/ folder next to source files
- Fixture files in test/fixtures.ts
- Setup file for global test config

Backend:
- Mock Prisma with vi.mock()
- Mock Redis with vi.mock() or ioredis-mock
- Supertest for API integration tests
- Each SEO rule has dedicated unit tests

Frontend:
- renderWithProviders() wrapper (QueryClient)
- Testing Library for component tests
- Vitest environment: jsdom
- Skip CSS in unit tests (css: false)

E2E:
- Playwright for full user flows
- Screenshot on failure
- Trace on first retry
- 60-90s timeout for audit completion
```
