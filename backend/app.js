if (process.env.NODE_ENV !== 'test') require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const uploadsDir = path.join(__dirname, 'uploads');
['', 'avatars', 'csv', 'tickets'].forEach((d) => fs.mkdirSync(path.join(uploadsDir, d), { recursive: true }));

const app = express();

if (process.env.NODE_ENV !== 'test') {
  const c = { d: '\x1b[90m', g: '\x1b[32m', y: '\x1b[33m', r: '\x1b[0m' };
  app.use((req, res, next) => {
    console.log(`${c.d}[${new Date().toISOString()}]${c.r} ${req.ip || '?'} ${c.g}${req.method}${c.r} ${c.y}${req.originalUrl}${c.r}`);
    next();
  });
}

app.use(cors(), express.json());
app.use('/uploads', express.static(uploadsDir));

app.use('/api', require('./routes/misc'));
app.use('/api', require('./routes/auth'));
app.use('/api/me', require('./routes/me'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/users', require('./routes/users'));

module.exports = app;
