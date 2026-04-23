# Getting started

## 1. Create an account

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H 'content-type: application/json' \
  -d '{"email":"you@example.com","password":"StrongPass123!","fullName":"You"}'
```

Or register via the web UI at `/register`.

## 2. Log in and copy your access token

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"you@example.com","password":"StrongPass123!"}'
# → { "user": {...}, "accessToken": "<jwt>" }
```

## 3. Create an API key

```bash
curl -X POST http://localhost:3000/api/v1/users/me/api-keys \
  -H "authorization: Bearer <jwt>" \
  -H 'content-type: application/json' \
  -d '{"name":"My CI","environment":"test"}'
# → { "id": "...", "prefix": "sk_test_abc12345", "plaintext": "sk_test_abc12345xxxxxx..." }
```

> **Save `plaintext` immediately** — the server won't show it again.

## 4. Make your first check

```bash
curl -X POST http://localhost:3000/api/v1/public/check \
  -H "authorization: Bearer sk_test_abc12345..." \
  -H 'content-type: application/json' \
  -d '{
    "input": { "type": "url", "url": "https://example.com/post" },
    "targetKeyword": "seo 2026",
    "options": { "enrichMode": "template", "language": "vi" }
  }'
```

The response is documented in [output-schema.md](./output-schema.md).

## 5. Next steps

- Try other input types: [input-types.md](./input-types.md)
- Gate CI with the CLI: [cli.md](./cli.md)
- Understand errors: [error-codes.md](./error-codes.md)
