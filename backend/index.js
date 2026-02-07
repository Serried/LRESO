const express = require('express');
const cors = require('cors');
const pool = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken')
const crypto = require('crypto');
require('dotenv').config(); // เอามาก่อน เผื่อใช้

const app = express();
app.use(cors());
app.use(express.json());

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
    res.json({status: 'OK', message: 'Backend is running'});
});

app.get('/api/test-db', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT 1+1 AS result');
        res.json({success: true, data: rows});
    } catch (e) {
        res.status(500).json({success: false, message: e.message});
    }
})

// login
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Username and password are required.'});
        }

        const [rows] = await pool.query('SELECT userID, username, password_hash, role, refID, status FROM User WHERE username = ?', [username]);
        
        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid username or password.'});
        }

        const user = rows[0];

        if (user.status !== 'ACTIVE') {
            res.status(401).json({ success: false, message: "Inactive account."});
        }
        
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid credentials"});
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
                refID: user.refID
            }
        });
    } catch (e) {
        console.log(e);
        res.status(500).json({ success: false, message: "Check server console"});
    }
})

//  single teacher by ID
app.get('/api/teachers/:id', async (req, res) => {
    try {
      const [rows] = await pool.query(
        "SELECT teacherID, first_name, last_name, gender, dob, tel, email, department, status FROM Teacher WHERE teacherID = ?",
        [req.params.id]
      );
  
      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Teacher not found' });
      }
  
      res.json({ success: true, data: rows[0] });
    } catch (e) {
      console.error(e);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // Get single student by ID
app.get('/api/students/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT studentID, first_name, last_name, gender, dob, tel, status FROM Student WHERE studentID =?",
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ADMIN ONLY MIDDLEWARE
function requireAdmin(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ success: false, message: 'Unauthorized'});
    } try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== "ADMIN") {
            return res.status(403).json({ success: false, message: 'This is for admin only'});
        }
        req.user = decoded;
        next();
    } catch (e) {
        return res.status(401).json({ success: false, message: 'Invalid token'});
    }
} 

// ================================================= เริ่มงงละอะไรเยอะแยะวะ
// (Admin) create teacher endpoint
app.post('/api/admin/teachers', requireAdmin, async (req, res) => {
    try {
      const { first_name, last_name, gender, dob, tel, email, department } = req.body;
  
      if (!first_name || !last_name || !email) {
        return res.status(400).json({ success: false, message: 'Username, password, first name, last name, and email are required' });
      }
      const password = generatePassword();
      const hashedPassword = await bcrypt.hash(password, 10);
  
      const [teacherResult] = await pool.query(
        'INSERT INTO Teacher (first_name, last_name, gender, dob, tel, email, department, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [first_name, last_name, gender || null, dob || null, tel || null, email, department || null, 'ACTIVE']
      );
  
      const teacherID = teacherResult.insertId;
      const username = `${first_name.toLowerCase()}.${last_name.toLowerCase().substring(0, 1)}`;
  
      await pool.query(
        'INSERT INTO User (username, password_hash, role, refID, status, createdAt) VALUES (?, ?, ?, ?, ?, NOW())',
        [username, hashedPassword, 'TEACHER', teacherID, 'ACTIVE']
      );
  
      res.json({ success: true, message: `สร้างบัญชี (ครูผู้สอน) - ${username}:${password} สำเร็จ!`, password });
    } catch (e) {
      console.error(e);
      res.status(500).json({ success: false, message: e.message });
    }
  });

  // (Admin) create student endpoint
app.post('/api/admin/students', requireAdmin, async (req, res) => {
    try {
        const { first_name, last_name, gender, dob, tel, adress } = req.body;
        
        if ( !first_name || !last_name) {
            return res.status(400).json({ success: false, message: 'Username, password, first name, and last name are required' });
        }
        const password = generatePassword();
        const hashedPassword = await bcrypt.hash(password, 10);
        //Insert into student table
        const [studentResult] = await pool.query(
            'INSERT INTO Student (first_name, last_name, gender, dob, tel, address, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [first_name, last_name, gender || null, dob || null, tel || null, adress || null, 'STUDYING']
        );
        
        const studentID = studentResult.insertId;
        
        const username = await createStudentUsername(pool);
      await pool.query(
        // Insert into user table
        'INSERT INTO User (username, password_hash, role, refID, status, createdAt) VALUES (?, ?, ?, ?, ?, NOW())',
        [username, hashedPassword, 'STUDENT', studentID, 'ACTIVE']
      );
  
      res.json({ success: true, message: `สร้างบัญชี (นักเรียน) - ${username}:${password} สำเร็จ!`, password });
    } catch (e) {
      console.error(e);
      res.status(500).json({ success: false, message: e.message });
    }
  });

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});