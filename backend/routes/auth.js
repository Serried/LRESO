const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../lib/db');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'กรุณาใส่ชื่อบัญชีผู้ใช้และรหัสผ่าน' });
    }

    const [rows] = await pool.query(
      'SELECT userID, username, password_hash, role, refID, status, avatar, thai_first_name, thai_last_name, gender FROM User WHERE username = ?',
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }

    const user = rows[0];
    let first_name = null;
    let last_name = null;
    let thai_first_name = user.thai_first_name ?? null;
    let thai_last_name = user.thai_last_name ?? null;
    let gender = user.gender ?? null;

    if (user.refID) {
      const refTable = user.role === 'TEACHER' ? 'Teacher' : 'Student';
      const refIdCol = user.role === 'TEACHER' ? 'teacherID' : 'studentID';
      const [data] = await pool.query(
        `SELECT first_name, last_name, thai_first_name, thai_last_name, gender FROM ${refTable} WHERE ${refIdCol} = ?`,
        [user.refID]
      );
      if (data.length) {
        first_name = data[0].first_name;
        last_name = data[0].last_name;
        thai_first_name = data[0].thai_first_name ?? thai_first_name;
        thai_last_name = data[0].thai_last_name ?? thai_last_name;
        gender = data[0].gender ?? gender;
      }
    }

    if (user.status !== 'ACTIVE') {
      return res.status(401).json({ success: false, message: 'บัญชีนี้ถูกปิดใช้งาน' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash || '');
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'ข้อมูลไม่ถูกต้อง' });
    }

    const token = jwt.sign(
      { userID: user.userID, role: user.role, refID: user.refID },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.userID,
        username: user.username,
        role: user.role,
        refID: user.refID,
        avatar: user.avatar,
        first_name,
        last_name,
        thai_first_name,
        thai_last_name,
        gender
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'กรุณาตรวจสอบผลลัพธ์ที่ฝั่งเซิร์ฟเวอร์' });
  }
});

module.exports = router;
