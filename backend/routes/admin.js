const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { parse } = require('csv-parse/sync');
const pool = require('../lib/db');
const dbRaw = require('../lib/db').raw;
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { generatePassword } = require('../utils/password');
const { createStudentUsername } = require('../utils/username');
const { upload, uploadCsv } = require('../utils/upload');
const { handle, yt, bad, notFound, ok } = require('../lib/handler');

const router = express.Router();
router.use(requireAuth, requireAdmin);

// teacher username
const tn = (f, l) => (f && l ? `${String(f).trim().toLowerCase()}.${String(l).trim().toLowerCase()[0]}` : null);
// null coalescing
const n = (x) => x ?? null;
const uploadsDir = path.join(__dirname, '..', 'uploads');
const PLACEHOLDER_AVATAR = 'avatars/avatar-placeholder.jpg';

const deleteAvatarIfUploaded = (avatarPath) => {
  if (!avatarPath || String(avatarPath).trim() === '' || avatarPath === PLACEHOLDER_AVATAR) return;
  try {
    const fullPath = path.join(uploadsDir, avatarPath);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) fs.unlinkSync(fullPath);
  } catch (_) { /* ignore */ }
};

const isTeacherResigned = async (tid) => {
  if (!tid) return false;
  const [[r]] = await pool.query('SELECT status FROM Teacher WHERE teacherID = ?', [tid]);
  return r?.status === 'RESIGNED';
};

// เช็คว่าวันเกิดอยู่เกินวันที่ปัจจุบันไหม
const isFutureDob = (dob) => {
  if (!dob || !String(dob).trim()) return false;
  const parts = String(dob).trim().split(/[-/]/);
  let y = parseInt(parts[0], 10);
  if (isNaN(y)) return false;
  if (y > 2400) y -= 543;
  const date = new Date(y, (parseInt(parts[1], 10) || 1) - 1, parseInt(parts[2], 10) || 1);
  return date > new Date();
};

router.get('/get-teachers', handle(async (_, res) => { const [r] = await pool.query('SELECT * FROM Teacher'); ok(res, r); }));

router.post('/teachers', upload.single('avatar'), handle(async (req, res) => {
  const { first_name, last_name, thai_first_name, thai_last_name, gender, dob, tel, email, department } = req.body || {};
  if (!first_name || !last_name || !email) return bad(res, 'English first name, last name, and email required');
  if (!req.file) return bad(res, 'กรุณาอัพโหลดรูปโปรไฟล์');
  if (isFutureDob(dob)) return bad(res, 'วันเดือนปีเกิดไม่สามารถเป็นวันในอนาคตได้');
  const pw = generatePassword(), hash = await bcrypt.hash(pw, 10);
  const [{ insertId: tid }] = await pool.query(
    'INSERT INTO Teacher (first_name, last_name, thai_first_name, thai_last_name, gender, dob, tel, email, department, status) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [first_name, last_name, n(thai_first_name), n(thai_last_name), n(gender), n(dob), n(tel), email, n(department), 'ACTIVE']
  );
  const uname = tn(first_name, last_name);
  await pool.query(
    "INSERT INTO User (username, password_hash, role, refID, status, avatar, thai_first_name, thai_last_name, gender, createdAt) VALUES (?,?,'TEACHER',?,'ACTIVE',?,?,?,?,datetime('now'))",
    [uname, hash, tid, `avatars/${req.file.filename}`, n(thai_first_name), n(thai_last_name), n(gender)]
  );
  res.json({ success: true, message: `สร้างบัญชี (ครูผู้สอน) - ${uname}:${pw} สำเร็จ!`, password: pw });
}));

