const router = require('express').Router();
const { prisma } = require('../prisma.js');
const { requireAuth } = require('../middleware/auth.js');

router.use(requireAuth);

function calcNextDate(frequency, dayOfMonth, dayOfWeek) {
  const now = new Date();
  const d = new Date(now);
  if (frequency === 'daily') {
    d.setDate(d.getDate() + 1);
  } else if (frequency === 'weekly') {
    const target = dayOfWeek ?? 1;
    const diff = ((target - d.getDay()) + 7) % 7 || 7;
    d.setDate(d.getDate() + diff);
  } else {
    const target = dayOfMonth ?? 1;
    d.setMonth(d.getMonth() + 1);
    d.setDate(Math.min(target, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  }
  d.setHours(8, 0, 0, 0);
  return d;
}

// GET /api/recurring
router.get('/', async (req, res) => {
  try {
    const items = await prisma.recurringExpense.findMany({
      where: { userId: req.user.id },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(items);
  } catch (e) {
    console.error('[RECURRING GET]', e);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// POST /api/recurring
router.post('/', async (req, res) => {
  try {
    const { amount, note, categoryId, frequency, dayOfMonth, dayOfWeek } = req.body;
    if (!amount || isNaN(parseFloat(amount))) {
      return res.status(400).json({ message: 'Số tiền không hợp lệ' });
    }
    if (!['daily', 'weekly', 'monthly'].includes(frequency)) {
      return res.status(400).json({ message: 'Tần suất không hợp lệ' });
    }
    const nextDate = calcNextDate(frequency, dayOfMonth ? Number(dayOfMonth) : null, dayOfWeek ? Number(dayOfWeek) : null);
    const item = await prisma.recurringExpense.create({
      data: {
        amount: parseFloat(amount),
        note: note || null,
        categoryId: categoryId || null,
        userId: req.user.id,
        frequency,
        dayOfMonth: dayOfMonth ? Number(dayOfMonth) : null,
        dayOfWeek: dayOfWeek ? Number(dayOfWeek) : null,
        nextDate,
      },
      include: { category: true },
    });
    res.status(201).json(item);
  } catch (e) {
    console.error('[RECURRING POST]', e);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// PATCH /api/recurring/:id/toggle
router.patch('/:id/toggle', async (req, res) => {
  try {
    const item = await prisma.recurringExpense.findUnique({ where: { id: req.params.id } });
    if (!item || item.userId !== req.user.id) {
      return res.status(404).json({ message: 'Không tìm thấy' });
    }
    const updated = await prisma.recurringExpense.update({
      where: { id: req.params.id },
      data: { active: !item.active },
      include: { category: true },
    });
    res.json(updated);
  } catch (e) {
    console.error('[RECURRING TOGGLE]', e);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// DELETE /api/recurring/:id
router.delete('/:id', async (req, res) => {
  try {
    const item = await prisma.recurringExpense.findUnique({ where: { id: req.params.id } });
    if (!item || item.userId !== req.user.id) {
      return res.status(404).json({ message: 'Không tìm thấy' });
    }
    await prisma.recurringExpense.delete({ where: { id: req.params.id } });
    res.json({ message: 'Đã xóa' });
  } catch (e) {
    console.error('[RECURRING DELETE]', e);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// POST /api/recurring/process — called by mobile on app open
router.post('/process', async (req, res) => {
  try {
    const now = new Date();
    const due = await prisma.recurringExpense.findMany({
      where: { userId: req.user.id, active: true, nextDate: { lte: now } },
    });
    let created = 0;
    for (const r of due) {
      await prisma.expense.create({
        data: {
          amount: r.amount,
          note: r.note,
          categoryId: r.categoryId,
          userId: r.userId,
          images: '[]',
        },
      });
      const nextDate = calcNextDate(r.frequency, r.dayOfMonth, r.dayOfWeek);
      await prisma.recurringExpense.update({
        where: { id: r.id },
        data: { lastRunAt: now, nextDate },
      });
      created++;
    }
    res.json({ processed: created });
  } catch (e) {
    console.error('[RECURRING PROCESS]', e);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

module.exports = router;
