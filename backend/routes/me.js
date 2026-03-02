const express = require('express');
const pool = require('../lib/db');
const dbRaw = require('../lib/db').raw;
const { requireAuth, requireStudent, requireTeacher, requireAdmin } = require('../middleware/auth');
const { handle, yt, bad, notFound, forbidden, ok } = require('../lib/handler');

const router = express.Router();
router.use(requireAuth);

const uid = (req) => req.user.userID;

router.get('/teacher', requireTeacher, handle(async (req, res) => {
  const [[r]] = await pool.query(`SELECT t.teacherID, t.first_name, t.last_name, t.thai_first_name, t.thai_last_name, t.gender, t.dob, t.tel, t.email, t.department, t.status, u.username, u.avatar
    FROM User u JOIN Teacher t ON u.refID = t.teacherID WHERE u.userID = ?`, [uid(req)]);
  if (!r) return notFound(res, 'ไม่พบครูผู้สอน');
  ok(res, r);
}));

router.get('/teacher/classrooms', requireTeacher, handle(async (req, res) => {
  const [r] = await pool.query(`SELECT c.classID, c.className, c.plan FROM User u JOIN Teacher t ON u.refID = t.teacherID
    JOIN Classroom c ON c.responsibleTeacherID = t.teacherID WHERE u.userID = ? ORDER BY c.className`, [uid(req)]);
  ok(res, r || []);
}));

router.get('/teacher/subjects', requireTeacher, handle(async (req, res) => {
  const [r] = await pool.query(`SELECT cs.classID, cs.subjectID, cs.year, cs.term, cs.isOpen, c.className, s.subjectName, s.credit, s.group_name
    FROM User u JOIN Teacher t ON u.refID = t.teacherID JOIN ClassroomSubject cs ON cs.teacherID = t.teacherID
    JOIN Classroom c ON cs.classID = c.classID JOIN Subject s ON cs.subjectID = s.subjectID
    WHERE u.userID = ? ORDER BY cs.year DESC, cs.term DESC, c.className, s.subjectName`, [uid(req)]);
  ok(res, r || []);
}));

router.get('/teacher/schedule', requireTeacher, handle(async (req, res) => {
  const { year, term } = yt();
  const [rows] = await pool.query(`SELECT cs.dayOfWeek, cs.period, c.className, s.subjectName FROM User u JOIN Teacher t ON u.refID = t.teacherID
    JOIN ClassSchedule cs ON cs.teacherID = t.teacherID JOIN Classroom c ON cs.classID = c.classID JOIN Subject s ON cs.subjectID = s.subjectID
    WHERE u.userID = ? AND cs.year = ? AND cs.term = ? ORDER BY cs.dayOfWeek, cs.period`, [uid(req), year, term]);
  ok(res, { year, term, slots: (rows || []).map((r) => ({ dayOfWeek: r.dayOfWeek, period: r.period, subjectName: r.subjectName, className: r.className })) });
}));

router.get('/teacher/news', requireTeacher, handle(async (req, res) => {
  const [r] = await pool.query(`SELECT a.*, u.thai_first_name, u.thai_last_name, u.role, u.avatar FROM Announcement a LEFT JOIN User u ON a.createdBy = u.userID
    WHERE (a.targetRole IN ('TEACHER','ALL') AND (a.expireAt IS NULL OR datetime(a.expireAt) > datetime('now', 'localtime'))) OR a.createdBy = ?
    ORDER BY a.isPinned DESC, a.createdAt DESC`, [uid(req)]);
  ok(res, r);
}));

const annBody = (b) => ({ exp: (b.expireAt && String(b.expireAt).trim()) ? b.expireAt : null, pin: b.isPinned ? 1 : 0, cat: b.category ?? 'GENERAL' });

router.post('/teacher/announcement', requireTeacher, handle(async (req, res) => {
  const { title, content } = req.body || {};
  if (!title || !content) return bad(res, 'กรอกข้อมูลให้ครบ');
  const { exp, pin, cat } = annBody(req.body);
  await pool.query('INSERT INTO Announcement (title, content, createdBy, targetRole, expireAt, category, isPinned) VALUES (?, ?, ?, \'STUDENT\', ?, ?, ?)',
    [title, content, uid(req), exp, cat, pin]);
  ok(res, null, 'สร้างประกาศสำเร็จ');
}));

