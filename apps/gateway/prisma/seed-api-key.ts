/**
 * Seed: create a dev user (if missing) + emit one fresh sk_test_... API key.
 * Run: npx tsx prisma/seed-api-key.ts
 * Output: prints the plaintext key on stdout (only chance to see it).
 */
import { randomBytes, createHash } from 'node:crypto';
import { PrismaClient } from '../src/infra/prisma/generated';

const prisma = new PrismaClient();

async function main() {
  const email = 'dev@seoanalyst.local';
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      fullName: 'Dev User',
      isVerified: true,
      passwordHash: null,
    },
  });

  const randomPart = randomBytes(32).toString('base64url');
  const plaintext = `sk_test_${randomPart}`;
  const hashedKey = createHash('sha256').update(plaintext).digest('hex');
  const prefix = plaintext.slice(0, 16);

  const apiKey = await prisma.apiKey.create({
    data: {
      userId: user.id,
      name: 'Extension manual test',
      prefix,
      hashedKey,
      environment: 'test',
    },
  });

  console.log('\n=== API key generated ===');
  console.log(`User:  ${user.email} (${user.id})`);
  console.log(`Key id: ${apiKey.id}`);
  console.log(`Plaintext (paste this into the extension options):`);
  console.log(plaintext);
  console.log('===');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
