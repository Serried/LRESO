const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.SQLITE_DB_PATH || path.join(__dirname, 'lreso.db');
const db = new Database(dbPath);

// Migration: add thai_first_name, thai_last_name, gender to User table
function migrateUserTable() {
  const info = db.prepare("PRAGMA table_info(User)").all();
  const cols = info.map((r) => r.name);
  if (!cols.includes('thai_first_name')) {
    db.exec('ALTER TABLE User ADD COLUMN thai_first_name TEXT');
  }
  if (!cols.includes('thai_last_name')) {
    db.exec('ALTER TABLE User ADD COLUMN thai_last_name TEXT');
  }
  if (!cols.includes('gender')) {
    db.exec('ALTER TABLE User ADD COLUMN gender TEXT');
  }
  // Backfill from Teacher/Student for existing users
  db.exec(`
    UPDATE User SET thai_first_name = (SELECT thai_first_name FROM Teacher WHERE Teacher.teacherID = User.refID),
      thai_last_name = (SELECT thai_last_name FROM Teacher WHERE Teacher.teacherID = User.refID),
      gender = (SELECT gender FROM Teacher WHERE Teacher.teacherID = User.refID)
    WHERE role = 'TEACHER' AND refID IS NOT NULL
  `);
  db.exec(`
    UPDATE User SET thai_first_name = (SELECT thai_first_name FROM Student WHERE Student.studentID = User.refID),
      thai_last_name = (SELECT thai_last_name FROM Student WHERE Student.studentID = User.refID),
      gender = (SELECT gender FROM Student WHERE Student.studentID = User.refID)
    WHERE role = 'STUDENT' AND refID IS NOT NULL
  `);
}
migrateUserTable();

// wrapper
const pool = {
  async query(sql, params = []) {
    try {
      const stmt = db.prepare(sql);
      const sqlUpper = sql.trim().toUpperCase();
      if (sqlUpper.startsWith('SELECT')) {
        const rows = stmt.all(...params);
        return [rows];
      } else {
        const result = stmt.run(...params);
        return [{ insertId: result.lastInsertRowid }];
      }
    } catch (e) {
      throw e;
    }
  }
};

module.exports = pool;
module.exports.raw = db;