router.put('/teacher/announcement/:id', requireTeacher, handle(async (req, res) => {
  const [[a]] = await pool.query('SELECT createdBy, targetRole FROM Announcement WHERE announceID = ?', [req.params.id]);
  if (!a) return notFound(res, 'ไม่พบประกาศ');
  if (a.createdBy !== uid(req)) return forbidden(res, 'ไม่มีสิทธิ์แก้ไขประกาศนี้');
  if (a.targetRole !== 'STUDENT') return forbidden(res, 'สามารถแก้ไขได้เฉพาะประกาศที่ส่งถึงนักเรียน');
  const { title, content } = req.body || {};
  const { exp, pin, cat } = annBody(req.body);
  await pool.query('UPDATE Announcement SET title = ?, content = ?, expireAt = ?, category = ?, isPinned = ? WHERE announceID = ?',
    [title || '', content || '', exp, cat, pin, req.params.id]);
  ok(res, null, 'แก้ไขประกาศสำเร็จ');
}));

router.delete('/teacher/announcement/:id', requireTeacher, handle(async (req, res) => {
  const [[a]] = await pool.query('SELECT createdBy, targetRole FROM Announcement WHERE announceID = ?', [req.params.id]);
  if (!a) return notFound(res, 'ไม่พบประกาศ');
  if (a.createdBy !== uid(req)) return forbidden(res, 'ไม่มีสิทธิ์ลบประกาศนี้');
  if (a.targetRole !== 'STUDENT') return forbidden(res, 'สามารถลบได้เฉพาะประกาศที่ส่งถึงนักเรียน');
  await pool.query('DELETE FROM Announcement WHERE announceID = ?', [req.params.id]);
  ok(res, null, 'ลบประกาศสำเร็จ');
}));

router.get('/student', requireStudent, handle(async (req, res) => {
  const [[r]] = await pool.query(`SELECT s.studentID, s.first_name, s.last_name, s.thai_first_name, s.thai_last_name, s.gender, s.dob, s.tel, s.address, s.email, s.status, u.username, u.avatar
    FROM User u JOIN Student s ON u.refID = s.studentID WHERE u.userID = ?`, [uid(req)]);
  if (!r) return notFound(res);
  ok(res, r);
}));

router.get('/admin', requireAdmin, handle(async (req, res) => {
  const [[r]] = await pool.query('SELECT userID, username, role, avatar, status, gender FROM User WHERE userID = ?', [uid(req)]);
  if (!r) return notFound(res);
  ok(res, r);
}));

router.get('/student/news', requireStudent, handle(async (_, res) => {
  const [r] = await pool.query(`SELECT a.*, u.thai_first_name, u.thai_last_name, u.role, u.avatar, u.gender FROM Announcement a INNER JOIN User u ON a.createdBy = u.userID
    WHERE (a.targetRole IN ('STUDENT','ALL')) AND (a.expireAt IS NULL OR datetime(a.expireAt) > datetime('now', 'localtime')) ORDER BY a.isPinned DESC, a.createdAt DESC`);
  ok(res, r);
}));

router.get('/tickets', handle(async (req, res) => {
  const [r] = await pool.query('SELECT * FROM Ticket WHERE userID = ? ORDER BY createdAt DESC', [uid(req)]);
  ok(res, r);
}));

router.put('/tickets/:id/close', handle(async (req, res) => {
  const [[t]] = await pool.query('SELECT ticketID, userID FROM Ticket WHERE ticketID = ?', [req.params.id]);
  if (!t) return notFound(res, 'ไม่พบคำร้อง');
  if (t.userID !== uid(req)) return forbidden(res, 'ไม่มีสิทธิ์ปิดคำร้องนี้');
  if (t.userID === null) return forbidden(res, 'ไม่สามารถปิดคำร้องที่ส่งโดยไม่เข้าสู่ระบบได้');
  await pool.query('UPDATE Ticket SET status = ? WHERE ticketID = ?', [null, req.params.id]);
  ok(res, null, 'ยกเลิกคำร้องเรียบร้อยแล้ว');
}));

