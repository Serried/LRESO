const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

require('dotenv').config();

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(path.join(uploadsDir, 'avatars'), { recursive: true });
fs.mkdirSync(path.join(uploadsDir, 'csv'), { recursive: true });

const app = express();
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
