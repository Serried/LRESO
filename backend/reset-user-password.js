// สำหรับ reset password ให้ user (admin เป็นคนทำ)
//  วิธีใช้: node reset-user-password.js username new_pass

const bcrypt = require('bcrypt');
const pool = require('./db');

async function reset() {
  const username = process.argv[2];
  const newPassword = process.argv[3];

  if (!username || !newPassword) {
    console.log('Usage: node reset-user-password.js <username> <new_password>');
    console.log('Example: node reset-user-password.js 2501001 mypassword');
    process.exit(1);
  }

  try {
    const [rows] = await pool.query('SELECT userID, username, role FROM User WHERE username = ?', [username]);
    if (rows.length === 0) {
      console.log('User not found:', username);
      process.exit(1);
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE User SET password_hash = ? WHERE username = ?', [hash, username]);

    console.log(`Password reset for ${rows[0].role} user "${username}"`);
    console.log('You can now log in with:', username, '/', newPassword);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

reset();