router.post('/teachers/csv', uploadCsv.single('csv'), handle(async (req, res) => {
  if (!req.file) return bad(res, 'กรุณาอัปโหลดไฟล์ CSV');
  const rows = parse(fs.readFileSync(req.file.path, 'utf8'), { columns: true, skip_empty_lines: true, bom: true });
  const created = [];
  for (const r of rows) {
    const { first_name, last_name, thai_first_name, thai_last_name, gender, dob, tel, email, department } = r;
    if (!first_name || !last_name || !email) continue;
    if (isFutureDob(dob)) continue; // ถ้าใน CSV วันเกิด > เวลาปัจจุบันจะข้ามไป
    const pw = generatePassword(), hash = await bcrypt.hash(pw, 10);
    const [{ insertId: tid }] = await pool.query(
      'INSERT INTO Teacher (first_name, last_name, thai_first_name, thai_last_name, gender, dob, tel, email, department, status) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [first_name, last_name, n(thai_first_name), n(thai_last_name), n(gender), n(dob), n(tel), email, n(department), 'ACTIVE']
    );
    const uname = tn(first_name, last_name);
    await pool.query(
      "INSERT INTO User (username, password_hash, role, refID, status, avatar, thai_first_name, thai_last_name, gender, createdAt) VALUES (?,?,'TEACHER',?,'ACTIVE','avatars/avatar-placeholder.jpg',?,?,?,datetime('now'))",
      [uname, hash, tid, n(thai_first_name), n(thai_last_name), n(gender)]
    );
    created.push({ username: uname, password: pw });
  }
  res.json({ success: true, message: `สร้างบัญชีครูผู้สอนสำเร็จ ${created.length} บัญชี`, account: created });
}));

router.delete('/teachers/:id', handle(async (req, res) => {
  const tid = parseInt(req.params.id, 10);
  if (isNaN(tid)) return bad(res, 'Invalid teacher ID');
  const [[u]] = await pool.query("SELECT avatar FROM User WHERE refID = ? AND role = 'TEACHER'", [tid]);
  if (u?.avatar) deleteAvatarIfUploaded(u.avatar);
  await pool.query('UPDATE Classroom SET responsibleTeacherID = NULL WHERE responsibleTeacherID = ?', [tid]);
  await pool.query('DELETE FROM ClassSchedule WHERE teacherID = ?', [tid]);
  await pool.query('DELETE FROM ClassroomSubject WHERE teacherID = ?', [tid]);
  await pool.query("DELETE FROM User WHERE refID = ? AND role = 'TEACHER'", [tid]);
  await pool.query('DELETE FROM Teacher WHERE teacherID = ?', [tid]);
  ok(res, null, 'ลบครูผู้สอนสำเร็จ');
}));

router.put('/teachers/:id', express.json(), handle(async (req, res) => {
  const tid = parseInt(req.params.id, 10);
  if (isNaN(tid)) return bad(res, 'Invalid teacher ID');
  const b = req.body || {};
  if (isFutureDob(b.dob)) return bad(res, 'วันเดือนปีเกิดไม่สามารถเป็นวันในอนาคตได้');
  await pool.query(
    'UPDATE Teacher SET first_name=?, last_name=?, thai_first_name=?, thai_last_name=?, gender=?, dob=?, tel=?, email=?, department=?, status=? WHERE teacherID=?',
    [n(b.first_name), n(b.last_name), n(b.thai_first_name), n(b.thai_last_name), n(b.gender), n(b.dob), n(b.tel), n(b.email), n(b.department), n(b.status), tid]
  );
  await pool.query(
    "UPDATE User SET username=COALESCE(?,username), thai_first_name=?, thai_last_name=?, gender=? WHERE refID=? AND role='TEACHER'",
    [tn(b.first_name, b.last_name), n(b.thai_first_name), n(b.thai_last_name), n(b.gender), tid]
  );
  ok(res, null, 'อัปเดตข้อมูลครูสำเร็จ');
}));

router.post('/students/csv', uploadCsv.single('csv'), handle(async (req, res) => {
  if (!req.file) return bad(res, 'กรุณาอัปโหลดไฟล์ CSV');
  const rows = parse(fs.readFileSync(req.file.path, 'utf8'), { columns: true, skip_empty_lines: true, bom: true });
  const created = [];
  for (const r of rows) {
    const { first_name, last_name, thai_first_name, thai_last_name, gender, dob, tel, address, adress, email } = r;
    if (!first_name || !last_name) continue;
    if (isFutureDob(dob)) continue; // ถ้า dob ไม่ถูกจะ skip]
    const pw = generatePassword(), hash = await bcrypt.hash(pw, 10);
    const [{ insertId: sid }] = await pool.query(
      'INSERT INTO Student (first_name, last_name, thai_first_name, thai_last_name, gender, dob, tel, address, email, status) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [first_name, last_name, n(thai_first_name), n(thai_last_name), n(gender), n(dob), n(tel), n(address || adress), n((email || '').trim()) || null, 'STUDYING']
    );
    const uname = await createStudentUsername(pool);
    await pool.query(
      "INSERT INTO User (username, password_hash, role, refID, status, avatar, thai_first_name, thai_last_name, gender, createdAt) VALUES (?,?,'STUDENT',?,'ACTIVE','avatars/avatar-placeholder.jpg',?,?,?,datetime('now'))",
      [uname, hash, sid, n(thai_first_name), n(thai_last_name), n(gender)]
    );
    created.push({ username: uname, password: pw });
  }
  res.json({ success: true, message: `สร้างบัญชีนักเรียนสำเร็จ ${created.length} บัญชี`, account: created });
}));

