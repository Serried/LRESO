const express = require('express');
const pool = require('../lib/db');
const { requireAuth } = require('../middleware/auth');
const { upload } = require('../utils/upload');

const router = express.Router();

router.post('/me/avatar', requireAuth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'กรุณาอัพโหลดไฟล์' });
    }
    const avatarPath = `avatars/${req.file.filename}`;
    await pool.query('UPDATE User SET avatar = ? WHERE userID = ?', [avatarPath, req.user.userID]);
    res.json({ success: true, avatar: avatarPath });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
