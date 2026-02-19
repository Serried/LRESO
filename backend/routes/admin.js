const express = require('express');
const fs = require('fs');
const bcrypt = require('bcrypt');
const { parse } = require('csv-parse/sync');
const pool = require('../lib/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { generatePassword } = require('../utils/password');
const { createStudentUsername } = require('../utils/username');
const { upload, uploadCsv } = require('../utils/upload');

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get('/get-teachers', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Teacher');
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/teachers', upload.single('avatar'), async (req, res) => {
  try {
    const { first_name, last_name, thai_first_name, thai_last_name, gender, dob, tel, email, department } = req.body;

    if (!first_name || !last_name || !email) {
      return res.status(400).json({ success: false, message: 'English first name, last name, and email are required' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'กรุณาอัพโหลดรูปโปรไฟล์' });
    }

    const password = generatePassword();
    const hashedPassword = await bcrypt.hash(password, 10);

    const [teacherResult] = await pool.query(
      'INSERT INTO Teacher (first_name, last_name, thai_first_name, thai_last_name, gender, dob, tel, email, department, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [first_name, last_name, thai_first_name || null, thai_last_name || null, gender || null, dob || null, tel || null, email, department || null, 'ACTIVE']
    );

    const teacherID = teacherResult.insertId;
    const first = first_name.trim().toLowerCase();
    const lastInitial = last_name.trim().toLowerCase().substring(0, 1);
    const username = `${first}.${lastInitial}`;
    const avatarPath = `avatars/${req.file.filename}`;

    await pool.query(
      'INSERT INTO User (username, password_hash, role, refID, status, avatar, thai_first_name, thai_last_name, gender, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime(\'now\'))',
      [username, hashedPassword, 'TEACHER', teacherID, 'ACTIVE', avatarPath, thai_first_name || null, thai_last_name || null, gender || null]
    );

    res.json({ success: true, message: `สร้างบัญชี (ครูผู้สอน) - ${username}:${password} สำเร็จ!`, password });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/teachers/csv', uploadCsv.single('csv'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'กรุณาอัปโหลดไฟล์ค่าที่คั่นด้วยจุลภาค' });
    }

    const csv = fs.readFileSync(req.file.path, 'utf8');
    const records = parse(csv, { columns: true, skip_empty_lines: true, bom: true });
    const created = [];

    for (const row of records) {
      const { first_name, last_name, thai_first_name, thai_last_name, gender, dob, tel, email, department } = row;

      if (!first_name || !last_name || !email) continue;

      const password = generatePassword();
      const hashedPassword = await bcrypt.hash(password, 10);

      const [teacherResult] = await pool.query(
        'INSERT INTO Teacher (first_name, last_name, thai_first_name, thai_last_name, gender, dob, tel, email, department, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [first_name, last_name, thai_first_name || null, thai_last_name || null, gender || null, dob || null, tel || null, email, department || null, 'ACTIVE']
      );

      const teacherID = teacherResult.insertId;
      const username = `${String(first_name).trim().toLowerCase()}.${String(last_name).trim().toLowerCase()[0]}`;

      await pool.query(
        'INSERT INTO User (username, password_hash, role, refID, status, avatar, thai_first_name, thai_last_name, gender, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime(\'now\'))',
        [username, hashedPassword, 'TEACHER', teacherID, 'ACTIVE', 'avatars/avatar-placeholder.jpg', thai_first_name || null, thai_last_name || null, gender || null]
      );

      created.push({ username, password });
    }

    res.json({ success: true, message: `สร้างบัญชีครูผู้สอนสำเร็จจำนวน ${created.length} บัญชี`, account: created });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message });
  }
});

router.put('/teachers/:id', express.json(), async (req, res) => {
  try {
    const teacherID = parseInt(req.params.id, 10);
    if (isNaN(teacherID)) {
      return res.status(400).json({ success: false, message: 'Invalid teacher ID' });
    }

    const { first_name, last_name, thai_first_name, thai_last_name, gender, dob, tel, email, department, status } = req.body;

    await pool.query(
      `UPDATE Teacher SET first_name = ?, last_name = ?, thai_first_name = ?, thai_last_name = ?,
        gender = ?, dob = ?, tel = ?, email = ?, department = ?, status = ?
       WHERE teacherID = ?`,
      [first_name ?? null, last_name ?? null, thai_first_name ?? null, thai_last_name ?? null, gender ?? null, dob ?? null, tel ?? null, email ?? null, department ?? null, status ?? null, teacherID]
    );

    const first = (first_name && typeof first_name === 'string') ? first_name.trim().toLowerCase() : '';
    const lastInitial = (last_name && typeof last_name === 'string') ? last_name.trim().toLowerCase().substring(0, 1) : '';
    const newUsername = (first && lastInitial) ? `${first}.${lastInitial}` : null;

    await pool.query(
      "UPDATE User SET username = COALESCE(?, username), thai_first_name = ?, thai_last_name = ?, gender = ? WHERE refID = ? AND role = 'TEACHER'",
      [newUsername || null, thai_first_name ?? null, thai_last_name ?? null, gender ?? null, teacherID]
    );

    res.json({ success: true, message: 'อัปเดตข้อมูลครูสำเร็จ' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/students', upload.single('avatar'), async (req, res) => {
  try {
    const { first_name, last_name, thai_first_name, thai_last_name, gender, dob, tel, adress } = req.body;

    if (!first_name || !last_name) {
      return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อ-นามสกุล (English) ให้ครบ' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'กรุณาอัพโหลดรูปโปรไฟล์' });
    }

    const password = generatePassword();
    const hashedPassword = await bcrypt.hash(password, 10);

    const [studentResult] = await pool.query(
      'INSERT INTO Student (first_name, last_name, thai_first_name, thai_last_name, gender, dob, tel, address, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [first_name, last_name, thai_first_name || null, thai_last_name || null, gender || null, dob || null, tel || null, adress || null, 'STUDYING']
    );

    const studentID = studentResult.insertId;
    const username = await createStudentUsername(pool);
    const avatarPath = `avatars/${req.file.filename}`;

    await pool.query(
      'INSERT INTO User (username, password_hash, role, refID, status, avatar, thai_first_name, thai_last_name, gender, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime(\'now\'))',
      [username, hashedPassword, 'STUDENT', studentID, 'ACTIVE', avatarPath, thai_first_name || null, thai_last_name || null, gender || null]
    );

    res.json({ success: true, message: `สร้างบัญชี (นักเรียน) - ${username}:${password} สำเร็จ!`, password });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