router.post('/students', upload.single('avatar'), handle(async (req, res) => {
  const b = req.body || {};
  if (!b.first_name || !b.last_name) return bad(res, 'กรุณากรอกชื่อ-นามสกุล (English) ให้ครบ');
  if (!req.file) return bad(res, 'กรุณาอัพโหลดรูปโปรไฟล์');
  if (isFutureDob(b.dob)) return bad(res, 'วันเดือนปีเกิดไม่สามารถเป็นวันในอนาคตได้');
  const pw = generatePassword(), hash = await bcrypt.hash(pw, 10);
  const [{ insertId: sid }] = await pool.query(
    'INSERT INTO Student (first_name, last_name, thai_first_name, thai_last_name, gender, dob, tel, address, email, status) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [b.first_name, b.last_name, n(b.thai_first_name), n(b.thai_last_name), n(b.gender), n(b.dob), n(b.tel), n(b.adress), n((b.email || '').trim()) || null, 'STUDYING']
  );
  const uname = await createStudentUsername(pool);
  await pool.query(
    "INSERT INTO User (username, password_hash, role, refID, status, avatar, thai_first_name, thai_last_name, gender, createdAt) VALUES (?,?,'STUDENT',?,'ACTIVE',?,?,?,?,datetime('now'))",
    [uname, hash, sid, `avatars/${req.file.filename}`, n(b.thai_first_name), n(b.thai_last_name), n(b.gender)]
  );
  res.json({ success: true, message: `สร้างบัญชี (นักเรียน) - ${uname}:${pw} สำเร็จ!`, password: pw });
}));

router.get('/classrooms', handle(async (_, res) => {
  const [r] = await pool.query(`SELECT c.*, trim(coalesce(t.thai_first_name,'')||' '||coalesce(t.thai_last_name,'')) AS responsibleTeacherName
    FROM Classroom c LEFT JOIN Teacher t ON c.responsibleTeacherID = t.teacherID ORDER BY c.className`);
  ok(res, r);
}));

router.get('/students', handle(async (_, res) => {
  const [r] = await pool.query(`SELECT s.studentID, s.first_name, s.last_name, s.thai_first_name, s.thai_last_name, u.username AS studentCode, s.gender, s.dob, s.tel, s.address, s.email, s.status
    FROM Student s JOIN User u ON u.refID = s.studentID AND u.role = 'STUDENT' ORDER BY u.username`);
  ok(res, r);
}));

router.delete('/students/:id', handle(async (req, res) => {
  const sid = parseInt(req.params.id, 10);
  if (isNaN(sid)) return bad(res, 'Invalid student ID');
  const [[u]] = await pool.query("SELECT avatar FROM User WHERE refID = ? AND role = 'STUDENT'", [sid]);
  if (u?.avatar) deleteAvatarIfUploaded(u.avatar);
  await pool.query('DELETE FROM Score WHERE studentID = ?', [sid]);
  await pool.query('DELETE FROM StudentClass WHERE studentID = ?', [sid]);
  await pool.query("DELETE FROM User WHERE refID = ? AND role = 'STUDENT'", [sid]);
  await pool.query('DELETE FROM Student WHERE studentID = ?', [sid]);
  ok(res, null, 'ลบนักเรียนสำเร็จ');
}));

