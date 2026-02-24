/**
 * Initialize test database: create schema from backend/schema.sql, then seed.
 * Run before Jest. Creates backend/lreso.test.db.
 */
const path = require('path');
const fs = require('fs');

process.env.NODE_ENV = 'test';
const dbPath = process.env.SQLITE_DB_PATH || path.join(__dirname, '..', 'backend', 'lreso.test.db');
process.env.SQLITE_DB_PATH = dbPath;

const schemaPath = path.join(__dirname, '..', 'backend', 'schema.sql');
const schemaSql = fs.readFileSync(schemaPath, 'utf8');

const Database = require('better-sqlite3');
const db = new Database(dbPath);

db.exec(schemaSql);
db.close();

console.log('Test DB schema created at', dbPath);

const { runSeed } = require('./seed');
runSeed()
  .then(() => {
    console.log('Seed complete');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
