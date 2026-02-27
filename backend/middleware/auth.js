const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET;

const getToken = (req) => req.headers.authorization?.startsWith('Bearer ') && req.headers.authorization.split(' ')[1];

function requireAuth(req, res, next) {
  const token = getToken(req);
  if (!token) return res.status(401).json({ success: false, message: 'ไม่ได้รับอนุญาต' });
  try {
    req.user = jwt.verify(token, secret);
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'โทเคนไม่ถูกต้อง' });
  }
}

const requireRole = (role, msg) => (req, res, next) =>
  req.user.role === role ? next() : res.status(403).json({ success: false, message: msg });

function optionalAuth(req, res, next) {
  const token = getToken(req);
  if (!token) { req.user = null; return next(); }
  try { req.user = jwt.verify(token, secret); } catch { req.user = null; }
  next();
}

module.exports = {
  requireAuth,
  requireStudent: requireRole('STUDENT', 'สำหรับนักเรียนเท่านั้น'),
  requireTeacher: requireRole('TEACHER', 'สำหรับครูผู้สอนเท่านั้น'),
  requireAdmin: requireRole('ADMIN', 'สำหรับผู้ดูแลระบบเท่านั้น'),
  optionalAuth,
};
