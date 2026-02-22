const express = require('express');
const pool = require('../lib/db');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { uploadTicketAttachment } = require('../utils/upload');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'เซิร์ฟเวอร์กำลังทำงาน' });
});

router.get('/test-db', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1+1 AS result');
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/time', (req, res) => {
  res.json({ serverTime: new Date().toISOString() });
});

router.post('/ticket', optionalAuth, uploadTicketAttachment.single('attachment'), async (req, res) => {
  try {
    const { type, topic, content } = req.body || {};
    if (!topic || !String(topic).trim()) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุหัวข้อ' });
    }
    const attachmentPath = req.file ? `tickets/${req.file.filename}` : null;
    await pool.query(
      `INSERT INTO Ticket (type, topic, content, userID, status, attachment)
       VALUES (?, ?, ?, ?, 'OPEN', ?)`,
      [
        (type || '').trim() || null,
        (topic || '').trim(),
        (content || '').trim(),
        req.user?.userID ?? null,
        attachmentPath
      ]
    );
    res.json({ success: true, message: 'ส่งคำร้องเรียบร้อยแล้ว' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/subjects/group-names', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT DISTINCT group_name FROM Subject WHERE group_name IS NOT NULL AND group_name != \'\' ORDER BY group_name'
    );
    res.json({ success: true, data: rows.map(r => r.group_name) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message });
  }
});


module.exports = router;
