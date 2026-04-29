const router = require('express').Router();
const { prisma } = require('../prisma.js');
const { requireAuthFresh } = require('../middleware/auth.js');

router.use(requireAuthFresh);

// GET /api/household/me — current household info + members
router.get('/me', async (req, res) => {
  try {
    if (!req.user.householdId) {
      return res.json({ household: null, members: [] });
    }
    const household = await prisma.household.findUnique({
      where: { id: req.user.householdId },
      include: {
        users: {
          select: { id: true, username: true, displayName: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!household) return res.json({ household: null, members: [] });
    res.json({ household, members: household.users });
  } catch (e) {
    console.error('[HOUSEHOLD ME]', e);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// POST /api/household/join — existing user joins a household
router.post('/join', async (req, res) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode) return res.status(400).json({ message: 'Thiếu mã mời' });
    const household = await prisma.household.findUnique({
      where: { inviteCode: inviteCode.trim().toUpperCase() },
    });
    if (!household) return res.status(404).json({ message: 'Mã mời không tồn tại' });
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { householdId: household.id },
      include: { household: true },
    });
    res.json({
      message: `Đã tham gia gia đình "${household.name}"`,
      householdId: household.id,
      householdName: household.name,
      inviteCode: household.inviteCode,
    });
  } catch (e) {
    console.error('[HOUSEHOLD JOIN]', e);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// POST /api/household/create — existing user creates a household
router.post('/create', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Tên gia đình không được trống' });
    if (req.user.householdId) {
      return res.status(409).json({ message: 'Bạn đã thuộc một gia đình rồi' });
    }

    function generateInviteCode() {
      return Math.random().toString(36).slice(2, 8).toUpperCase();
    }
    let code = generateInviteCode();
    while (await prisma.household.findUnique({ where: { inviteCode: code } })) {
      code = generateInviteCode();
    }
    const household = await prisma.household.create({
      data: { name: name.trim(), inviteCode: code },
    });
    await prisma.user.update({
      where: { id: req.user.id },
      data: { householdId: household.id },
    });
    res.status(201).json({
      householdId: household.id,
      householdName: household.name,
      inviteCode: household.inviteCode,
    });
  } catch (e) {
    console.error('[HOUSEHOLD CREATE]', e);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

module.exports = router;
