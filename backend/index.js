const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

require('dotenv').config();

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(path.join(uploadsDir, 'avatars'), { recursive: true });
fs.mkdirSync(path.join(uploadsDir, 'csv'), { recursive: true });
fs.mkdirSync(path.join(uploadsDir, 'tickets'), { recursive: true });

const app = express();

// debug
const c = { dim: '\x1b[90m', cyan: '\x1b[36m', yellow: '\x1b[33m', green: '\x1b[32m', magenta: '\x1b[35m', red: '\x1b[31m', reset: '\x1b[0m' };
const methodColor = (m) => ({ GET: c.cyan, POST: c.green, PUT: c.magenta, DELETE: c.red }[m] || c.yellow);
app.use((req, res, next) => {
  const ip = req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress || '?';
  const ts = new Date().toISOString();
  const mc = methodColor(req.method);
  console.log(`${c.dim}[${ts}]${c.reset} ${c.cyan}${ip}${c.reset} ${mc}${req.method}${c.reset} ${c.yellow}${req.originalUrl}${c.reset}`);
  next();
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

const authRoutes = require('./routes/auth');
const meRoutes = require('./routes/me');
const adminRoutes = require('./routes/admin');
const usersRoutes = require('./routes/users');
const miscRoutes = require('./routes/misc');

app.use('/api', miscRoutes);
app.use('/api', authRoutes);
app.use('/api/me', meRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', usersRoutes);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
