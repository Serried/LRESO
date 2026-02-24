const request = require('supertest');
const app = require('../../backend/app');

describe('Auth API', () => {
  describe('POST /api/login', () => {
    it('should reject empty credentials', async () => {
      const res = await request(app).post('/api/login').send({});
      expect([400, 401]).toContain(res.status);
      expect(res.body.success).toBeFalsy();
    });
    it('should reject wrong password', async () => {
      const res = await request(app).post('/api/login').send({ username: 'admin', password: 'wrong' });
      expect(res.status).toBe(401);
    });
    it('should login admin successfully', async () => {
      const res = await request(app).post('/api/login').send({ username: 'admin', password: 'password123' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.role).toBe('ADMIN');
    });
    it('should login teacher successfully', async () => {
      const res = await request(app).post('/api/login').send({ username: 'john.doe', password: 'password123' });
      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('TEACHER');
    });
    it('should login student successfully', async () => {
      const res = await request(app).post('/api/login').send({ username: '67070001', password: 'password123' });
      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('STUDENT');
    });
  });
});
