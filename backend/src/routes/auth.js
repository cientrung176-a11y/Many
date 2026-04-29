const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma } = require('../prisma.js');
const { requireAuth } = require('../middleware/auth.js');

function generateInviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function issueToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, householdId: user.householdId ?? null },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
}

function safeUser(user, household) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    email: user.email ?? null,
    householdId: user.householdId ?? null,
    householdName: household?.name ?? null,
    inviteCode: household?.inviteCode ?? null,
  };
}

router.post('/register', async (req, res) => {
  try {
    const { username, displayName, email, password, householdName, inviteCode } = req.body;
    if (!username || !password || !displayName) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin' });
    }
    if (username.length < 3) {
      return res.status(400).json({ message: 'Tên đăng nhập tối thiểu 3 ký tự' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu tối thiểu 6 ký tự' });
    }
    const existing = await prisma.user.findUnique({ where: { username: username.trim().toLowerCase() } });
    if (existing) return res.status(409).json({ message: 'Tên đăng nhập đã được sử dụng' });
    if (email) {
      const emailUsed = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
      if (emailUsed) return res.status(409).json({ message: 'Email đã được sử dụng' });
    }

    let household = null;
    if (inviteCode) {
      household = await prisma.household.findUnique({ where: { inviteCode: inviteCode.trim().toUpperCase() } });
      if (!household) return res.status(404).json({ message: 'Mã mời không tồn tại' });
    } else if (householdName) {
      let code = generateInviteCode();
      while (await prisma.household.findUnique({ where: { inviteCode: code } })) {
        code = generateInviteCode();
      }
      household = await prisma.household.create({
        data: { name: householdName.trim(), inviteCode: code },
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        username: username.trim().toLowerCase(),
        displayName: displayName.trim(),
        email: email ? email.trim().toLowerCase() : null,
        passwordHash,
        householdId: household?.id ?? null,
      },
    });
    res.status(201).json({ token: issueToken(user), user: safeUser(user, household) });
  } catch (e) {
    console.error('[REGISTER]', e);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Vui lòng nhập tài khoản và mật khẩu' });
    }
    const identifier = username.trim().toLowerCase();
    const user = await prisma.user.findFirst({
      where: { OR: [{ username: identifier }, { email: identifier }] },
      include: { household: true },
    });
    if (!user) return res.status(401).json({ message: 'Tài khoản không tồn tại' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Mật khẩu không đúng' });
    res.json({ token: issueToken(user), user: safeUser(user, user.household) });
  } catch (e) {
    console.error('[LOGIN]', e);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu mới tối thiểu 6 ký tự' });
    }
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const ok = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Mật khẩu hiện tại không đúng' });
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: req.user.id }, data: { passwordHash } });
    res.json({ message: 'Đổi mật khẩu thành công' });
  } catch (e) {
    console.error('[CHANGE-PASSWORD]', e);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// POST /auth/google — verify Google access_token from client, issue JWT
router.post('/google', async (req, res) => {
  try {
    const { access_token } = req.body;
    if (!access_token) return res.status(400).json({ message: 'Thiếu access_token' });

    const gRes = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${access_token}`);
    if (!gRes.ok) return res.status(401).json({ message: 'Token Google không hợp lệ' });
    const gUser = await gRes.json();

    const { sub: googleId, email, name: displayName, picture } = gUser;
    if (!googleId) return res.status(401).json({ message: 'Không lấy được thông tin Google' });

    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId }, ...(email ? [{ email }] : [])] },
      include: { household: true },
    });

    if (!user) {
      const baseUsername = (email ? email.split('@')[0] : `user_${googleId.slice(-6)}`).replace(/[^a-z0-9]/gi, '').toLowerCase();
      let username = baseUsername;
      let i = 1;
      while (await prisma.user.findUnique({ where: { username } })) {
        username = `${baseUsername}${i++}`;
      }
      user = await prisma.user.create({
        data: {
          username,
          displayName: displayName ?? username,
          email: email ?? null,
          googleId,
          passwordHash: await require('bcryptjs').hash(Math.random().toString(36), 10),
        },
        include: { household: true },
      });
    } else if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id }, data: { googleId },
        include: { household: true },
      });
    }

    res.json({ token: issueToken(user), user: safeUser(user, user.household) });
  } catch (e) {
    console.error('[GOOGLE AUTH]', e);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { household: true },
    });
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    res.json(safeUser(user, user.household));
  } catch (e) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

module.exports = router;
