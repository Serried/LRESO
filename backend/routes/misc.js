const express = require('express');
const pool = require('../lib/db');
const { requireAuth } = require('../middleware/auth');

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

router.get('/subjects/add-subject', requireAuth, requireAdmin, async (req, res) => {
  try {
    const {
      
    } = req.body
    await pool.query(
      `
      INSERT INTO
      `
    )
  } catch(e) {
    console.error(e)
    res.status(500).json({success: false, message: e.message})
  }
})

module.exports = router;
