// prisma/seed.js
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  await prisma.user.deleteMany({ where: { email: 'demo@teleauth.com' } });

  const passwordHash = await bcrypt.hash('Password123!', 12);

  const user = await prisma.user.create({
    data: { email: 'demo@teleauth.com', passwordHash, fullName: 'Demo User', isActive: true },
  });

  console.log('✅ Demo user created:');
  console.log('   Email   :', user.email);
  console.log('   Password: Password123!');
  console.log('   ID      :', user.id);
  console.log('');
  console.log('⚠️  Next: visit /link-telegram to link your Telegram before testing login.');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
