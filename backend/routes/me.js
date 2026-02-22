const express = require('express');
const pool = require('../lib/db');
const dbRaw = require('../lib/db').raw;
const { requireAuth, requireStudent, requireTeacher, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/teacher', requireTeacher, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT t.teacherID, t.first_name, t.last_name, t.thai_first_name, t.thai_last_name,
        t.gender, t.dob, t.tel, t.email, t.department, t.status, u.username, u.avatar
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

router.get('/teacher/classrooms', requireTeacher, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.classID, c.className, c.plan
      FROM User u
      JOIN Teacher t ON u.refID = t.teacherID
      JOIN Classroom c ON c.responsibleTeacherID = t.teacherID
      WHERE u.userID = ?
      ORDER BY c.className
    `, [req.user.userID]);
    res.json({ success: true, data: rows || [] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
});

router.get('/teacher/subjects', requireTeacher, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT cs.classID, cs.subjectID, cs.year, cs.term, cs.isOpen,
        c.className, s.subjectName, s.credit, s.group_name
      FROM User u
      JOIN Teacher t ON u.refID = t.teacherID
      JOIN ClassroomSubject cs ON cs.teacherID = t.teacherID
      JOIN Classroom c ON cs.classID = c.classID
      JOIN Subject s ON cs.subjectID = s.subjectID
      WHERE u.userID = ?
      ORDER BY cs.year DESC, cs.term DESC, c.className, s.subjectName
    `, [req.user.userID]);
    res.json({ success: true, data: rows || [] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
});

router.get('/teacher/schedule', requireTeacher, async (req, res) => {
  try {
    const year = new Date().getFullYear() + 543;
    const term = 1;
    const [rows] = await pool.query(`
      SELECT cs.dayOfWeek, cs.period, c.className, s.subjectName
      FROM User u
      JOIN Teacher t ON u.refID = t.teacherID
      JOIN ClassSchedule cs ON cs.teacherID = t.teacherID
      JOIN Classroom c ON cs.classID = c.classID
      JOIN Subject s ON cs.subjectID = s.subjectID
      WHERE u.userID = ? AND cs.year = ? AND cs.term = ?
      ORDER BY cs.dayOfWeek, cs.period
    `, [req.user.userID, year, term]);

    const slots = (rows || []).map((r) => ({
      dayOfWeek: r.dayOfWeek,
      period: r.period,
      subjectName: r.subjectName,
      className: r.className,
    }));
    res.json({ success: true, data: { year, term, slots } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
});

router.get('/teacher/news', requireTeacher, async (req, res) => {
  try {
    const userID = req.user.userID;
    const [rows] = await pool.query(`
      SELECT a.*, u.thai_first_name, u.thai_last_name, u.role, u.avatar
      FROM Announcement a
      LEFT JOIN User u ON a.createdBy = u.userID
      WHERE (
        (a.targetRole IN ('TEACHER', 'ALL') AND (a.expireAt IS NULL OR a.expireAt > CURRENT_TIMESTAMP))
        OR a.createdBy = ?
      )
      ORDER BY a.isPinned DESC, a.createdAt DESC
    `, [userID]);
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
});

router.post('/teacher/announcement', requireTeacher, async (req, res) => {
  try {
    const { title, content, expireAt, category, isPinned } = req.body;
    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'กรอกข้อมูลให้ครบ' });
    }
    const expireAtVal = (expireAt && String(expireAt).trim()) ? expireAt : null;
    const isPinnedVal = isPinned ? 1 : 0;
    const categoryVal = category ?? 'GENERAL';
    await pool.query(
      `INSERT INTO Announcement (title, content, createdBy, targetRole, expireAt, category, isPinned)
       VALUES (?, ?, ?, 'STUDENT', ?, ?, ?)`,
      [title, content, req.user.userID, expireAtVal, categoryVal, isPinnedVal]
    );
    res.json({ success: true, message: 'สร้างประกาศสำเร็จ' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message });
  }
});

router.put('/teacher/announcement/:id', requireTeacher, async (req, res) => {
  try {
    const id = req.params.id;
    const [rows] = await pool.query('SELECT createdBy, targetRole FROM Announcement WHERE announceID = ? LIMIT 1', [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบประกาศ' });
    }
    if (rows[0].createdBy !== req.user.userID) {
      return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์แก้ไขประกาศนี้' });
    }
    if (rows[0].targetRole !== 'STUDENT') {
      return res.status(403).json({ success: false, message: 'สามารถแก้ไขได้เฉพาะประกาศที่ส่งถึงนักเรียน' });
    }
    const { title, content, expireAt, category, isPinned } = req.body;
    const expireAtVal = (expireAt && String(expireAt).trim()) ? expireAt : null;
    const isPinnedVal = isPinned ? 1 : 0;
    const categoryVal = category ?? 'GENERAL';
    await pool.query(
      `UPDATE Announcement SET title = ?, content = ?, expireAt = ?, category = ?, isPinned = ? WHERE announceID = ?`,
      [title || '', content || '', expireAtVal, categoryVal, isPinnedVal, id]
    );
    res.json({ success: true, message: 'แก้ไขประกาศสำเร็จ' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message });
  }
});

router.delete('/teacher/announcement/:id', requireTeacher, async (req, res) => {
  try {
    const id = req.params.id;
    const [rows] = await pool.query('SELECT createdBy, targetRole FROM Announcement WHERE announceID = ? LIMIT 1', [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบประกาศ' });
    }
    if (rows[0].createdBy !== req.user.userID) {
      return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์ลบประกาศนี้' });
    }
    if (rows[0].targetRole !== 'STUDENT') {
      return res.status(403).json({ success: false, message: 'สามารถลบได้เฉพาะประกาศที่ส่งถึงนักเรียน' });
    }
    await pool.query('DELETE FROM Announcement WHERE announceID = ?', [id]);
    res.json({ success: true, message: 'ลบประกาศสำเร็จ' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/student', requireStudent, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT s.studentID, s.first_name, s.last_name, s.thai_first_name, s.thai_last_name,
        s.gender, s.dob, s.tel, s.address, s.email, s.status,
        u.username, u.avatar
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

router.get('/tickets', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM Ticket WHERE userID = ? ORDER BY createdAt DESC',
      [req.user.userID]
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
});

router.put('/tickets/:id/close', async (req, res) => {
  try {
    const id = req.params.id;
    const [rows] = await pool.query(
      'SELECT ticketID, userID FROM Ticket WHERE ticketID = ? LIMIT 1',
      [id]
    );
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบคำร้อง' });
    }
    if (rows[0].userID !== req.user.userID) {
      return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์ปิดคำร้องนี้' });
    }
    if (rows[0].userID === null) {
      return res.status(403).json({ success: false, message: 'ไม่สามารถปิดคำร้องที่ส่งโดยไม่เข้าสู่ระบบได้' });
    }
    await pool.query('UPDATE Ticket SET status = ? WHERE ticketID = ?', [null, id]);
    res.json({ success: true, message: 'ยกเลิกคำร้องเรียบร้อยแล้ว' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
});

router.get('/student/classes', requireStudent, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT sc.classID, c.className, c.plan
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

router.get('/student/subjects', requireStudent, async (req, res) => {
  try {
    const year = new Date().getFullYear() + 543;
    const term = 1;
    const [rows] = await pool.query(`
      SELECT DISTINCT cs.subjectID, s.subjectName, sc.classID, c.className
      FROM User u
      JOIN StudentClass sc ON u.refID = sc.studentID
      JOIN ClassroomSubject cs ON sc.classID = cs.classID AND sc.year = cs.year AND sc.term = cs.term
      JOIN Subject s ON cs.subjectID = s.subjectID
      JOIN Classroom c ON sc.classID = c.classID
      WHERE u.userID = ? AND sc.year = ? AND sc.term = ?
      ORDER BY s.subjectName
    `, [req.user.userID, year, term]);
    res.json({ success: true, data: rows || [] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
});

router.get('/student/scores', requireStudent, async (req, res) => {
  try {
    const subjectID = parseInt(req.query.subjectID, 10);
    const year = new Date().getFullYear() + 543;
    const term = 1;
    if (isNaN(subjectID)) {
      return res.status(400).json({ success: false, message: 'subjectID จำเป็น' });
    }
    const [classRows] = await pool.query(`
      SELECT sc.classID, c.className,
        trim(coalesce(t.thai_first_name, '') || ' ' || coalesce(t.thai_last_name, '')) AS teacherName
      FROM User u
      JOIN StudentClass sc ON u.refID = sc.studentID
      JOIN Classroom c ON sc.classID = c.classID
      JOIN ClassroomSubject cs ON sc.classID = cs.classID AND sc.year = cs.year AND sc.term = cs.term AND cs.subjectID = ?
      LEFT JOIN Teacher t ON cs.teacherID = t.teacherID
      WHERE u.userID = ? AND sc.year = ? AND sc.term = ?
    `, [subjectID, req.user.userID, year, term]);
    if (!classRows || classRows.length === 0) {
      return res.json({ success: true, data: { subjectName: null, className: null, teacherName: null, components: [], scores: {} } });
    }
    let { classID, className, teacherName } = classRows[0];
    if (!teacherName || !String(teacherName).trim()) {
      const [scheduleRows] = await pool.query(`
        SELECT trim(coalesce(t.thai_first_name, '') || ' ' || coalesce(t.thai_last_name, '')) AS tn
        FROM ClassSchedule cs
        LEFT JOIN Teacher t ON cs.teacherID = t.teacherID
        WHERE cs.classID = ? AND cs.subjectID = ? AND cs.year = ? AND cs.term = ?
        LIMIT 1
      `, [classID, subjectID, year, term]);
      teacherName = scheduleRows?.[0]?.tn || null;
    }
    const [[subjectRow]] = await pool.query('SELECT subjectName FROM Subject WHERE subjectID = ?', [subjectID]);
    const [components] = await pool.query(
      'SELECT id, name, weight FROM ScoreComponent WHERE classID = ? AND subjectID = ? AND year = ? AND term = ? ORDER BY sortOrder, id',
      [classID, subjectID, year, term]
    );
    const [scoreRows] = await pool.query(
      'SELECT componentID, score FROM Score WHERE studentID = ? AND classID = ? AND subjectID = ? AND year = ? AND term = ?',
      [req.user.refID, classID, subjectID, year, term]
    );
    const scores = {};
    for (const r of scoreRows || []) {
      scores[r.componentID] = r.score;
    }
    res.json({
      success: true,
      data: {
        subjectName: subjectRow?.subjectName,
        className,
        teacherName: teacherName || null,
        year,
        term,
        components: components || [],
        scores,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/student/score-stats', requireStudent, async (req, res) => {
  try {
    const subjectID = parseInt(req.query.subjectID, 10);
    const year = new Date().getFullYear() + 543;
    const term = 1;
    if (isNaN(subjectID)) {
      return res.status(400).json({ success: false, message: 'subjectID จำเป็น' });
    }
    const [classRows] = await pool.query(`
      SELECT sc.classID
      FROM User u
      JOIN StudentClass sc ON u.refID = sc.studentID
      JOIN ClassroomSubject cs ON sc.classID = cs.classID AND sc.year = cs.year AND sc.term = cs.term AND cs.subjectID = ?
      WHERE u.userID = ? AND sc.year = ? AND sc.term = ?
    `, [subjectID, req.user.userID, year, term]);
    if (!classRows || classRows.length === 0) {
      return res.json({ success: true, data: { totals: [] } });
    }
    const { classID } = classRows[0];
    const [components] = await pool.query(
      'SELECT id, name, weight FROM ScoreComponent WHERE classID = ? AND subjectID = ? AND year = ? AND term = ? ORDER BY sortOrder, id',
      [classID, subjectID, year, term]
    );
    const [scoreRows] = await pool.query(
      'SELECT studentID, componentID, score FROM Score WHERE classID = ? AND subjectID = ? AND year = ? AND term = ?',
      [classID, subjectID, year, term]
    );
    const scoresByStudent = {};
    for (const r of scoreRows || []) {
      if (!scoresByStudent[r.studentID]) scoresByStudent[r.studentID] = {};
      scoresByStudent[r.studentID][r.componentID] = r.score;
    }
    const totals = [];
    const weightSum = (components || []).reduce((s, c) => s + c.weight, 0);
    for (const studentID of Object.keys(scoresByStudent)) {
      const scores = scoresByStudent[studentID];
      let weightedSum = 0;
      let totalWeight = 0;
      for (const c of components || []) {
        const val = scores[c.id];
        if (val != null && !isNaN(parseFloat(val))) {
          weightedSum += parseFloat(val) * (c.weight / 100);
          totalWeight += c.weight;
        }
      }
      if (totalWeight > 0) {
        totals.push(weightedSum);
      }
    }
    res.json({ success: true, data: { totals } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/student/schedule', requireStudent, async (req, res) => {
  try {
    const year = new Date().getFullYear() + 543;
    const term = 1;
    const [classRows] = await pool.query(`
      SELECT sc.classID, c.className, c.plan
      FROM User u
      JOIN StudentClass sc ON u.refID = sc.studentID
      JOIN Classroom c ON sc.classID = c.classID
      WHERE u.userID = ? AND sc.year = ? AND sc.term = ?
    `, [req.user.userID, year, term]);

    if (!classRows || classRows.length === 0) {
      return res.json({ success: true, data: { className: null, plan: null, slots: [] } });
    }

    const { classID, className, plan } = classRows[0];
    const [slots] = await pool.query(`
      SELECT cs.dayOfWeek, cs.period, cs.subjectID, cs.teacherID,
        s.subjectName,
        trim(coalesce(t.thai_first_name, '') || ' ' || coalesce(t.thai_last_name, '')) AS teacherName
      FROM ClassSchedule cs
      JOIN Subject s ON cs.subjectID = s.subjectID
      LEFT JOIN Teacher t ON cs.teacherID = t.teacherID
      WHERE cs.classID = ? AND cs.year = ? AND cs.term = ?
      ORDER BY cs.dayOfWeek, cs.period
    `, [classID, year, term]);

    res.json({
      success: true,
      data: { classID, className, plan, year, term, slots: slots || [] },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'เซิร์ฟเวอร์ขัดข้อง' });
  }
});

router.get('/teacher/score-data', requireTeacher, async (req, res) => {
  try {
    const classID = parseInt(req.query.classID, 10);
    const subjectID = parseInt(req.query.subjectID, 10);
    const year = parseInt(req.query.year, 10) || new Date().getFullYear() + 543;
    const term = parseInt(req.query.term, 10) || 1;
    if (isNaN(classID) || isNaN(subjectID)) {
      return res.status(400).json({ success: false, message: 'classID และ subjectID จำเป็น' });
    }
    const [auth] = await pool.query(
      `SELECT 1 FROM User u JOIN Teacher t ON u.refID = t.teacherID
       JOIN ClassroomSubject cs ON cs.teacherID = t.teacherID
       WHERE u.userID = ? AND cs.classID = ? AND cs.subjectID = ? AND cs.year = ? AND cs.term = ?`,
      [req.user.userID, classID, subjectID, year, term]
    );
    if (!auth || auth.length === 0) {
      return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์จัดการคะแนนรายวิชานี้' });
    }

    const [[classRow]] = await pool.query(
      'SELECT c.className, s.subjectName FROM Classroom c, Subject s WHERE c.classID = ? AND s.subjectID = ?',
      [classID, subjectID]
    );
    const [students] = await pool.query(
      `SELECT s.studentID, s.first_name, s.last_name, s.thai_first_name, s.thai_last_name, u.username AS studentCode
       FROM StudentClass sc
       JOIN Student s ON sc.studentID = s.studentID
       JOIN User u ON u.refID = s.studentID AND u.role = 'STUDENT'
       WHERE sc.classID = ? AND sc.year = ? AND sc.term = ?
       ORDER BY u.username`,
      [classID, year, term]
    );
    let [components] = await pool.query(
      'SELECT id, name, weight, sortOrder FROM ScoreComponent WHERE classID = ? AND subjectID = ? AND year = ? AND term = ? ORDER BY sortOrder, id',
      [classID, subjectID, year, term]
    );
    if (!components || components.length === 0) {
      dbRaw.prepare(
        'INSERT INTO ScoreComponent (classID, subjectID, year, term, name, weight, sortOrder) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(classID, subjectID, year, term, 'กลางภาค', 50, 0);
      dbRaw.prepare(
        'INSERT INTO ScoreComponent (classID, subjectID, year, term, name, weight, sortOrder) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(classID, subjectID, year, term, 'ปลายภาค', 50, 1);
      components = dbRaw.prepare(
        'SELECT id, name, weight, sortOrder FROM ScoreComponent WHERE classID = ? AND subjectID = ? AND year = ? AND term = ? ORDER BY sortOrder, id'
      ).all(classID, subjectID, year, term);
    }
    const [scores] = await pool.query(
      'SELECT studentID, componentID, score FROM Score WHERE classID = ? AND subjectID = ? AND year = ? AND term = ?',
      [classID, subjectID, year, term]
    );
    const scoreMap = {};
    for (const r of scores || []) {
      const key = `${r.studentID}-${r.componentID}`;
      scoreMap[key] = r.score;
    }
    res.json({
      success: true,
      data: {
        className: classRow?.className,
        subjectName: classRow?.subjectName,
        year,
        term,
        students: students || [],
        components: components || [],
        scores: scoreMap,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message });
  }
});

router.put('/teacher/score-components', requireTeacher, express.json(), async (req, res) => {
  try {
    const { classID, subjectID, year, term, components } = req.body;
    const cid = parseInt(classID, 10);
    const sid = parseInt(subjectID, 10);
    const y = parseInt(year, 10) || new Date().getFullYear() + 543;
    const t = parseInt(term, 10) || 1;
    if (isNaN(cid) || isNaN(sid) || !Array.isArray(components)) {
      return res.status(400).json({ success: false, message: 'ข้อมูลไม่ครบ' });
    }
    const [auth] = await pool.query(
      `SELECT 1 FROM User u JOIN Teacher t ON u.refID = t.teacherID
       JOIN ClassroomSubject cs ON cs.teacherID = t.teacherID
       WHERE u.userID = ? AND cs.classID = ? AND cs.subjectID = ? AND cs.year = ? AND cs.term = ?`,
      [req.user.userID, cid, sid, y, t]
    );
    if (!auth || auth.length === 0) {
      return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์' });
    }
    const totalWeight = components.reduce((sum, c) => sum + (parseFloat(c.weight) || 0), 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      return res.status(400).json({ success: false, message: 'น้ำหนักรวมต้องเท่ากับ 100%' });
    }
    dbRaw.prepare('DELETE FROM Score WHERE classID = ? AND subjectID = ? AND year = ? AND term = ?').run(cid, sid, y, t);
    dbRaw.prepare('DELETE FROM ScoreComponent WHERE classID = ? AND subjectID = ? AND year = ? AND term = ?').run(cid, sid, y, t);
    const insertStmt = dbRaw.prepare(
      'INSERT INTO ScoreComponent (classID, subjectID, year, term, name, weight, sortOrder) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    components.forEach((c, i) => {
      insertStmt.run(cid, sid, y, t, String(c.name || '').trim() || 'คะแนน', parseFloat(c.weight) || 0, i);
    });
    res.json({ success: true, message: 'บันทึกส่วนประกอบคะแนนแล้ว' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message });
  }
});

router.put('/teacher/scores', requireTeacher, express.json(), async (req, res) => {
  try {
    const { classID, subjectID, year, term, scores } = req.body;
    const cid = parseInt(classID, 10);
    const sid = parseInt(subjectID, 10);
    const y = parseInt(year, 10) || new Date().getFullYear() + 543;
    const t = parseInt(term, 10) || 1;
    if (isNaN(cid) || isNaN(sid) || typeof scores !== 'object') {
      return res.status(400).json({ success: false, message: 'ข้อมูลไม่ครบ' });
    }
    const [auth] = await pool.query(
      `SELECT 1 FROM User u JOIN Teacher t ON u.refID = t.teacherID
       JOIN ClassroomSubject cs ON cs.teacherID = t.teacherID
       WHERE u.userID = ? AND cs.classID = ? AND cs.subjectID = ? AND cs.year = ? AND cs.term = ?`,
      [req.user.userID, cid, sid, y, t]
    );
    if (!auth || auth.length === 0) {
      return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์' });
    }
    const upsertStmt = dbRaw.prepare(
      `INSERT OR REPLACE INTO Score (studentID, classID, subjectID, year, term, componentID, score)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    for (const key of Object.keys(scores)) {
      const m = key.match(/^(\d+)-(\d+)$/);
      if (m) {
        const studentID = parseInt(m[1], 10);
        const componentID = parseInt(m[2], 10);
        const scoreVal = scores[key];
        const num = scoreVal === '' || scoreVal == null ? null : parseFloat(scoreVal);
        if (!isNaN(studentID) && !isNaN(componentID)) {
          upsertStmt.run(studentID, cid, sid, y, t, componentID, num);
        }
      }
    }
    res.json({ success: true, message: 'บันทึกคะแนนแล้ว' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