router.put('/students/:id', express.json(), handle(async (req, res) => {
  const sid = parseInt(req.params.id, 10);
  if (isNaN(sid)) return bad(res, 'Invalid student ID');
  const b = req.body || {};
  if (isFutureDob(b.dob)) return bad(res, 'วันเดือนปีเกิดไม่สามารถเป็นวันในอนาคตได้');
  await pool.query('UPDATE Student SET first_name=?, last_name=?, thai_first_name=?, thai_last_name=?, gender=?, dob=?, tel=?, address=?, email=?, status=? WHERE studentID=?',
    [n(b.first_name), n(b.last_name), n(b.thai_first_name), n(b.thai_last_name), n(b.gender), n(b.dob), n(b.tel), n(b.address), n((b.email || '').trim()), n(b.status), sid]);
  await pool.query("UPDATE User SET thai_first_name=?, thai_last_name=?, gender=? WHERE refID=? AND role='STUDENT'", [n(b.thai_first_name), n(b.thai_last_name), n(b.gender), sid]);
  ok(res, null, 'อัปเดตข้อมูลนักเรียนสำเร็จ');
}));

router.get('/classrooms/:classID/students', handle(async (req, res) => {
  const cid = parseInt(req.params.classID, 10);
  if (isNaN(cid)) return bad(res, 'Invalid classID');
  const { year, term } = yt();
  const [r] = await pool.query(`SELECT s.studentID, s.first_name, s.last_name, s.thai_first_name, s.thai_last_name, u.username AS studentCode, s.gender
    FROM StudentClass sc JOIN Student s ON sc.studentID = s.studentID JOIN User u ON u.refID = s.studentID AND u.role = 'STUDENT'
    WHERE sc.classID = ? AND sc.year = ? AND sc.term = ? ORDER BY u.username`, [cid, year, term]);
  ok(res, r);
}));

router.post('/classroom/create', express.json(), handle(async (req, res) => {
  const { className, plan, responsibleTeacherID } = req.body || {};
  if (!className) return bad(res, 'กรุณาระบุชื่อห้อง');
  const tid = responsibleTeacherID ? parseInt(responsibleTeacherID, 10) : null;
  if (tid && await isTeacherResigned(tid)) return bad(res, 'ไม่สามารถกำหนดครูที่ลาออกแล้วเป็นครูประจำชั้นได้');
  const [{ insertId: classID }] = await pool.query('INSERT INTO Classroom (className, plan, responsibleTeacherID) VALUES (?,?,?)', [className.trim(), n(plan), tid]);
  res.json({ success: true, message: 'สร้างห้องเรียนสำเร็จ', classID });
}));

router.put('/classrooms/remove-student', express.json(), handle(async (req, res) => {
  const body = req.body || {};
  const sid = Number(body.studentID ?? body.StudentID), cid = Number(body.classID ?? body.ClassID);
  if (!Number.isInteger(sid) || !Number.isInteger(cid) || sid < 1 || cid < 1) return bad(res, 'studentID and classID required');
  const { year, term } = yt();
  await pool.query('DELETE FROM StudentClass WHERE studentID = ? AND classID = ? AND year = ? AND term = ?', [sid, cid, year, term]);
  ok(res, null, 'เอานักเรียนออกจากห้องเรียนสำเร็จ');
}));

router.put('/classrooms/:id', express.json(), handle(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return bad(res, 'Invalid classID');
  const { className, plan, responsibleTeacherID } = req.body || {};
  if (!className) return bad(res, 'กรุณาระบุชื่อห้อง');
  const tid = (responsibleTeacherID != null && responsibleTeacherID !== '') ? parseInt(responsibleTeacherID, 10) : null;
  if (tid && await isTeacherResigned(tid)) return bad(res, 'ไม่สามารถกำหนดครูที่ลาออกแล้วเป็นครูประจำชั้นได้');
  await pool.query('UPDATE Classroom SET className = ?, plan = ?, responsibleTeacherID = ? WHERE classID = ?', [className.trim(), n(plan), tid, id]);
  ok(res, null, 'อัปเดตห้องเรียนสำเร็จ');
}));

router.delete('/classrooms/:id', handle(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return bad(res, 'Invalid classID');
  await pool.query('DELETE FROM Classroom WHERE classID = ?', [id]);
  ok(res, null, 'ลบห้องเรียนสำเร็จ');
}));
// student parsing
const parseUsernames = (b) => (Array.isArray(b?.usernames) ? b.usernames.map((u) => String(u).trim()).filter(Boolean) : []);

