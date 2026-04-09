import { PrismaClient, UserRole } from '../src/generated/prisma';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminPasswordHash = await bcrypt.hash('Admin@123', 12);

  await prisma.user.upsert({
    where: { email: 'admin@seo-analyst.com' },
    update: {},
    create: {
      email: 'admin@seo-analyst.com',
      passwordHash: adminPasswordHash,
      fullName: 'System Admin',
      role: UserRole.admin,
      isVerified: true,
    },
  });

  console.log('Gateway seed completed: admin user created');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