router.get('/student/classes', requireStudent, handle(async (req, res) => {
  const [r] = await pool.query(`SELECT sc.classID, c.className, c.plan FROM User u JOIN StudentClass sc ON u.refID = sc.studentID
    JOIN Classroom c ON sc.classID = c.classID WHERE u.userID = ?`, [uid(req)]);
  ok(res, r);
}));

router.get('/student/subjects', requireStudent, handle(async (req, res) => {
  const { year, term } = yt();
  const [r] = await pool.query(`SELECT DISTINCT cs.subjectID, s.subjectName, sc.classID, c.className FROM User u JOIN StudentClass sc ON u.refID = sc.studentID
    JOIN ClassroomSubject cs ON sc.classID = cs.classID AND sc.year = cs.year AND sc.term = cs.term JOIN Subject s ON cs.subjectID = s.subjectID JOIN Classroom c ON sc.classID = c.classID
    WHERE u.userID = ? AND sc.year = ? AND sc.term = ? ORDER BY s.subjectName`, [uid(req), year, term]);
  ok(res, r || []);
}));

router.get('/student/scores', requireStudent, handle(async (req, res) => {
  const sid = parseInt(req.query.subjectID, 10);
  if (isNaN(sid)) return bad(res, 'subjectID จำเป็น');
  const { year, term } = yt();
  const [classRows] = await pool.query(`SELECT sc.classID, c.className, trim(coalesce(t.thai_first_name,'')||' '||coalesce(t.thai_last_name,'')) AS teacherName
    FROM User u JOIN StudentClass sc ON u.refID = sc.studentID JOIN Classroom c ON sc.classID = c.classID
    JOIN ClassroomSubject cs ON sc.classID = cs.classID AND sc.year = cs.year AND sc.term = cs.term AND cs.subjectID = ? LEFT JOIN Teacher t ON cs.teacherID = t.teacherID
    WHERE u.userID = ? AND sc.year = ? AND sc.term = ?`, [sid, uid(req), year, term]);
  if (!classRows?.length) return ok(res, { subjectName: null, className: null, teacherName: null, components: [], scores: {} });
  let { classID, className, teacherName } = classRows[0];
  if (!teacherName?.trim()) {
    const [[s]] = await pool.query(`SELECT trim(coalesce(t.thai_first_name,'')||' '||coalesce(t.thai_last_name,'')) AS tn FROM ClassSchedule cs LEFT JOIN Teacher t ON cs.teacherID = t.teacherID
      WHERE cs.classID = ? AND cs.subjectID = ? AND cs.year = ? AND cs.term = ? LIMIT 1`, [classID, sid, year, term]);
    teacherName = s?.tn || null;
  }
  const [[subj]] = await pool.query('SELECT subjectName FROM Subject WHERE subjectID = ?', [sid]);
  const [components] = await pool.query('SELECT id, name, weight FROM ScoreComponent WHERE classID = ? AND subjectID = ? AND year = ? AND term = ? ORDER BY sortOrder, id',
    [classID, sid, year, term]);
  const [scoresRows] = await pool.query('SELECT componentID, score FROM Score WHERE studentID = ? AND classID = ? AND subjectID = ? AND year = ? AND term = ?',
    [req.user.refID, classID, sid, year, term]);
  const scores = Object.fromEntries((scoresRows || []).map((r) => [r.componentID, r.score]));
  ok(res, { subjectName: subj?.subjectName, className, teacherName, year, term, components: components || [], scores });
}));