router.put('/classrooms/:classID/add-student', handle(async (req, res) => {
  const cid = parseInt(req.params.classID, 10), usernames = parseUsernames(req.body);
  if (isNaN(cid) || !usernames.length) return bad(res, 'classID and usernames required');
  const [userRows] = await pool.query(
    `SELECT u.username, u.refID as studentID, s.status as studentStatus
     FROM User u
     JOIN Student s ON s.studentID = u.refID
     WHERE u.role = 'STUDENT' AND u.username IN (${usernames.map(() => '?').join(',')})`,
    usernames
  );
  const map = new Map(userRows.map((r) => [r.username, { studentID: r.studentID, status: r.studentStatus }]));
  const notFound = usernames.filter((u) => !map.has(u));
  const graduated = usernames.filter((u) => map.has(u) && map.get(u).status === 'GRADUATED');
  const toAdd = usernames.filter((u) => map.has(u) && map.get(u).status !== 'GRADUATED').map((u) => map.get(u).studentID);
  const { year, term } = yt();
  for (const sid of toAdd) {
    await pool.query('DELETE FROM StudentClass WHERE studentID = ? AND year = ? AND term = ?', [sid, year, term]);
    await pool.query('INSERT INTO StudentClass (studentID, classID, year, term) VALUES (?,?,?,?)', [sid, cid, year, term]);
  }
  let message = `เพิ่มนักเรียนเข้าห้องเรียนสำเร็จ (${toAdd.length} คน)`;
  if (graduated.length) message += `. ไม่สามารถเพิ่มผู้ที่จบการศึกษาแล้ว: ${graduated.join(', ')}`;
  res.json({ success: true, message, addedCount: toAdd.length, notFound, graduated });
}));

