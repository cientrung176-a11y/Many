const jwt = require('jsonwebtoken');
const { prisma } = require('../prisma.js');

function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Chưa đăng nhập' });
  }
  try {
    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
  }
}

// Middleware that also loads fresh householdId from DB (for routes that need up-to-date data)
async function requireAuthFresh(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Chưa đăng nhập' });
  }
  try {
    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, username: true, householdId: true, displayName: true },
    });
    if (!user) return res.status(401).json({ message: 'Người dùng không tồn tại' });
    req.user = { ...decoded, ...user };
    next();
  } catch {
    return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
  }
}

module.exports = { requireAuth, requireAuthFresh };
