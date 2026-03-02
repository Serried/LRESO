/**
 * Test helpers: get auth tokens, seed data ids, etc.
 */
const jwt = require('jsonwebtoken');

const SEED = {
  admin: { userID: 1, username: 'admin', password: 'password123', role: 'ADMIN', refID: null },
  teacher: { userID: 2, username: 'john.doe', password: 'password123', role: 'TEACHER', teacherID: 1 },
  student: { userID: 3, username: '67070001', password: 'password123', role: 'STUDENT', studentID: 1 },
  classroom: { classID: 1 },
  subject: { subjectID: 1 },
};

const getToken = (role = 'admin') => {
  const u = SEED[role] || SEED.admin;
  return jwt.sign(
    { userID: u.userID, role: u.role, refID: u.teacherID ?? u.studentID ?? null },
    process.env.JWT_SECRET || 'test-jwt-secret',
    { expiresIn: '8h' }
  );
};

const authHeader = (role = 'admin') => ({ Authorization: `Bearer ${getToken(role)}` });

const yt = () => ({ year: new Date().getFullYear() + 543, term: 1 });

module.exports = { SEED, getToken, authHeader, yt };
