/**
 * Jest setup - runs before each test file.
 * Sets test DB path so backend app uses lreso.test.db.
 */
const path = require('path');
process.env.NODE_ENV = 'test';
process.env.SQLITE_DB_PATH = process.env.SQLITE_DB_PATH || path.join(__dirname, '..', 'backend', 'lreso.test.db');
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-do-not-use-in-production';
