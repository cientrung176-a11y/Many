const router = require('express').Router();
const { prisma } = require('../prisma.js');
const { requireAuthFresh } = require('../middleware/auth.js');

router.use(requireAuthFresh);

function hhFilter(req) {
  return req.user.householdId
    ? { householdId: req.user.householdId }
    : { userId: req.user.id };
}

// GET /api/stats/month?month=5&year=2025
router.get('/month', async (req, res) => {
  try {
    const now = new Date();
    const month = Number(req.query.month ?? now.getMonth() + 1);
    const year = Number(req.query.year ?? now.getFullYear());

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    const expenses = await prisma.expense.findMany({
      where: { ...hhFilter(req), createdAt: { gte: start, lte: end } },
      include: {
        category: true,
        user: { select: { id: true, displayName: true } },
      },
    });

    const total = expenses.reduce((s, e) => s + e.amount, 0);

    // Nhóm theo danh mục
    const byCatMap = {};
    for (const e of expenses) {
      const key = e.category?.name ?? 'Khác';
      if (!byCatMap[key]) {
        byCatMap[key] = {
          name: key,
          icon: e.category?.icon ?? '💰',
          color: e.category?.color ?? '#6b7280',
          total: 0,
          count: 0,
        };
      }
      byCatMap[key].total += e.amount;
      byCatMap[key].count += 1;
    }

    // Nhóm theo ngày
    const byDayMap = {};
    for (const e of expenses) {
      const day = new Date(e.createdAt).getDate();
      byDayMap[day] = (byDayMap[day] ?? 0) + e.amount;
    }

    // Nhóm theo người dùng
    const byUserMap = {};
    for (const e of expenses) {
      const name = e.user.displayName;
      byUserMap[name] = (byUserMap[name] ?? 0) + e.amount;
    }

    res.json({
      total,
      count: expenses.length,
      month,
      year,
      byCategory: Object.values(byCatMap).sort((a, b) => b.total - a.total),
      byDay: byDayMap,
      byUser: byUserMap,
    });
  } catch (e) {
    console.error('[STATS MONTH]', e);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// GET /api/stats/compare
router.get('/compare', async (req, res) => {
  try {
    const now = new Date();
    const cm = now.getMonth() + 1;
    const cy = now.getFullYear();
    let pm = cm - 1;
    let py = cy;
    if (pm === 0) { pm = 12; py -= 1; }

    async function getMonthTotal(m, y) {
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0, 23, 59, 59, 999);
      const r = await prisma.expense.aggregate({
        where: { ...hhFilter(req), createdAt: { gte: start, lte: end } },
        _sum: { amount: true },
        _count: true,
      });
      return { total: r._sum.amount ?? 0, count: r._count };
    }

    const [current, previous] = await Promise.all([
      getMonthTotal(cm, cy),
      getMonthTotal(pm, py),
    ]);

    const diff = current.total - previous.total;
    const pct = previous.total > 0 ? ((diff / previous.total) * 100).toFixed(1) : null;

    res.json({
      current: current.total,
      currentCount: current.count,
      previous: previous.total,
      previousCount: previous.count,
      diff,
      pct,
      currentMonth: `${cm}/${cy}`,
      previousMonth: `${pm}/${py}`,
    });
  } catch (e) {
    console.error('[STATS COMPARE]', e);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// GET /api/stats/insights
router.get('/insights', async (req, res) => {
  try {
    const now = new Date();
    const cm = now.getMonth() + 1;
    const cy = now.getFullYear();
    let pm = cm - 1; let py = cy;
    if (pm === 0) { pm = 12; py -= 1; }

    const [currExp, prevExp] = await Promise.all([
      prisma.expense.findMany({
        where: { createdAt: { gte: new Date(cy, cm - 1, 1), lte: new Date(cy, cm, 0, 23, 59, 59) } },
        include: { category: true },
      }),
      prisma.expense.findMany({
        where: { createdAt: { gte: new Date(py, pm - 1, 1), lte: new Date(py, pm, 0, 23, 59, 59) } },
        include: { category: true },
      }),
    ]);

    const insights = [];

    const currTotal = currExp.reduce((s, e) => s + e.amount, 0);
    const prevTotal = prevExp.reduce((s, e) => s + e.amount, 0);

    if (prevTotal > 0) {
      const pct = ((currTotal - prevTotal) / prevTotal * 100).toFixed(0);
      if (Number(pct) > 20) {
        insights.push({ type: 'warning', icon: '⚠️', text: `Chi tiêu tháng này tăng ${pct}% so với tháng trước` });
      } else if (Number(pct) < -10) {
        insights.push({ type: 'positive', icon: '🎉', text: `Tuyệt vời! Chi tiêu giảm ${Math.abs(Number(pct))}% so với tháng trước` });
      }
    }

    const catMapCurr = {};
    const catMapPrev = {};
    for (const e of currExp) {
      const k = e.category?.name ?? 'Khác';
      catMapCurr[k] = (catMapCurr[k] ?? 0) + e.amount;
    }
    for (const e of prevExp) {
      const k = e.category?.name ?? 'Khác';
      catMapPrev[k] = (catMapPrev[k] ?? 0) + e.amount;
    }

    const topCat = Object.entries(catMapCurr).sort((a, b) => b[1] - a[1])[0];
    if (topCat && currTotal > 0) {
      const pct = ((topCat[1] / currTotal) * 100).toFixed(0);
      if (Number(pct) > 40) {
        insights.push({ type: 'info', icon: '📊', text: `${topCat[0]} chiếm ${pct}% tổng chi tiêu tháng này` });
      }
    }

    for (const [cat, curr] of Object.entries(catMapCurr)) {
      const prev = catMapPrev[cat] ?? 0;
      if (prev > 0) {
        const pct = ((curr - prev) / prev * 100);
        if (pct > 50 && curr > 100000) {
          insights.push({ type: 'warning', icon: '📈', text: `${cat} tăng ${pct.toFixed(0)}% so với tháng trước` });
        }
      }
    }

    const avgPerDay = currTotal / now.getDate();
    const projected = avgPerDay * new Date(cy, cm, 0).getDate();
    if (projected > prevTotal * 1.1 && prevTotal > 0) {
      insights.push({
        type: 'info', icon: '🔮',
        text: `Dự báo cuối tháng: ${projected.toLocaleString('vi-VN')}₫`,
      });
    }

    if (currExp.length === 0) {
      insights.push({ type: 'positive', icon: '🌟', text: 'Tháng này chưa có chi tiêu — khởi đầu tốt!' });
    }

    res.json({ insights, currTotal, prevTotal, currCount: currExp.length });
  } catch (e) {
    console.error('[STATS INSIGHTS]', e);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// GET /api/stats/members — spending by member in household (current month)
router.get('/members', async (req, res) => {
  try {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const expenses = await prisma.expense.findMany({
      where: { ...hhFilter(req), createdAt: { gte: start, lte: end } },
      include: { user: { select: { id: true, displayName: true, username: true } } },
    });

    const memberMap = {};
    for (const e of expenses) {
      const uid = e.userId;
      if (!memberMap[uid]) {
        memberMap[uid] = {
          userId: uid,
          displayName: e.user.displayName,
          username: e.user.username,
          total: 0,
          count: 0,
        };
      }
      memberMap[uid].total += e.amount;
      memberMap[uid].count += 1;
    }

    const grandTotal = expenses.reduce((s, e) => s + e.amount, 0);
    const members = Object.values(memberMap)
      .sort((a, b) => b.total - a.total)
      .map((m) => ({
        ...m,
        percentage: grandTotal > 0 ? Math.round((m.total / grandTotal) * 100) : 0,
      }));

    res.json({ members, grandTotal, month: now.getMonth() + 1, year: now.getFullYear() });
  } catch (e) {
    console.error('[STATS MEMBERS]', e);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

module.exports = router;
