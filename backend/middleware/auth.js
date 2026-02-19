const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'ไม่ได้รับอนุญาต' });
  }
  try {
    const token = authHeader.split(' ')[1];
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ success: false, message: 'โทเคนไม่ถูกต้อง' });
  }
}

function requireStudent(req, res, next) {
  if (req.user.role !== 'STUDENT') {
    return res.status(403).json({ success: false, message: 'สำหรับนักเรียนเท่านั้น' });
  }
  next();
}

function requireTeacher(req, res, next) {
  if (req.user.role !== 'TEACHER') {
    return res.status(403).json({ success: false, message: 'สำหรับนักครูผู้สอนเท่านั้น' });
  }
  next();
}

function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'ไมไ่ด้รับอนุญาต' });
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'สำหรับผู้แดแลระบบเท่านั้น' });
    }
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ success: false, message: 'โทเคนไม่ถูกต้อง' });
  }
}

module.exports = { requireAuth, requireStudent, requireTeacher, requireAdmin };
