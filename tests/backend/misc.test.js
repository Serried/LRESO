const request = require('supertest');
const app = require('../../backend/app');
const { authHeader } = require('../helpers');

describe('Misc API', () => {
  it('GET /api/health returns OK', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
  });
  it('GET /api/time returns server time', async () => {
    const res = await request(app).get('/api/time');
    expect(res.status).toBe(200);
    expect(res.body.serverTime).toBeDefined();
  });
  it('GET /api/subjects/group-names requires auth', async () => {
    const res = await request(app).get('/api/subjects/group-names');
    expect(res.status).toBe(401);
  });
  it('GET /api/subjects/group-names returns data when authenticated', async () => {
    const res = await request(app).get('/api/subjects/group-names').set(authHeader('admin'));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
  it('POST /api/ticket accepts topic without auth', async () => {
    const res = await request(app).post('/api/ticket').send({ topic: 'Test', type: 'INFO', content: 'Test' });
    expect(res.status).toBe(200);
  });
  it('POST /api/ticket rejects without topic', async () => {
    const res = await request(app).post('/api/ticket').send({ content: 'No topic' });
    expect(res.status).toBe(400);
  });

  describe('Announcement expiration', () => {
    it('GET /api/news/featured excludes expired announcements', async () => {
      const Database = require('better-sqlite3');
      const db = new Database(process.env.SQLITE_DB_PATH);
      const adminId = db.prepare('SELECT userID FROM User WHERE role = ?').get('ADMIN')?.userID || 1;
      db.prepare(
        'INSERT INTO Announcement (title, content, createdBy, targetRole, expireAt, category, isPinned) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run('Expired announcement', 'This should not appear', adminId, 'ALL', '2020-01-01T00:00:00', 'GENERAL', 0);
      const lastId = db.prepare('SELECT last_insert_rowid() as id').get().id;
      db.close();

      const res = await request(app).get('/api/news/featured');
      expect(res.status).toBe(200);
      const ids = (res.body.data || []).map((a) => a.announceID ?? a.announcementID ?? a.id);
      expect(ids).not.toContain(lastId);

      const db2 = new Database(process.env.SQLITE_DB_PATH);
      db2.prepare('DELETE FROM Announcement WHERE announceID = ?').run(lastId);
      db2.close();
    });
  });
});
