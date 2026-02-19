const path = require('path');
const fs = require('fs');
const multer = require('multer');

const uploadsDir = path.join(__dirname, '..', 'uploads', 'avatars');
const csvUploadDir = path.join(__dirname, '..', 'uploads', 'csv');

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(csvUploadDir)) fs.mkdirSync(csvUploadDir, { recursive: true });

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = (file.mimetype.match(/\/(jpeg|jpg|png|gif|webp)$/) || ['', 'jpg'])[1];
    cb(null, `user-${Date.now()}.${ext}`);
  }
});

const upload = multer({
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/image\/(jpeg|jpg|png|gif|webp)/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only images (jpeg, png, gif, webp) allowed'));
  }
});

const uploadCsv = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, csvUploadDir),
    filename: (req, file, cb) => cb(null, `csv-${Date.now()}.csv`)
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /^text\/(csv|plain)$|application\/csv/.test(file.mimetype) || /\.csv$/i.test(file.originalname);
    if (ok) cb(null, true);
    else cb(new Error('Only CSV files allowed'));
  }
});

module.exports = { upload, uploadCsv };