router.get('/student/score-stats', requireStudent, handle(async (req, res) => {
  const sid = parseInt(req.query.subjectID, 10);
  if (isNaN(sid)) return bad(res, 'subjectID จำเป็น');
  const { year, term } = yt();
  const [classRows] = await pool.query(`SELECT sc.classID FROM User u JOIN StudentClass sc ON u.refID = sc.studentID
    JOIN ClassroomSubject cs ON sc.classID = cs.classID AND sc.year = cs.year AND sc.term = cs.term AND cs.subjectID = ? WHERE u.userID = ? AND sc.year = ? AND sc.term = ?`,
    [sid, uid(req), year, term]);
  if (!classRows?.length) return ok(res, { totals: [] });
  const { classID } = classRows[0];
  const [components] = await pool.query('SELECT id, name, weight FROM ScoreComponent WHERE classID = ? AND subjectID = ? AND year = ? AND term = ? ORDER BY sortOrder, id',
    [classID, sid, year, term]);
  const [scoreRows] = await pool.query('SELECT studentID, componentID, score FROM Score WHERE classID = ? AND subjectID = ? AND year = ? AND term = ?',
    [classID, sid, year, term]);
  const byStudent = {};
  for (const r of scoreRows || []) { if (!byStudent[r.studentID]) byStudent[r.studentID] = {}; byStudent[r.studentID][r.componentID] = r.score; }
  const totals = [];
  for (const s of Object.values(byStudent)) {
    let sum = 0, w = 0;
    for (const c of components || []) {
      const v = s[c.id];
      if (v != null && !isNaN(parseFloat(v))) { sum += parseFloat(v) * (c.weight / 100); w += c.weight; }
    }
    if (w > 0) totals.push(sum);
  }
  ok(res, { totals });
}));

router.get('/student/schedule', requireStudent, handle(async (req, res) => {
  const { year, term } = yt();
  const [classRows] = await pool.query(`SELECT sc.classID, c.className, c.plan FROM User u JOIN StudentClass sc ON u.refID = sc.studentID
    JOIN Classroom c ON sc.classID = c.classID WHERE u.userID = ? AND sc.year = ? AND sc.term = ?`, [uid(req), year, term]);
  if (!classRows?.length) return ok(res, { className: null, plan: null, slots: [] });
  const { classID, className, plan } = classRows[0];
  const [slots] = await pool.query(`SELECT cs.dayOfWeek, cs.period, cs.subjectID, cs.teacherID, s.subjectName, trim(coalesce(t.thai_first_name,'')||' '||coalesce(t.thai_last_name,'')) AS teacherName
    FROM ClassSchedule cs JOIN Subject s ON cs.subjectID = s.subjectID LEFT JOIN Teacher t ON cs.teacherID = t.teacherID
    WHERE cs.classID = ? AND cs.year = ? AND cs.term = ? ORDER BY cs.dayOfWeek, cs.period`, [classID, year, term]);
  ok(res, { classID, className, plan, year, term, slots: slots || [] });
}));

const teacherSubjectAuth = async (req, cid, sid, y, t) => {
  const [a] = await pool.query(`SELECT 1 FROM User u JOIN Teacher t ON u.refID = t.teacherID JOIN ClassroomSubject cs ON cs.teacherID = t.teacherID
    WHERE u.userID = ? AND cs.classID = ? AND cs.subjectID = ? AND cs.year = ? AND cs.term = ?`, [uid(req), cid, sid, y, t]);
  return a?.length > 0;
};

router.get('/teacher/score-data', requireTeacher, handle(async (req, res) => {
  const cid = parseInt(req.query.classID, 10), sid = parseInt(req.query.subjectID, 10);
  const y = parseInt(req.query.year, 10) || yt().year, t = parseInt(req.query.term, 10) || 1;
  if (isNaN(cid) || isNaN(sid)) return bad(res, 'classID และ subjectID จำเป็น');
  if (!(await teacherSubjectAuth(req, cid, sid, y, t))) return forbidden(res, 'ไม่มีสิทธิ์จัดการคะแนนรายวิชานี้');
  const [[classRow]] = await pool.query('SELECT c.className, s.subjectName FROM Classroom c, Subject s WHERE c.classID = ? AND s.subjectID = ?', [cid, sid]);
  const [students] = await pool.query(`SELECT s.studentID, s.first_name, s.last_name, s.thai_first_name, s.thai_last_name, u.username AS studentCode
    FROM StudentClass sc JOIN Student s ON sc.studentID = s.studentID JOIN User u ON u.refID = s.studentID AND u.role = 'STUDENT' WHERE sc.classID = ? AND sc.year = ? AND sc.term = ? ORDER BY u.username`,
    [cid, y, t]);
  let [components] = await pool.query('SELECT id, name, weight, sortOrder FROM ScoreComponent WHERE classID = ? AND subjectID = ? AND year = ? AND term = ? ORDER BY sortOrder, id', [cid, sid, y, t]);
  if (!components?.length) {
    const insSc = dbRaw.prepare('INSERT INTO ScoreComponent (classID, subjectID, year, term, name, weight, sortOrder) VALUES (?,?,?,?,?,?,?)');
    insSc.run(cid, sid, y, t, 'กลางภาค', 50, 0);
    insSc.run(cid, sid, y, t, 'ปลายภาค', 50, 1);
    components = dbRaw.prepare('SELECT id, name, weight, sortOrder FROM ScoreComponent WHERE classID = ? AND subjectID = ? AND year = ? AND term = ? ORDER BY sortOrder, id')
      .all(cid, sid, y, t);
  }
  const [scores] = await pool.query('SELECT studentID, componentID, score FROM Score WHERE classID = ? AND subjectID = ? AND year = ? AND term = ?', [cid, sid, y, t]);
  const scoreMap = Object.fromEntries((scores || []).map((r) => [`${r.studentID}-${r.componentID}`, r.score]));
  ok(res, { className: classRow?.className, subjectName: classRow?.subjectName, year: y, term: t, students: students || [], components: components || [], scores: scoreMap });
}));

