const bcrypt = require('bcrypt');
const pool = require('./db');

async function createAdmin() {
    const username = 'admin';
    const password = 'admin';

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const [existingAdmin] = await pool.query(
            'SELECT * FROM User WHERE username = ?',
            [username]
        );

        if (existingAdmin.length > 0) {
            console.log('Admin user already exists');
            return;
        }

        await pool.query(
            'INSERT INTO User (username, password_hash, role, status, createdAt) VALUES (?, ?, ?, ?, NOW())',
            [username, hashedPassword, 'ADMIN', 'ACTIVE']
        );

        console.log('Admin user created successfully');
    } catch (err) {
        console.error(err);
    }
}

createAdmin();
