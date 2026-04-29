require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const CATEGORIES = [
  { name: 'Ăn uống',    icon: '🍜', color: '#f97316' },
  { name: 'Di chuyển',  icon: '🚗', color: '#3b82f6' },
  { name: 'Mua sắm',    icon: '🛍️', color: '#a855f7' },
  { name: 'Hóa đơn',    icon: '💡', color: '#eab308' },
  { name: 'Sức khỏe',   icon: '🏥', color: '#ef4444' },
  { name: 'Giải trí',   icon: '🎮', color: '#06b6d4' },
  { name: 'Giáo dục',   icon: '📚', color: '#10b981' },
  { name: 'Nhà cửa',    icon: '🏠', color: '#8b5cf6' },
  { name: 'Khác',       icon: '💰', color: '#6b7280' },
];

async function main() {
  console.log('\n🌱 Seeding categories...\n');
  for (const c of CATEGORIES) {
    await prisma.category.upsert({
      where: { name: c.name },
      update: {},
      create: c,
    });
  }
  console.log(`  ✅ ${CATEGORIES.length} categories ready\n`);
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
