const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const { fileURLToPath } = require('url');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: {
        ca: fs.readFileSync(path.join(__dirname, 'rds-ca.pem')),
        rejectUnauthorized: true
    }
});

module.exports = pool;