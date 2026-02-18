const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const pool = require('./db');
const db = require('./db').raw;
const { parse } = require('csv-parse/sync');
// idempotent (ชั่วคราว ๆ)
// try { db.exec('ALTER TABLE Teacher ADD COLUMN thai_first_name TEXT'); } catch (e) { if (!/duplicate column name/i.test(e.message)) throw e; }
// try { db.exec('ALTER TABLE Teacher ADD COLUMN thai_last_name TEXT'); } catch (e) { if (!/duplicate column name/i.test(e.message)) throw e; }
// try { db.exec('ALTER TABLE Student ADD COLUMN thai_first_name TEXT'); } catch (e) { if (!/duplicate column name/i.test(e.message)) throw e; }
// try { db.exec('ALTER TABLE Student ADD COLUMN thai_last_name TEXT'); } catch (e) { if (!/duplicate column name/i.test(e.message)) throw e; }
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const multer = require('multer');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// servve uploaded avatars
const uploadsDir = path.join(__dirname, 'uploads', 'avatars');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// multer config ไว้อัพรูปปก user
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = (file.mimetype.match(/\/(jpeg|jpg|png|gif|webp)$/) || ['', 'jpg'])[1];
    cb(null, `user-${Date.now()}.${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 mb
  fileFilter: (req, file, cb) => {
    if (/image\/(jpeg|jpg|png|gif|webp)/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only images (jpeg, png, gif, webp) allowed'));
  }
});

// multer for CSV uploads (ไม่มี image filter)
const csvUploadDir = path.join(__dirname, 'uploads', 'csv');
if (!fs.existsSync(csvUploadDir)) fs.mkdirSync(csvUploadDir, { recursive: true });
const uploadCsv = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, csvUploadDir),
    filename: (req, file, cb) => cb(null, `csv-${Date.now()}.csv`)
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 mb
  fileFilter: (req, file, cb) => {
    // เช็ค mime type กับ file format ว่าต้องเป็น .csv เท่านั้น
    const ok = /^text\/(csv|plain)$|application\/csv/.test(file.mimetype) || /\.csv$/i.test(file.originalname);
    if (ok) cb(null, true);
    else cb(new Error('Only CSV files allowed'));
  }
});

// password random
function generatePassword(length = 12) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
    let password = '';
    const randomBytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
      password += chars[randomBytes[i] % chars.length];
    }
    return password;
  }

// Create student username
async function createStudentUsername(pool) {
    const year = new Date().getFullYear() + 543; // พ.ศ.
    const yearSuffix = String(year).substring(2, 4); // trim เอา 2 ตัวท้าย
  
    const [rows] = await pool.query(
      "SELECT username FROM User WHERE username LIKE ? ORDER BY username DESC LIMIT 1",
      [yearSuffix + '%']
    );
  
    let nextNum = 1;
    if (rows.length > 0) {
      const lastUsername = rows[0].username;
      const numPart = lastUsername.substring(2);  // "001", "002", etc.
      nextNum = parseInt(numPart, 10) + 1;
    }
  
    const suffix = String(nextNum).padStart(3, '0');
    return yearSuffix + suffix;
  }



app.get('/api/health', (req, res) => {
    res.json({status: 'OK', message: 'เซิร์ฟเวอร์กำลังทำงาน'});
});

app.get('/api/test-db', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT 1+1 AS result');
        res.json({success: true, data: rows});
    } catch (e) {
        res.status(500).json({success: false, message: e.message});
    }
});

app.get('/api/time', (req, res) => {
    res.json({ serverTime: new Date().toISOString() });
});

// login
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'กรุณาใส่ชื่อบัญชีผู้ใช้และรหัสผ่าน'});
        }

        const [rows] = await pool.query('SELECT userID, username, password_hash, role, refID, status, avatar FROM User WHERE username = ?', [username]);

        // DEBUG: ไม่เจอ user
        if (rows.length === 0) {
            console.log('[LOGIN DEBUG] User not found:', username);
            return res.status(401).json({ success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'});
        }

        const user = rows[0];
        let first_name = null, last_name = null, thai_first_name = null, thai_last_name = null;

        if (user.refID) {
          if (user.role === "TEACHER") {
            const [data] = await pool.query("SELECT first_name, last_name, thai_first_name, thai_last_name FROM Teacher WHERE teacherID = ?", [user.refID]);
            if (data.length) {
              first_name = data[0].first_name;
              last_name = data[0].last_name;
              thai_first_name = data[0].thai_first_name;
              thai_last_name = data[0].thai_last_name;
            }
          } else if (user.role === "STUDENT") {
            const [data] = await pool.query("SELECT first_name, last_name, thai_first_name, thai_last_name FROM Student WHERE studentID = ?", [user.refID]);
            if (data.length) {
              first_name = data[0].first_name;
              last_name = data[0].last_name;
              thai_first_name = data[0].thai_first_name;
              thai_last_name = data[0].thai_last_name;
            }
          }
        }
        // user ไม่ status ACTIVE
        if (user.status !== 'ACTIVE') {
            console.log('[LOGIN DEBUG] User status not ACTIVE:', user.status, 'for', username);
            return res.status(401).json({ success: false, message: "บัญชีนี้ถูกปิดใช้งาน"});
        }

        const isMatch = await bcrypt.compare(password, user.password_hash || '');
        // รหัสไม่ตรง
        if (!isMatch) {
            console.log('[LOGIN DEBUG] Password mismatch for user:', username, '(hash exists:', !!user.password_hash, 'hash starts with $2:', (user.password_hash || '').startsWith('$2'));
            return res.status(401).json({ success: false, message: "ข้อมูลไม่ถูกต้อง"});
        }

        const token = jwt.sign(
            {userID: user.userID, role: user.role, refID: user.refID},
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.userID,
                username: user.username,
                role: user.role,
                refID: user.refID,
                avatar: user.avatar,
                first_name,
                last_name,
                thai_first_name,
                thai_last_name
            }
        });
    } catch (e) {
        console.log(e);
        res.status(500).json({ success: false, message: "กรุณาตรวจสอบผลลัพธ์ที่ฝั่งเซิร์ฟเวอร์"});
    }
})

// get self teacher profile
app.get('/api/me/teacher', requireAuth, requireTeacher, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        t.teacherID,
        t.first_name,
        t.last_name,
        t.thai_first_name,
        t.thai_last_name,
        t.gender,
        t.dob,
        t.tel,
        t.email,
        t.department,
        t.status,
        u.avatar
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

// get self student profile
app.get('/api/me/student', requireAuth, requireStudent, async (req, res) => {
  try {

    const userID = req.user.userID;

    const [rows] = await pool.query(`
      SELECT 
        s.studentID,
        s.first_name,
        s.last_name,
        s.gender,
        s.dob,
        s.tel,
        s.address,
        s.status
      FROM User u
      JOIN Student s
      ON u.refID = s.studentID
      WHERE u.userID = ?
    `, [userID]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false });
    }

    res.json({ success: true, data: rows[0] });

  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'เซิร์ฟเวอร์ขัดข้อง'});
  }
});

app.get('/api/me/admin', requireAuth, requireAdmin, async (req, res) => {
  try {
    const userID = req.user.userID;

    const [rows] = await pool.query(
      'SELECT userID, username, role, avatar, status FROM User WHERE userID = ?',
      [userID]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false });
    }

    res.json({ success: true, data: rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'เซิร์ฟเวอร์ขัดข้อง'});
  }
});


app.get('/api/me/student/classes', requireAuth, requireStudent, async (req, res) => {
  try {

    const userID = req.user.userID;

    const [rows] = await pool.query(`
      SELECT 
        sc.classID,
        c.className
      FROM User u
      JOIN StudentClass sc
      ON u.refID = sc.studentID
      JOIN Classroom c
      ON sc.classID = c.classID
      WHERE u.userID = ?
    `, [userID]);

    res.json({ success: true, data: rows });

  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'เซิร์ฟเวอร์ขัดข้อง' });
  }
});

// Auth middleware (ทุกคนที่ login แล้ว)
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

// ADMIN ONLY MIDDLEWARE
function requireAdmin(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ success: false, message: 'ไมไ่ด้รับอนุญาต'});
    } try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== "ADMIN") {
            return res.status(403).json({ success: false, message: 'สำหรับผู้แดแลระบบเท่านั้น'});
        }
        req.user = decoded;
        next();
    } catch (e) {
        return res.status(401).json({ success: false, message: 'โทเคนไม่ถูกต้อง'});
    }
} 

// for department drop down ในหน้าสร้างครู
app.get('/api/subjects/group-names', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT DISTINCT group_name FROM Subject WHERE group_name IS NOT NULL AND group_name != \'\' ORDER BY group_name'
    );
    res.json({ success: true, data: rows.map(r => r.group_name) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message });
  }
});

// ================================================= เริ่มงงละอะไรเยอะแยะวะ
// (Admin) create teacher endpoint
app.post('/api/admin/teachers', requireAuth, requireAdmin, upload.single('avatar'), async (req, res) => {
    try {
      const { first_name, last_name, thai_first_name, thai_last_name, gender, dob, tel, email, department } = req.body;
  
      if (!first_name || !last_name || !email) {
        return res.status(400).json({ success: false, message: 'English first name, last name, and email are required' });
      }
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'กรุณาอัพโหลดรูปโปรไฟล์' });
      }
      const password = generatePassword();
      const hashedPassword = await bcrypt.hash(password, 10);
  
      const [teacherResult] = await pool.query(
        'INSERT INTO Teacher (first_name, last_name, thai_first_name, thai_last_name, gender, dob, tel, email, department, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [first_name, last_name, thai_first_name || null, thai_last_name || null, gender || null, dob || null, tel || null, email, department || null, 'ACTIVE']
      );
  
      const teacherID = teacherResult.insertId;
      // Username: ชื่อจริงภาษาอังกฤษ.นามสกุลตัวแรกภาษาอังกฤษ
      const first = first_name.trim().toLowerCase();
      const lastInitial = last_name.trim().toLowerCase().substring(0, 1);
      const username = `${first}.${lastInitial}`;
      const avatarPath = `avatars/${req.file.filename}`;

      await pool.query(
        'INSERT INTO User (username, password_hash, role, refID, status, avatar, createdAt) VALUES (?, ?, ?, ?, ?, ?, datetime(\'now\'))',
        [username, hashedPassword, 'TEACHER', teacherID, 'ACTIVE', avatarPath]
      );
  
      res.json({ success: true, message: `สร้างบัญชี (ครูผู้สอน) - ${username}:${password} สำเร็จ!`, password });
    } catch (e) {
      console.error(e);
      res.status(500).json({ success: false, message: e.message });
    }
  });

app.post('/api/admin/teachers/csv', requireAuth, requireAdmin, uploadCsv.single('csv'), async (req, res) => {
  try {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "กรุณาอัปโหลดไฟล์ค่าที่คั่นด้วยจุลภาค" });
  }
  
  const csv = fs.readFileSync(req.file.path, 'utf8');

  const records = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    bom: true
  })

  let created = [];

  for (const row of records) {
    const {
      first_name,
      last_name,
      thai_first_name,
      thai_last_name,
      gender,
      dob,
      tel,
      email,
      department
    } = row;

    if (!first_name || !last_name || !email) continue;

    const password = generatePassword();
    const hashedPassword = await bcrypt.hash(password, 10);

    const [teacherResult] = await pool.query(
      'INSERT INTO Teacher (first_name, last_name, thai_first_name, thai_last_name, gender, dob, tel, email, department, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        first_name,
        last_name,
        thai_first_name || null,
        thai_last_name || null,
        gender || null,
        dob || null,
        tel || null,
        email,
        department || null,
        'ACTIVE'
      ]
    );

    const teacherID = teacherResult.insertId;
    const username = `${String(first_name).trim().toLowerCase()}.${String(last_name).trim().toLowerCase()[0]}`;
    await pool.query(
      'INSERT INTO User (username, password_hash, role, refID, status, avatar, createdAt) VALUES (?, ?, ?, ?, ?, ?, datetime(\'now\'))',
      [username, hashedPassword, 'TEACHER', teacherID, 'ACTIVE', 'avatars/avatar-placeholder.jpg']
    );

    created.push({ username, password });
  }

  res.json({ success: true, message: `สร้างบัญชีครูผู้สอนสำเร็จจำนวน ${created.length} บัญชี`, account: created });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message });
  }
});


  // (Admin) create student endpoint
app.post('/api/admin/students', requireAuth, requireAdmin, upload.single('avatar'), async (req, res) => {
    try {
        const { first_name, last_name, thai_first_name, thai_last_name, gender, dob, tel, adress } = req.body;
        
        if ( !first_name || !last_name) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อ-นามสกุล (English) ให้ครบ' });
        }
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'กรุณาอัพโหลดรูปโปรไฟล์' });
        }
        const password = generatePassword();
        const hashedPassword = await bcrypt.hash(password, 10);
        const [studentResult] = await pool.query(
            'INSERT INTO Student (first_name, last_name, thai_first_name, thai_last_name, gender, dob, tel, address, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [first_name, last_name, thai_first_name || null, thai_last_name || null, gender || null, dob || null, tel || null, adress || null, 'STUDYING']
        );
        
        const studentID = studentResult.insertId;
        const username = await createStudentUsername(pool);
        const avatarPath = `avatars/${req.file.filename}`;

        await pool.query(
            'INSERT INTO User (username, password_hash, role, refID, status, avatar, createdAt) VALUES (?, ?, ?, ?, ?, ?, datetime(\'now\'))',
            [username, hashedPassword, 'STUDENT', studentID, 'ACTIVE', avatarPath]
        );
  
      res.json({ success: true, message: `สร้างบัญชี (นักเรียน) - ${username}:${password} สำเร็จ!`, password });
    } catch (e) {
      console.error(e);
      res.status(500).json({ success: false, message: e.message });
    }
  });

// Upload avatar (logged-in user updates own profile)
app.post('/api/users/me/avatar', requireAuth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'กรุณาอัพโหลดไฟล์' });
    }
    const userId = req.user.userID;
    const avatarPath = `avatars/${req.file.filename}`;

    const [rows] = await pool.query('UPDATE User SET avatar = ? WHERE userID = ?', [avatarPath, userId]);

    res.json({ success: true, avatar: avatarPath });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message });
  }
});

app.get('/api/admin/get-teachers', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Teacher');
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message });
  }
});

// (Admin) update ข้อมูลครู
app.put('/api/admin/teachers/:id', requireAuth, requireAdmin, express.json(), async (req, res) => {
  try {
    const teacherID = parseInt(req.params.id, 10);
    if (isNaN(teacherID)) {
      return res.status(400).json({ success: false, message: 'Invalid teacher ID' });
    }
    const { first_name, last_name, thai_first_name, thai_last_name, gender, dob, tel, email, department, status } = req.body;
    await pool.query(
      `UPDATE Teacher SET
        first_name = ?, last_name = ?, thai_first_name = ?, thai_last_name = ?,
        gender = ?, dob = ?, tel = ?, email = ?, department = ?, status = ?
      WHERE teacherID = ?`,
      [
        first_name ?? null, last_name ?? null, thai_first_name ?? null, thai_last_name ?? null,
        gender ?? null, dob ?? null, tel ?? null, email ?? null, department ?? null, status ?? null,
        teacherID
      ]
    );
    // ถ้าชื่อจริงนามสกุลภาษาอังกฤษ โดนเปลี่ยน username ก็จะเปลี่ยนด้วย
    const first = (first_name && typeof first_name === 'string') ? first_name.trim().toLowerCase() : '';
    const lastInitial = (last_name && typeof last_name === 'string') ? last_name.trim().toLowerCase().substring(0, 1) : '';
    if (first && lastInitial) {
      const newUsername = `${first}.${lastInitial}`;
      await pool.query(
        "UPDATE User SET username = ? WHERE refID = ? AND role = 'TEACHER'",
        [newUsername, teacherID]
      );
    }
    res.json({ success: true, message: 'อัปเดตข้อมูลครูสำเร็จ' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: e.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});