const path = require('path');
const fs = require('fs');
const multer = require('multer');

const mk = (d) => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); };
const dirs = { avatars: path.join(__dirname, '..', 'uploads', 'avatars'), csv: path.join(__dirname, '..', 'uploads', 'csv'), tickets: path.join(__dirname, '..', 'uploads', 'tickets') };
Object.values(dirs).forEach(mk);

const imgFilter = (_, file, cb) => (/image\/(jpeg|jpg|png|gif|webp)/.test(file.mimetype) ? cb(null, true) : cb(new Error('Only images allowed')));
const imgOrPdfFilter = (_, file, cb) => (/image\/(jpeg|jpg|png|gif|webp)|application\/pdf/.test(file.mimetype) ? cb(null, true) : cb(new Error('Only images or PDF allowed')));
const ext = (m) => (m.match(/\/(jpeg|jpg|png|gif|webp)$/) || ['', 'jpg'])[1];

const upload = multer({
  storage: multer.diskStorage({ destination: (_, __, cb) => cb(null, dirs.avatars), filename: (_, f, cb) => cb(null, `user-${Date.now()}.${ext(f.mimetype)}`) }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: imgFilter,
});

const uploadCsv = multer({
  storage: multer.diskStorage({ destination: (_, __, cb) => cb(null, dirs.csv), filename: (_, __, cb) => cb(null, `csv-${Date.now()}.csv`) }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, f, cb) => (/^text\/(csv|plain)$|application\/csv/.test(f.mimetype) || /\.csv$/i.test(f.originalname)) ? cb(null, true) : cb(new Error('Only CSV allowed')),
});

const ticketExt = (m) => (m === 'application/pdf' ? 'pdf' : (m.match(/\/(jpeg|jpg|png|gif|webp)$/) || ['', 'jpg'])[1]);
const uploadTicketAttachment = multer({
  storage: multer.diskStorage({ destination: (_, __, cb) => cb(null, dirs.tickets), filename: (_, f, cb) => cb(null, `ticket-${Date.now()}.${ticketExt(f.mimetype)}`) }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imgOrPdfFilter,
});

module.exports = { upload, uploadCsv, uploadTicketAttachment };
