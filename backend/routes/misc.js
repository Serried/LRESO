const express = require('express');
const pool = require('../lib/db');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { uploadTicketAttachment } = require('../utils/upload');
const { handle, bad, ok } = require('../lib/handler');

const router = express.Router();

router.get('/health', (_, res) => res.json({ status: 'OK', message: 'เซิร์ฟเวอร์กำลังทำงาน' }));
router.get('/test-db', handle(async (_, res) => { const [r] = await pool.query('SELECT 1+1 AS result'); ok(res, r); }));
router.get('/time', (_, res) => res.json({ serverTime: new Date().toISOString() }));

router.post('/ticket', optionalAuth, uploadTicketAttachment.single('attachment'), handle(async (req, res) => {
  const topic = (req.body?.topic || '').trim();
  if (!topic) return bad(res, 'กรุณาระบุหัวข้อ');
  const path = req.file ? `tickets/${req.file.filename}` : null;
  await pool.query(
    'INSERT INTO Ticket (type, topic, content, userID, status, attachment) VALUES (?, ?, ?, ?, \'OPEN\', ?)',
    [(req.body?.type || '').trim() || null, topic, (req.body?.content || '').trim(), req.user?.userID ?? null, path]
  );
  ok(res, null, 'ส่งคำร้องเรียบร้อยแล้ว');
}));

router.get('/subjects/group-names', requireAuth, handle(async (_, res) => {
  const [r] = await pool.query("SELECT DISTINCT group_name FROM Subject WHERE group_name IS NOT NULL AND group_name != '' ORDER BY group_name");
  ok(res, r.map((x) => x.group_name));
}));

router.get('/news/featured', handle(async (_, res) => {
  const [row] = await pool.query(`
    SELECT DISTINCT * 
    FROM Announcement 
    WHERE targetRole = 'ALL' AND (expireAt IS NULL OR datetime(expireAt) > datetime('now', 'localtime'))
    ORDER BY isPinned DESC, createdAt DESC
    LIMIT 3;
  `);
  ok(res, row);
}));

module.exports = router;
