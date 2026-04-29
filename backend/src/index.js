require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const app = express();

// ── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ── Health check ────────────────────────────────────────────
app.get('/api/health', (_, res) => {
  res.json({
    ok: true,
    message: '💰 LIỄU ĂN CỨC API đang chạy!',
    time: new Date().toISOString(),
  });
});

// ── Routes ──────────────────────────────────────────────────
app.use('/api/auth',       require('./routes/auth.js'));
app.use('/api/expenses',   require('./routes/expenses.js'));
app.use('/api/stats',      require('./routes/stats.js'));
app.use('/api/categories', require('./routes/categories.js'));
app.use('/api/recurring',  require('./routes/recurring.js'));
app.use('/api/household',  require('./routes/household.js'));

// ── 404 ─────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: `Không tìm thấy route: ${req.method} ${req.path}` });
});

// ── Error handler ────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err);
  res.status(err.status || 500).json({ message: err.message || 'Lỗi server' });
});

// ── Start ────────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║   💰  LIỄU ĂN CỨC  - Backend API           ║');
  console.log('╚══════════════════════════════════════════════╝\n');
  console.log(`  🚀  Server: http://localhost:${PORT}`);
  console.log(`  📱  Mobile: http://<IP_MÁY_TÍNH>:${PORT}`);
  console.log(`  ❤️   Health: http://localhost:${PORT}/api/health\n`);
  console.log('  💡  Dùng lệnh sau để lấy IP máy tính:');
  console.log('      Windows: ipconfig | findstr IPv4\n');
});
