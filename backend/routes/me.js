const express = require('express');
const pool = require('../lib/db');
const { requireAuth, requireStudent, requireTeacher, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/teacher', requireTeacher, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT t.teacherID, t.first_name, t.last_name, t.thai_first_name, t.thai_last_name,
        t.gender, t.dob, t.tel, t.email, t.department, t.status, u.avatar
      FROM User u
      JOIN Teacher t ON u.refID = t.teacherID
      WHERE u.userID = ?
    `, [req.user.userID]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบครูผู้สอน' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'เซิร์ฟเวอร์ขัดข้อง' });
  }
});

router.get('/student', requireStudent, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT s.studentID, s.first_name, s.last_name, s.gender, s.dob, s.tel, s.address, s.status
      FROM User u
      JOIN Student s ON u.refID = s.studentID
      WHERE u.userID = ?
    `, [req.user.userID]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false });
    }
    res.json({ success: true, data: rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'เซิร์ฟเวอร์ขัดข้อง' });
  }
});

router.get('/admin', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT userID, username, role, avatar, status, gender FROM User WHERE userID = ?',
      [req.user.userID]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false });
    }
    res.json({ success: true, data: rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'เซิร์ฟเวอร์ขัดข้อง' });
  }
});

router.get('/student/news', requireStudent, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT a.*, u.thai_first_name, u.thai_last_name, u.role, u.avatar, u.gender
      FROM Announcement a
      INNER JOIN User u ON a.createdBy = u.userID
      WHERE (a.targetRole = 'STUDENT' OR a.targetRole = 'ALL')
        AND (a.expireAt IS NULL OR a.expireAt > CURRENT_TIMESTAMP)
      ORDER BY a.isPinned DESC, a.createdAt DESC
    `);
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลประกาศข่าวสาร' });
  }
});

router.get('/student/classes', requireStudent, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT sc.classID, c.className
      FROM User u
      JOIN StudentClass sc ON u.refID = sc.studentID
      JOIN Classroom c ON sc.classID = c.classID
      WHERE u.userID = ?
    `, [req.user.userID]);
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'เซิร์ฟเวอร์ขัดข้อง' });
  }
});

module.exports = router;