router.put('/teacher/score-components', requireTeacher, express.json(), handle(async (req, res) => {
  const { classID, subjectID, year, term, components } = req.body || {};
  const cid = parseInt(classID, 10), sid = parseInt(subjectID, 10), y = parseInt(year, 10) || yt().year, t = parseInt(term, 10) || 1;
  if (isNaN(cid) || isNaN(sid) || !Array.isArray(components)) return bad(res, 'ข้อมูลไม่ครบ');
  if (!(await teacherSubjectAuth(req, cid, sid, y, t))) return forbidden(res, 'ไม่มีสิทธิ์');
  const total = components.reduce((s, c) => s + (parseFloat(c.weight) || 0), 0);
  if (Math.abs(total - 100) > 0.01) return bad(res, 'น้ำหนักรวมต้องเท่ากับ 100%');
  dbRaw.prepare('DELETE FROM Score WHERE classID = ? AND subjectID = ? AND year = ? AND term = ?').run(cid, sid, y, t);
  dbRaw.prepare('DELETE FROM ScoreComponent WHERE classID = ? AND subjectID = ? AND year = ? AND term = ?').run(cid, sid, y, t);
  const ins = dbRaw.prepare('INSERT INTO ScoreComponent (classID, subjectID, year, term, name, weight, sortOrder) VALUES (?,?,?,?,?,?,?)');
  components.forEach((c, i) => ins.run(cid, sid, y, t, String(c.name || '').trim() || 'คะแนน', parseFloat(c.weight) || 0, i));
  ok(res, null, 'บันทึกส่วนประกอบคะแนนแล้ว');
}));

router.put('/teacher/scores', requireTeacher, express.json(), handle(async (req, res) => {
  const { classID, subjectID, year, term, scores } = req.body || {};
  const cid = parseInt(classID, 10), sid = parseInt(subjectID, 10), y = parseInt(year, 10) || yt().year, t = parseInt(term, 10) || 1;
  if (isNaN(cid) || isNaN(sid) || typeof scores !== 'object') return bad(res, 'ข้อมูลไม่ครบ');
  if (!(await teacherSubjectAuth(req, cid, sid, y, t))) return forbidden(res, 'ไม่มีสิทธิ์');
  const upsert = dbRaw.prepare('INSERT OR REPLACE INTO Score (studentID, classID, subjectID, year, term, componentID, score) VALUES (?,?,?,?,?,?,?)');
  for (const key of Object.keys(scores)) {
    const m = key.match(/^(\d+)-(\d+)$/);
    if (m) {
      const std = parseInt(m[1], 10), comp = parseInt(m[2], 10), val = scores[key];
      const num = (val === '' || val == null) ? null : parseFloat(val);
      if (!isNaN(std) && !isNaN(comp)) upsert.run(std, cid, sid, y, t, comp, num);
    }
  }
  ok(res, null, 'บันทึกคะแนนแล้ว');
}));

module.exports = router;
