# Demo user cho load test

Part A và Part B đều login bằng 1 tài khoản. Tài khoản phải là **admin**
(role=admin) để bypass QuotaGuard khi bắn nhiều POST /audits ở Part B.

## Tạo user

1. Đăng ký qua API (gateway đang chạy ở :3000):

   curl -X POST http://localhost:3000/api/v1/auth/register \
     -H 'Content-Type: application/json' \
     -d '{"email":"demo@loadtest.local","password":"Demo12345!","name":"Demo"}'

2. Nâng role lên admin trong Postgres (psql vào DB gateway):

   UPDATE "users" SET role = 'admin' WHERE email = 'demo@loadtest.local';

3. Xác nhận login trả accessToken:

   curl -s -X POST http://localhost:3000/api/v1/auth/login \
     -H 'Content-Type: application/json' \
     -d '{"email":"demo@loadtest.local","password":"Demo12345!"}' | head

> Nếu cột role/bảng users khác tên, kiểm tra schema:
> apps/gateway/prisma/schema.prisma (model User → @@map("users"), field role).
