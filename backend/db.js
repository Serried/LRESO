const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.SQLITE_DB_PATH || path.join(__dirname, 'lreso.db');
const db = new Database(dbPath);

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
