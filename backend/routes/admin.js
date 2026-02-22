const express = require('express');
const fs = require('fs');
const bcrypt = require('bcrypt');
const { parse } = require('csv-parse/sync');
const pool = require('../lib/db');
const dbRaw = require('../lib/db').raw;
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

router.post('/students/csv', uploadCsv.single('csv'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'กรุณาอัปโหลดไฟล์ค่าที่คั่นด้วยจุลภาค' });
    }

    const csv = fs.readFileSync(req.file.path, 'utf8');
    const records = parse(csv, { columns: true, skip_empty_lines: true, bom: true });
    const created = [];

    for (const row of records) {
      const { first_name, last_name, thai_first_name, thai_last_name, gender, dob, tel, address, adress, email } = row;
      const addr = address || adress;

      if (!first_name || !last_name) continue;

      const password = generatePassword();
      const hashedPassword = await bcrypt.hash(password, 10);

      const [studentResult] = await pool.query(
        'INSERT INTO Student (first_name, last_name, thai_first_name, thai_last_name, gender, dob, tel, address, email, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [first_name, last_name, thai_first_name || null, thai_last_name || null, gender || null, dob || null, tel || null, addr || null, (email || '').trim() || null, 'STUDYING']
      );

      const studentID = studentResult.insertId;
      const username = await createStudentUsername(pool);

      await pool.query(
        'INSERT INTO User (username, password_hash, role, refID, status, avatar, thai_first_name, thai_last_name, gender, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime(\'now\'))',
        [username, hashedPassword, 'STUDENT', studentID, 'ACTIVE', 'avatars/avatar-placeholder.jpg', thai_first_name || null, thai_last_name || null, gender || null]
      );

      created.push({ username, password });
    }

    res.json({ success: true, message: `สร้างบัญชีนักเรียนสำเร็จจำนวน ${created.length} บัญชี`, account: created });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/students', upload.single('avatar'), async (req, res) => {
  try {
    const { first_name, last_name, thai_first_name, thai_last_name, gender, dob, tel, adress, email } = req.body;

    if (!first_name || !last_name) {
      return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อ-นามสกุล (English) ให้ครบ' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'กรุณาอัพโหลดรูปโปรไฟล์' });
    }

    const password = generatePassword();
    const hashedPassword = await bcrypt.hash(password, 10);

    const [studentResult] = await pool.query(
      'INSERT INTO Student (first_name, last_name, thai_first_name, thai_last_name, gender, dob, tel, address, email, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [first_name, last_name, thai_first_name || null, thai_last_name || null, gender || null, dob || null, tel || null, adress || null, (email || '').trim() || null, 'STUDYING']
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

router.get('/classrooms', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.*,
        trim(coalesce(t.thai_first_name, '') || ' ' || coalesce(t.thai_last_name, '')) AS responsibleTeacherName
      FROM Classroom c
      LEFT JOIN Teacher t ON c.responsibleTeacherID = t.teacherID
      ORDER BY c.className
    `);
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message });
  }
});
router.get('/classrooms/:classID/students', async (req, res) => {
  try {
    const classID = parseInt(req.params.classID, 10);
    if (isNaN(classID)) return res.status(400).json({ success: false, message: 'Invalid classID' });
    const year = new Date().getFullYear() + 543;
    const term = 1;
    const [rows] = await pool.query(`
      SELECT s.studentID, s.first_name, s.last_name, s.thai_first_name, s.thai_last_name, u.username AS studentCode, s.gender
      FROM StudentClass sc
      JOIN Student s ON sc.studentID = s.studentID
      JOIN User u ON u.refID = s.studentID AND u.role = 'STUDENT'
      WHERE sc.classID = ? AND sc.year = ? AND sc.term = ?
      ORDER BY u.username
    `, [classID, year, term]);
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/classroom/create', express.json(), async (req, res) => {
  try {
    const { className, plan, responsibleTeacherID } = req.body;
    if (!className) return res.status(400).json({ success: false, message: 'กรุณาระบุชื่อห้อง' });
    const teacherId = responsibleTeacherID ? parseInt(responsibleTeacherID, 10) : null;
    const [result] = await pool.query(
      'INSERT INTO Classroom (className, plan, responsibleTeacherID) VALUES (?, ?, ?)',
      [className.trim(), plan || null, teacherId]
    );
    res.json({ success: true, message: 'สร้างห้องเรียนสำเร็จ', classID: result.insertId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message });
  }
});

router.put('/classrooms/remove-student', express.json(), async (req, res) => {
  try {
    const body = req.body || {};
    const studentID = Number(body.studentID ?? body.StudentID);
    const classID = Number(body.classID ?? body.ClassID);
    if (!Number.isInteger(studentID) || !Number.isInteger(classID) || studentID < 1 || classID < 1) {
      return res.status(400).json({
        success: false,
        message: 'studentID and classID required (positive integers)',
      });
    }
    const year = new Date().getFullYear() + 543;
    const term = 1;
    await pool.query(
      'DELETE FROM StudentClass WHERE studentID = ? AND classID = ? AND year = ? AND term = ?',
      [studentID, classID, year, term]
    );
    res.json({ success: true, message: 'เอานักเรียนออกจากห้องเรียนสำเร็จ' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message });
  }
});

router.put('/classrooms/:id', express.json(), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid classID' });
    const { className, plan, responsibleTeacherID } = req.body;
    if (!className) return res.status(400).json({ success: false, message: 'กรุณาระบุชื่อห้อง' });
    const teacherId = (responsibleTeacherID != null && responsibleTeacherID !== '') ? parseInt(responsibleTeacherID, 10) : null;
    await pool.query('UPDATE Classroom SET className = ?, plan = ?, responsibleTeacherID = ? WHERE classID = ?', [className.trim(), plan || null, teacherId, id]);
    res.json({ success: true, message: 'อัปเดตห้องเรียนสำเร็จ' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message });
  }
});

router.delete('/classrooms/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid classID' });
    await pool.query('DELETE FROM Classroom WHERE classID = ?', [id]);
    res.json({ success: true, message: 'ลบห้องเรียนสำเร็จ' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message });
  }
});

function parseStudentUsernames(body) {
  const { usernames } = body;
  if (!Array.isArray(usernames) || usernames.length === 0) return [];
  return usernames.map((u) => String(u).trim()).filter((u) => u.length > 0);
}

router.put('/classrooms/:classID/add-student', async (req, res) => {
  try {
    const classID = parseInt(req.params.classID, 10);
    const usernames = parseStudentUsernames(req.body);
    if (isNaN(classID) || usernames.length === 0) {
      return res.status(400).json({ success: false, message: 'classID and usernames required' });
    }
    const [userRows] = await pool.query(
      "SELECT username, refID as studentID FROM User WHERE role = 'STUDENT' AND username IN (" + usernames.map(() => '?').join(',') + ")",
      usernames
    );
    const usernameToStudentId = new Map(userRows.map((r) => [r.username, r.studentID]));
    const foundUsernames = userRows.map((r) => r.username);
    const notFound = usernames.filter((u) => !usernameToStudentId.has(u));
    const toAdd = foundUsernames.map((u) => usernameToStudentId.get(u));

    const year = new Date().getFullYear() + 543;
    const term = 1;
    for (const studentID of toAdd) {
      // ถ้านักเรียนอยู่ใน class นึงอยู่่แล้ว แล้วไปเพิ่มอีก class จะเป็นเหมือนการย้ายแทน (ลบจาก class เดิมไปเพิ่มใน class ใหม่)
      await pool.query(
        'DELETE FROM StudentClass WHERE studentID = ? AND year = ? AND term = ?',
        [studentID, year, term]
      );
      await pool.query(
        'INSERT INTO StudentClass (studentID, classID, year, term) VALUES (?, ?, ?, ?)',
        [studentID, classID, year, term]
      );
    }
    res.json({
      success: true,
      message: `เพิ่มนักเรียนเข้าห้องเรียนสำเร็จ (${toAdd.length} คน)`,
      addedCount: toAdd.length,
      notFound: notFound,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message });
  }
});

  router.post('/subjects/add-subject', requireAuth, requireAdmin, async (req, res) => {
    try {
      const { classID, classIDs, subjectID, subjectName, group_name, groupName, credit, teacherID, year, term, hours, isOpen, maxStudent, enrollStart, enrollEnd } = req.body;
  
      const classIdList = Array.isArray(classIDs) ? classIDs : (classID != null && classID !== '' ? [classID] : []);
      if (classIdList.length === 0 || (!subjectID && !subjectName) || year == null || year === '' || term == null || term === '') {
        return res.status(400).json({ success: false, message: 'ข้อมูลไม่ครบถ้วน (ชั้นเรียน, วิชา, ปีการศึกษา)' });
      }

      const yearInt = parseInt(year, 10);
      const termInt = parseInt(term, 10);
      if (isNaN(yearInt) || isNaN(termInt)) {
        return res.status(400).json({ success: false, message: 'รูปแบบข้อมูลไม่ถูกต้อง' });
      }

      let resolvedSubjectID = subjectID != null && subjectID !== '' ? parseInt(subjectID, 10) : null;
      if (!resolvedSubjectID && subjectName && String(subjectName).trim()) {
        const [rows] = await pool.query('SELECT subjectID FROM Subject WHERE subjectName = ?', [String(subjectName).trim()]);
        if (!rows || rows.length === 0) {
          const groupVal = (group_name || groupName) && String(group_name || groupName).trim() ? String(group_name || groupName).trim() : null;
          const creditVal = (credit != null && credit !== '') ? parseFloat(credit) : 1.0;
          const [insertResult] = await pool.query('INSERT INTO Subject (subjectName, group_name, credit) VALUES (?, ?, ?)', [String(subjectName).trim(), groupVal, creditVal]);
          resolvedSubjectID = insertResult.insertId;
        } else {
          resolvedSubjectID = rows[0].subjectID;
        }
      }
      if (!resolvedSubjectID || isNaN(resolvedSubjectID)) {
        return res.status(400).json({ success: false, message: 'ไม่พบวิชา' });
      }

      const teacherIdVal = teacherID ? parseInt(teacherID, 10) : null;
      let inserted = 0;
      for (const cid of classIdList) {
        const classIdInt = parseInt(cid, 10);
        if (isNaN(classIdInt)) continue;
        try {
          await pool.query(
            `INSERT OR IGNORE INTO ClassroomSubject (classID, subjectID, teacherID, year, term, hours, semester, academicYear, isOpen, maxStudent, enrollStart, enrollEnd)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              classIdInt,
              resolvedSubjectID,
              teacherIdVal,
              yearInt,
              termInt,
              hours ?? 0,
              termInt,
              yearInt,
              isOpen !== undefined ? (isOpen ? 1 : 0) : 1,
              maxStudent ?? null,
              enrollStart || null,
              enrollEnd || null,
            ]
          );
          inserted++;
        } catch (_) {}
      }
  
      res.json({ success: true, message: `เพิ่มรายวิชาสำเร็จ ${inserted} ห้อง`, addedCount: inserted });
    } catch (e) {
      console.error(e);
      res.status(500).json({ success: false, message: e.message });
    }
  });
  
  router.post('/subjects/close-subject', requireAdmin, requireAuth, async (req, res) => {
    try {
      const { classID, subjectID } = req.body;
      if (!classID || !subjectID) {
        return res.status(400).json({ success: false, message: 'classID และ subjectID จำเป็น' });
      }
      await pool.query(
        `UPDATE ClassroomSubject SET isOpen = 0 WHERE classID = ? AND subjectID = ?`,
        [classID, subjectID]
      );
      res.json({ success: true, message: 'ปิดรายวิชาสำเร็จ' });
    } catch (e) {
      console.error(e.message);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
  });

  router.delete('/subjects/classroom-subject', requireAdmin, requireAuth, async (req, res) => {
    try {
      const { classID, subjectID } = req.body;
      if (!classID || !subjectID) {
        return res.status(400).json({ success: false, message: 'classID และ subjectID จำเป็น' });
      }
      await pool.query(
        `DELETE FROM ClassroomSubject WHERE classID = ? AND subjectID = ?`,
        [classID, subjectID]
      );
      res.json({ success: true, message: 'ลบรายวิชาสำเร็จ' });
    } catch (e) {
      console.error(e);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
  });

  router.post('/subjects/reopen-subject', requireAdmin, requireAuth, async (req, res) => {
    try {
      const { classID, subjectID } = req.body;
      if (!classID || !subjectID) {
        return res.status(400).json({ success: false, message: 'classID และ subjectID จำเป็น' });
      }
      await pool.query(
        `UPDATE ClassroomSubject SET isOpen = 1 WHERE classID = ? AND subjectID = ?`,
        [classID, subjectID]
      );
      res.json({ success: true, message: 'เปิดรายวิชาสำเร็จ' });
    } catch (e) {
      console.error(e);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
  });
  
  router.get('/subjects/catalog', requireAdmin, requireAuth, async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT subjectID, subjectName FROM Subject ORDER BY subjectName');
      res.json({ success: true, data: rows });
    } catch (e) {
      console.error(e);
      res.status(500).json({ success: false, message: e.message });
    }
  });

  router.get('/subjects/all', requireAdmin, requireAuth, async (req, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT
          cs.classID,
          cs.subjectID,
          s.subjectName,
          s.group_name,
          s.credit,
          cs.year,
          cs.term,
          cs.isOpen,
          c.className,
          trim(coalesce(t.thai_first_name, '') || ' ' || coalesce(t.thai_last_name, '')) AS teacherName
        FROM ClassroomSubject cs
        JOIN Subject s ON cs.subjectID = s.subjectID
        JOIN Classroom c ON cs.classID = c.classID
        LEFT JOIN Teacher t ON cs.teacherID = t.teacherID
      `);
      res.json({ success: true, data: rows });
    } catch (e) {
      console.error(e);
      res.status(500).json({ success: false, message: e.message });
    }
  });
module.exports = router;
