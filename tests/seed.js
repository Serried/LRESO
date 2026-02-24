/**
 * Seed test database with users, teachers, students, classrooms, etc.
 * Run after schema init. Uses bcrypt for password hashes.
 */
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = process.env.SQLITE_DB_PATH || path.join(__dirname, '..', 'backend', 'lreso.test.db');
const Database = require('better-sqlite3');
const db = new Database(dbPath);

const run = (sql, params = []) => db.prepare(sql).run(...params);
const get = (sql, params = []) => db.prepare(sql).get(...params);

async function seed() {
  const passwordHash = await bcrypt.hash('password123', 10);

  const tables = ['Score', 'ScoreComponent', 'Ticket', 'Announcement', 'ClassSchedule', 'ClassroomSubject', 'StudentClass', 'Classroom', 'Subject', 'User', 'Student', 'Teacher'];
  for (const t of tables) {
    try { run(`DELETE FROM ${t}`); } catch (e) { /* ignore */ }
  }
  try { run("DELETE FROM sqlite_sequence WHERE name IN ('User','Teacher','Student','Classroom','Subject','Announcement','Ticket','ScoreComponent')"); } catch (e) { /* ignore */ }

  run("INSERT INTO User (username, password_hash, role, status, createdAt) VALUES (?, ?, 'ADMIN', 'ACTIVE', datetime('now'))", ['admin', passwordHash]);
  const adminId = db.prepare('SELECT last_insert_rowid() as id').get().id;

  run("INSERT INTO Teacher (first_name, last_name, thai_first_name, thai_last_name, gender, email, department, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    ['John', 'Doe', 'จอห์น', 'โด', 'M', 'john@test.ac.th', 'คณิตศาสตร์', 'ACTIVE']);
  const teacherId = db.prepare('SELECT last_insert_rowid() as id').get().id;
  run("INSERT INTO User (username, password_hash, role, refID, status, avatar, thai_first_name, thai_last_name, gender, createdAt) VALUES (?, ?, 'TEACHER', ?, 'ACTIVE', ?, ?, ?, ?, datetime('now'))",
    ['john.doe', passwordHash, teacherId, 'avatars/avatar-placeholder.jpg', 'จอห์น', 'โด', 'M']);
  const teacherUserId = db.prepare('SELECT last_insert_rowid() as id').get().id;

  run("INSERT INTO Student (first_name, last_name, thai_first_name, thai_last_name, gender, email, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ['Jane', 'Smith', 'เจน', 'สมิธ', 'F', 'jane@test.ac.th', 'STUDYING']);
  const studentId = db.prepare('SELECT last_insert_rowid() as id').get().id;
  run("INSERT INTO User (username, password_hash, role, refID, status, avatar, thai_first_name, thai_last_name, gender, createdAt) VALUES (?, ?, 'STUDENT', ?, 'ACTIVE', ?, ?, ?, ?, datetime('now'))",
    ['67070001', passwordHash, studentId, 'avatars/avatar-placeholder.jpg', 'เจน', 'สมิธ', 'F']);
  const studentUserId = db.prepare('SELECT last_insert_rowid() as id').get().id;

  run("INSERT INTO Classroom (className, plan, responsibleTeacherID) VALUES (?, ?, ?)", ['ม.6/1', 'แผนวิทย์ - คณิต', teacherId]);
  const classId = db.prepare('SELECT last_insert_rowid() as id').get().id;

  run("INSERT INTO Subject (subjectName, group_name, credit) VALUES (?, ?, ?)", ['คณิตศาสตร์', 'คณิตศาสตร์', 3.0]);
  const subjectId = db.prepare('SELECT last_insert_rowid() as id').get().id;

  const year = new Date().getFullYear() + 543;
  const term = 1;

  run("INSERT INTO StudentClass (studentID, classID, year, term) VALUES (?, ?, ?, ?)", [studentId, classId, year, term]);
  run("INSERT OR IGNORE INTO ClassroomSubject (classID, subjectID, teacherID, year, term, hours, semester, academicYear, isOpen) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [classId, subjectId, teacherId, year, term, 3, term, `${term}/${year}`, 1]);
  run("INSERT OR IGNORE INTO ClassSchedule (classID, subjectID, teacherID, dayOfWeek, period, year, term) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [classId, subjectId, teacherId, 1, 1, year, term]);
  run("INSERT INTO Announcement (title, content, createdBy, targetRole, category, isPinned) VALUES (?, ?, ?, ?, ?, ?)",
    ['ประกาศทดสอบ', 'เนื้อหาประกาศทดสอบ', adminId, 'ALL', 'GENERAL', 0]);
  run("INSERT INTO Ticket (type, topic, content, userID, status) VALUES (?, ?, ?, ?, ?)", ['INFO', 'ทดสอบคำร้อง', 'เนื้อหาทดสอบ', studentUserId, 'OPEN']);

  db.close();
  return { admin: { userID: adminId }, teacher: { userID: teacherUserId, teacherID: teacherId }, student: { userID: studentUserId, studentID: studentId }, classroom: { classID: classId }, subject: { subjectID: subjectId }, year, term };
}

if (require.main === module) {
  seed().then((d) => console.log('Seed complete:', JSON.stringify(d, null, 2))).catch((e) => { console.error('Seed failed:', e); process.exit(1); });
} else {
  module.exports = { runSeed: seed };
}
