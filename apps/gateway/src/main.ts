import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { PublicApiModule } from './public-api/public-api.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Trust the configured number of reverse-proxy hops so that `req.ip`
  // (and any IP-based bucket) reflects the real client IP rather than the
  // load-balancer's. Without this, an attacker holding a single API key
  // can bypass the per-IP rate-limit by spoofing X-Forwarded-For — the
  // controller would otherwise have to read the raw header itself, which
  // is exactly the bypass we're closing here.
  // Default: 1 hop (Railway / single fronting LB). Set TRUST_PROXY_HOPS=N
  // for multi-hop topologies, or TRUST_PROXY_HOPS=0 to disable.
  const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS ?? '1');
  const expressApp = app.getHttpAdapter().getInstance() as { set: (k: string, v: unknown) => void };
  expressApp.set('trust proxy', Number.isFinite(trustProxyHops) ? trustProxyHops : 1);

  app.setGlobalPrefix('api/v1');
  app.use(cookieParser());
  app.use(helmet({ contentSecurityPolicy: false }));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3001',
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('SEO Analyst Platform API')
    .setDescription(
      `Gateway REST API for SEO analysis microservices.

## Test Accounts (seeded data)
| Email | Password | Role | Status |
|-------|----------|------|--------|
| \`admin@test.seo.local\` | _(use /register)_ | admin | verified |
| \`duc@test.seo.local\` | _(use /register)_ | user | verified, 10 audits |
| \`linh@test.seo.local\` | _(use /register)_ | user | verified, 2 audits |
| \`nam@test.seo.local\` | _(use /register)_ | user | verified, 0 audits |
| \`unverified@test.seo.local\` | _(use /register)_ | user | NOT verified |
| \`locked@test.seo.local\` | _(use /register)_ | user | LOCKED |

## Test Audit IDs (user: duc)
| Audit ID | Domain | Status | Score |
|----------|--------|--------|-------|
| \`b0000001-0000-0000-0000-000000000001\` | google.com | completed | 92.50 |
| \`b0000001-0000-0000-0000-000000000002\` | facebook.com | completed | 78.30 |
| \`b0000001-0000-0000-0000-000000000003\` | github.com | completed | 85.70 |
| \`b0000001-0000-0000-0000-000000000005\` | shopee.vn | completed | 64.80 |
| \`b0000001-0000-0000-0000-000000000006\` | google.com | completed | 94.10 |
| \`b0000001-0000-0000-0000-000000000007\` | tiki.vn | crawling | — |
| \`b0000001-0000-0000-0000-000000000008\` | vnexpress.net | analyzing | — |
| \`b0000001-0000-0000-0000-000000000009\` | example.com | failed | — |
| \`b0000001-0000-0000-0000-000000000010\` | fpt.com.vn | pending | — |

## Share Link Tokens
| Token | Domain | Active |
|-------|--------|--------|
| \`share_google_abc123def456\` | google.com | yes |
| \`share_github_xyz789ghi012\` | github.com | yes |
| \`share_shopee_revoked00001\` | shopee.vn | revoked |

## Compare Audits
So sanh 2 lan audit google.com: \`audit1=b0000001-...01\` vs \`audit2=b0000001-...06\`
`,
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth('refresh_token')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  // Public API spec — scope-limited to PublicApiModule only. External
  // consumers see ONLY /public/* + /users/me/api-keys endpoints, never
  // /auth, /audits, /admin, /scheduled-audits.
  const publicSwaggerConfig = new DocumentBuilder()
    .setTitle('SEO Analyst Public API')
    .setDescription(
      'Third-party SEO content check API. Authenticate with `Authorization: Bearer sk_live_...` or `sk_test_...` (create keys at `/api/v1/users/me/api-keys`).',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'sk_live_...' },
      'apiKey',
    )
    .addServer(
      process.env.PUBLIC_API_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`,
      'Current',
    )
    .build();
  const publicDocument = SwaggerModule.createDocument(app, publicSwaggerConfig, {
    include: [PublicApiModule],
  });
  SwaggerModule.setup('api/v1/public/docs', app, publicDocument, {
    jsonDocumentUrl: 'api/v1/public/openapi.json',
    swaggerOptions: { persistAuthorization: true },
  });

  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  logger.log(`Gateway running on http://localhost:${port}`);
  logger.log(`Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
