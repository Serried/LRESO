const express = require('express');
const cors = require('cors');
const pool = require('./db');
require('dotenv').config(); // เอามาก่อน เผื่อใช้

const app = express();
app.use(cors());
app.use(express.json());

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

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});