router.post('/subjects/add-subject', handle(async (req, res) => {
  const b = req.body || {};
  const classIds = Array.isArray(b.classIDs) ? b.classIDs : (b.classID != null && b.classID !== '' ? [b.classID] : []);
  if (!classIds.length || (!b.subjectID && !b.subjectName) || b.year == null || b.year === '' || b.term == null || b.term === '') return bad(res, 'ข้อมูลไม่ครบถ้วน');
  const y = parseInt(b.year, 10), t = parseInt(b.term, 10);
  if (isNaN(y) || isNaN(t)) return bad(res, 'รูปแบบข้อมูลไม่ถูกต้อง');
  let sid = (b.subjectID != null && b.subjectID !== '') ? parseInt(b.subjectID, 10) : null;
  if (!sid && (b.subjectName || '').trim()) {
    const [rows] = await pool.query('SELECT subjectID FROM Subject WHERE subjectName = ?', [b.subjectName.trim()]);
    if (rows?.length) sid = rows[0].subjectID;
    else {
      const [ir] = await pool.query('INSERT INTO Subject (subjectName, group_name, credit) VALUES (?,?,?)', [b.subjectName.trim(), n(b.group_name || b.groupName) || null, (b.credit != null && b.credit !== '') ? parseFloat(b.credit) : 1.0]);
      sid = ir.insertId;
    }
  }
  if (!sid || isNaN(sid)) return bad(res, 'ไม่พบวิชา');
  const tid = b.teacherID ? parseInt(b.teacherID, 10) : null;
  if (tid && await isTeacherResigned(tid)) return bad(res, 'ไม่สามารถกำหนดครูที่ลาออกแล้วเป็นผู้สอนได้');
  let inserted = 0;
  for (const cid of classIds.map((x) => parseInt(x, 10)).filter((x) => !isNaN(x))) {
    try {
      await pool.query(`INSERT OR IGNORE INTO ClassroomSubject (classID, subjectID, teacherID, year, term, hours, semester, academicYear, isOpen, maxStudent, enrollStart, enrollEnd) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [cid, sid, tid, y, t, b.hours ?? 0, t, y, b.isOpen !== undefined ? (b.isOpen ? 1 : 0) : 1, b.maxStudent ?? null, b.enrollStart || null, b.enrollEnd || null]);
      inserted++;
    } catch (_) { }
  }
  ok(res, null, `เพิ่มรายวิชาสำเร็จ ${inserted} ห้อง`);
}));

router.post('/subjects/close-subject', handle(async (req, res) => {
  const { classID, subjectID } = req.body || {};
  if (!classID || !subjectID) return bad(res, 'classID และ subjectID จำเป็น');
  await pool.query('UPDATE ClassroomSubject SET isOpen = 0 WHERE classID = ? AND subjectID = ?', [classID, subjectID]);
  ok(res, null, 'ปิดรายวิชาสำเร็จ');
}));

router.delete('/subjects/classroom-subject', handle(async (req, res) => {
  const { classID, subjectID } = req.body || {};
  if (!classID || !subjectID) return bad(res, 'classID และ subjectID จำเป็น');
  const cid = parseInt(classID, 10);
  const sid = parseInt(subjectID, 10);
  if (isNaN(cid) || isNaN(sid)) return bad(res, 'classID และ subjectID จำเป็น');
  await pool.query('DELETE FROM ClassSchedule WHERE classID = ? AND subjectID = ?', [cid, sid]);
  dbRaw.prepare('DELETE FROM Score WHERE classID = ? AND subjectID = ?').run(cid, sid);
  dbRaw.prepare('DELETE FROM ScoreComponent WHERE classID = ? AND subjectID = ?').run(cid, sid);
  await pool.query('DELETE FROM ClassroomSubject WHERE classID = ? AND subjectID = ?', [cid, sid]);
  ok(res, null, 'ลบรายวิชาสำเร็จ');
}));

router.post('/subjects/reopen-subject', handle(async (req, res) => {
  const { classID, subjectID } = req.body || {};
  if (!classID || !subjectID) return bad(res, 'classID และ subjectID จำเป็น');
  await pool.query('UPDATE ClassroomSubject SET isOpen = 1 WHERE classID = ? AND subjectID = ?', [classID, subjectID]);
  ok(res, null, 'เปิดรายวิชาสำเร็จ');
}));

router.get('/subjects/catalog', handle(async (_, res) => { const [r] = await pool.query('SELECT subjectID, subjectName FROM Subject ORDER BY subjectName'); ok(res, r); }));

router.get('/subjects/all', handle(async (_, res) => {
  const [r] = await pool.query(`SELECT cs.classID, cs.subjectID, s.subjectName, s.group_name, s.credit, cs.year, cs.term, cs.isOpen, c.className, trim(coalesce(t.thai_first_name,'')||' '||coalesce(t.thai_last_name,'')) AS teacherName
    FROM ClassroomSubject cs JOIN Subject s ON cs.subjectID = s.subjectID JOIN Classroom c ON cs.classID = c.classID LEFT JOIN Teacher t ON cs.teacherID = t.teacherID`);
  ok(res, r);
}));

router.get('/classrooms/:classID/subjects-for-schedule', handle(async (req, res) => {
  const cid = parseInt(req.params.classID, 10), y = parseInt(req.query.year, 10), t = parseInt(req.query.term, 10);
  if (isNaN(cid) || isNaN(y) || isNaN(t)) return bad(res, 'classID, year, term จำเป็น');
  const [r] = await pool.query(`SELECT cs.subjectID, s.subjectName, s.credit, cs.teacherID, trim(coalesce(t.thai_first_name,'')||' '||coalesce(t.thai_last_name,'')) AS teacherName
    FROM ClassroomSubject cs JOIN Subject s ON cs.subjectID = s.subjectID LEFT JOIN Teacher t ON cs.teacherID = t.teacherID WHERE cs.classID = ? AND cs.year = ? AND cs.term = ? AND cs.isOpen = 1`, [cid, y, t]);
  ok(res, r);
}));

router.get('/classrooms/:classID/schedule', handle(async (req, res) => {
  const cid = parseInt(req.params.classID, 10), y = parseInt(req.query.year, 10), t = parseInt(req.query.term, 10);
  if (isNaN(cid) || isNaN(y) || isNaN(t)) return bad(res, 'classID, year, term จำเป็น');
  const [r] = await pool.query('SELECT subjectID, teacherID, dayOfWeek, period FROM ClassSchedule WHERE classID = ? AND year = ? AND term = ?', [cid, y, t]);
  ok(res, r);
}));

router.put('/classrooms/:classID/schedule', express.json(), handle(async (req, res) => {
  const cid = parseInt(req.params.classID, 10), y = parseInt(req.body.year, 10), t = parseInt(req.body.term, 10);
  const slots = Array.isArray(req.body.slots) ? req.body.slots : [];
  if (isNaN(cid) || isNaN(y) || isNaN(t)) return bad(res, 'classID, year, term จำเป็น');
  const hoursBySubj = {};
  for (const s of slots) { const id = parseInt(s.subjectID, 10); if (!isNaN(id)) hoursBySubj[id] = (hoursBySubj[id] || 0) + 1; }
  const [subjRows] = await pool.query(`SELECT cs.subjectID, s.credit FROM ClassroomSubject cs JOIN Subject s ON cs.subjectID = s.subjectID WHERE cs.classID = ? AND cs.year = ? AND cs.term = ?`, [cid, y, t]);
  for (const row of subjRows) {
    const h = hoursBySubj[row.subjectID] || 0, cr = parseFloat(row.credit) || 0;
    if (h > cr * 2) {
      const [[n]] = await pool.query('SELECT subjectName FROM Subject WHERE subjectID = ?', [row.subjectID]);
      return bad(res, `รายวิชา "${n?.subjectName || row.subjectID}" ใช้ชั่วโมง (${h}) เกินหน่วยกิต (${cr})`);
    }
  }
  const teacherIds = [...new Set(slots.map((s) => s.teacherID != null ? parseInt(s.teacherID, 10) : null).filter((x) => x != null && !isNaN(x)))];
  for (const tid of teacherIds) {
    if (await isTeacherResigned(tid)) return bad(res, 'ไม่สามารถกำหนดครูที่ลาออกแล้วในตารางเรียนได้');
  }
  const key = (s) => `${s.teacherID ?? 'x'}-${parseInt(s.dayOfWeek, 10)}-${parseInt(s.period, 10)}`;
  const seen = new Set();
  for (const s of slots) {
    const tid = s.teacherID != null ? parseInt(s.teacherID, 10) : null;
    if (tid == null || isNaN(tid)) continue;
    const k = key(s);
    if (seen.has(k)) {
      const [[t]] = await pool.query('SELECT trim(coalesce(thai_first_name,\'\')||\' \'||coalesce(thai_last_name,\'\')) AS name FROM Teacher WHERE teacherID = ?', [tid]);
      return bad(res, `ครู${t?.name ? ' ' + t.name.trim() : ''} มีคาบซ้อนเวลา (วันที่ ${s.dayOfWeek} คาบที่ ${s.period}) ในห้องนี้`);
    }
    seen.add(k);
  }
  // กันตารางสอนครูคนเดียวกัน คนละวิชา คนละห้อง แต่เวลาเดียวกันลงเวลาสอนทับกัน
  for (const s of slots) {
    const tid = s.teacherID != null ? parseInt(s.teacherID, 10) : null;
    const dow = parseInt(s.dayOfWeek, 10);
    const period = parseInt(s.period, 10);
    if (tid == null || isNaN(tid) || isNaN(dow) || isNaN(period)) continue;
    const [existing] = await pool.query(
      `SELECT c.className FROM ClassSchedule cs JOIN Classroom c ON c.classID = cs.classID WHERE cs.teacherID = ? AND cs.year = ? AND cs.term = ? AND cs.dayOfWeek = ? AND cs.period = ? AND cs.classID != ?`,
      [tid, y, t, dow, period, cid]
    );
    if (existing?.length) {
      const [[tRow]] = await pool.query('SELECT trim(coalesce(thai_first_name,\'\')||\' \'||coalesce(thai_last_name,\'\')) AS name FROM Teacher WHERE teacherID = ?', [tid]);
      return bad(res, `ครู${tRow?.name ? ' ' + tRow.name.trim() : ''} มีคาบซ้อนกับห้อง ${existing[0].className} (วันที่ ${dow} คาบที่ ${period})`);
    }
  }
  dbRaw.exec('BEGIN TRANSACTION');
  try {
    dbRaw.prepare('DELETE FROM ClassSchedule WHERE classID = ? AND year = ? AND term = ?').run(cid, y, t);
    const ins = dbRaw.prepare('INSERT INTO ClassSchedule (classID, subjectID, teacherID, dayOfWeek, period, year, term) VALUES (?,?,?,?,?,?,?)');
    for (const s of slots) {
      const sid = parseInt(s.subjectID, 10), tid = s.teacherID != null ? parseInt(s.teacherID, 10) : null;
      const dow = parseInt(s.dayOfWeek, 10), period = parseInt(s.period, 10);
      if (!isNaN(sid) && !isNaN(dow) && !isNaN(period)) ins.run(cid, sid, tid, dow, period, y, t);
    }
    dbRaw.exec('COMMIT');
  } catch (e) { dbRaw.exec('ROLLBACK'); throw e; }
  ok(res, null, 'บันทึกตารางเรียนสำเร็จ');
}));
// announcements
const annBody = (b) => ({ exp: (b?.expireAt && String(b.expireAt).trim()) ? b.expireAt : null, pin: b?.isPinned ? 1 : 0, cat: b?.category ?? 'GENERAL', title: b?.title ?? '', content: b?.content ?? '', role: b?.targetRole ?? 'ALL' });

router.get('/announcements', handle(async (_, res) => {
  const [r] = await pool.query(`SELECT a.*, u.thai_first_name, u.thai_last_name, u.role, u.avatar FROM Announcement a LEFT JOIN User u ON a.createdBy = u.userID ORDER BY a.isPinned DESC, a.createdAt DESC`);
  ok(res, r);
}));

router.post('/announcement/add', handle(async (req, res) => {
  const { title, content, exp, pin, cat, role } = annBody(req.body);
  await pool.query('INSERT INTO Announcement (title, content, createdBy, targetRole, expireAt, category, isPinned) VALUES (?,?,?,?,?,?,?)',
    [title, content, req.user.userID, role, exp, cat, pin]);
  ok(res, null, 'สร้างประกาศสำเร็จ');
}));

router.put('/announcement/:id', handle(async (req, res) => {
  const [[a]] = await pool.query('SELECT createdBy FROM Announcement WHERE announceID = ?', [req.params.id]);
  if (!a) return notFound(res, 'ไม่พบประกาศ');
  if (a.createdBy !== req.user.userID) return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์แก้ไขประกาศนี้' });
  const { title, content, exp, pin, cat, role } = annBody(req.body);
  await pool.query('UPDATE Announcement SET title=?, content=?, targetRole=?, expireAt=?, category=?, isPinned=? WHERE announceID=?', [title, content, role, exp, cat, pin, req.params.id]);
  ok(res, null, 'แก้ไขประกาศสำเร็จ');
}));

router.delete('/announcement/:id', handle(async (req, res) => {
  const [[a]] = await pool.query('SELECT announceID FROM Announcement WHERE announceID = ?', [req.params.id]);
  if (!a) return notFound(res, 'ไม่พบประกาศ');
  await pool.query('DELETE FROM Announcement WHERE announceID = ?', [req.params.id]);
  ok(res, null, 'ลบประกาศสำเร็จ');
}));

router.get('/tickets', handle(async (_, res) => {
  const [r] = await pool.query(`SELECT t.*, u.thai_first_name, u.thai_last_name, u.username, u.avatar, u.gender FROM Ticket t LEFT JOIN User u ON t.userID = u.userID ORDER BY t.createdAt DESC`);
  ok(res, r);
}));

router.put('/tickets/:id', handle(async (req, res) => {
  const { status, comment } = req.body || {};
  if (!['OPEN', 'IN_PROGRESS', 'CLOSED'].includes(status)) return bad(res, 'สถานะไม่ถูกต้อง');
  if (status === 'CLOSED' && !(comment || '').trim()) return bad(res, 'กรุณาใส่ความเห็นเมื่อปิดคำร้อง');
  const [[t]] = await pool.query('SELECT ticketID FROM Ticket WHERE ticketID = ?', [req.params.id]);
  if (!t) return notFound(res, 'ไม่พบคำร้อง');
  await pool.query('UPDATE Ticket SET status = ?, closeComment = ? WHERE ticketID = ?', [status, status === 'CLOSED' ? String(comment).trim() : null, req.params.id]);
  ok(res, null, 'อัปเดตสถานะเรียบร้อยแล้ว');
}));

module.exports = router;
