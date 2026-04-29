const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { prisma } = require('../prisma.js');
const { requireAuthFresh } = require('../middleware/auth.js');

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const multerStorage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const upload = multer({ storage: multerStorage, limits: { fileSize: 8 * 1024 * 1024 } });

router.use(requireAuthFresh);

function householdFilter(req) {
  return req.user.householdId
    ? { householdId: req.user.householdId }
    : { userId: req.user.id };
}

function parseExpense(e) {
  return {
    ...e,
    images: (() => { try { return JSON.parse(e.images); } catch { return []; } })(),
  };
}

// GET /api/expenses?month=5&year=2025&categoryId=xxx&search=xxx&minAmount=0&maxAmount=999
router.get('/', async (req, res) => {
  try {
    const { month, year, categoryId, limit = 100, search, minAmount, maxAmount } = req.query;
    const where = { ...householdFilter(req) };
    if (month && year) {
      const start = new Date(Number(year), Number(month) - 1, 1);
      const end = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);
      where.createdAt = { gte: start, lte: end };
    }
    if (categoryId) where.categoryId = categoryId;
    if (minAmount || maxAmount) {
      where.amount = {};
      if (minAmount) where.amount.gte = parseFloat(minAmount);
      if (maxAmount) where.amount.lte = parseFloat(maxAmount);
    }
    if (search) {
      where.OR = [
        { note: { contains: search, mode: 'insensitive' } },
        { category: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }
    const expenses = await prisma.expense.findMany({
      where,
      include: {
        user: { select: { id: true, displayName: true, username: true } },
        category: true,
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
    });
    res.json(expenses.map(parseExpense));
  } catch (e) {
    console.error('[EXPENSES GET]', e);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// GET /api/expenses/:id
router.get('/:id', async (req, res) => {
  try {
    const expense = await prisma.expense.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, displayName: true, username: true } },
        category: true,
      },
    });
    if (!expense) return res.status(404).json({ message: 'Không tìm thấy chi tiêu' });
    res.json(parseExpense(expense));
  } catch (e) {
    console.error('[EXPENSES GET ID]', e);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// POST /api/expenses
router.post('/', upload.array('images', 5), async (req, res) => {
  try {
    const { amount, note, categoryId } = req.body;
    if (!amount || isNaN(parseFloat(amount))) {
      return res.status(400).json({ message: 'Số tiền không hợp lệ' });
    }
    const imagePaths = (req.files ?? []).map((f) => `/uploads/${f.filename}`);
    const expense = await prisma.expense.create({
      data: {
        amount: parseFloat(amount),
        note: note || null,
        imageUrl: imagePaths[0] ?? null,
        images: JSON.stringify(imagePaths),
        categoryId: categoryId || null,
        userId: req.user.id,
        householdId: req.user.householdId ?? null,
      },
      include: {
        user: { select: { id: true, displayName: true, username: true } },
        category: true,
      },
    });
    res.status(201).json(parseExpense(expense));
  } catch (e) {
    console.error('[EXPENSES POST]', e);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// PUT /api/expenses/:id
router.put('/:id', upload.array('images', 5), async (req, res) => {
  try {
    const { amount, note, categoryId, keepImages } = req.body;
    const data = {};
    if (amount) data.amount = parseFloat(amount);
    if (note !== undefined) data.note = note || null;
    if (categoryId !== undefined) data.categoryId = categoryId || null;

    const newFiles = (req.files ?? []).map((f) => `/uploads/${f.filename}`);
    const existing = keepImages ? JSON.parse(keepImages) : [];
    const allImages = [...existing, ...newFiles];
    data.images = JSON.stringify(allImages);
    data.imageUrl = allImages[0] ?? null;

    const expense = await prisma.expense.update({
      where: { id: req.params.id },
      data,
      include: {
        user: { select: { id: true, displayName: true, username: true } },
        category: true,
      },
    });
    res.json(parseExpense(expense));
  } catch (e) {
    console.error('[EXPENSES PUT]', e);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// DELETE /api/expenses/:id
router.delete('/:id', async (req, res) => {
  try {
    await prisma.expense.delete({ where: { id: req.params.id } });
    res.json({ message: 'Đã xóa chi tiêu' });
  } catch (e) {
    console.error('[EXPENSES DELETE]', e);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

module.exports = router;
