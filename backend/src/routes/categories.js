const router = require('express').Router();
const { prisma } = require('../prisma.js');

router.get('/', async (req, res) => {
  try {
    const cats = await prisma.category.findMany({ orderBy: { name: 'asc' } });
    res.json(cats);
  } catch (e) {
    console.error('[CATEGORIES]', e);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

module.exports = router;
