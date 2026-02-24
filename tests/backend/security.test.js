const request = require('supertest');
const app = require('../../backend/app');
const { authHeader, getToken } = require('../helpers');
const jwt = require('jsonwebtoken');

describe('Security & Invalid Input', () => {
  describe('Role-based access (student/teacher cannot access admin)', () => {
    it('student gets 403 when accessing admin get-teachers', async () => {
      const res = await request(app)
        .get('/api/admin/get-teachers')
        .set(authHeader('student'));
      expect(res.status).toBe(403);
    });
    it('student gets 403 when accessing admin classrooms', async () => {
      const res = await request(app)
        .get('/api/admin/classrooms')
        .set(authHeader('student'));
      expect(res.status).toBe(403);
    });
    it('student gets 403 when accessing admin students', async () => {
      const res = await request(app)
        .get('/api/admin/students')
        .set(authHeader('student'));
      expect(res.status).toBe(403);
    });
    it('student gets 403 when creating classroom', async () => {
      const res = await request(app)
        .post('/api/admin/classroom/create')
        .set(authHeader('student'))
        .send({ className: 'ม.6/2', plan: 'แผนวิทย์' });
      expect(res.status).toBe(403);
    });
    it('student gets 403 when accessing admin announcements', async () => {
      const res = await request(app)
        .get('/api/admin/announcements')
        .set(authHeader('student'));
      expect(res.status).toBe(403);
    });
    it('teacher gets 403 when accessing admin get-teachers', async () => {
      const res = await request(app)
        .get('/api/admin/get-teachers')
        .set(authHeader('teacher'));
      expect(res.status).toBe(403);
    });
    it('teacher gets 403 when creating announcement as admin', async () => {
      const res = await request(app)
        .post('/api/admin/announcement/add')
        .set(authHeader('teacher'))
        .send({ title: 'Test', content: 'Test', category: 'GENERAL', targetRole: 'ALL' });
      expect(res.status).toBe(403);
    });
  });

  describe('Admin cannot access role-specific endpoints', () => {
    it('admin gets 403 when accessing /api/me/teacher', async () => {
      const res = await request(app)
        .get('/api/me/teacher')
        .set(authHeader('admin'));
      expect(res.status).toBe(403);
    });
    it('admin gets 403 when accessing /api/me/student', async () => {
      const res = await request(app)
        .get('/api/me/student')
        .set(authHeader('admin'));
      expect(res.status).toBe(403);
    });
  });

  describe('Invalid / malformed auth', () => {
    it('rejects invalid JWT', async () => {
      const res = await request(app)
        .get('/api/admin/get-teachers')
        .set('Authorization', 'Bearer invalid.jwt.token');
      expect(res.status).toBe(401);
    });
    it('rejects tampered JWT (wrong role claim)', async () => {
      const token = jwt.sign(
        { userID: 1, role: 'ADMIN', refID: null },
        'wrong-secret',
        { expiresIn: '8h' }
      );
      const res = await request(app)
        .get('/api/admin/get-teachers')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(401);
    });
    it('rejects missing Bearer prefix', async () => {
      const token = getToken('admin');
      const res = await request(app)
        .get('/api/admin/get-teachers')
        .set('Authorization', token);
      expect(res.status).toBe(401);
    });
  });

  describe('Invalid input - IDs and params', () => {
    const adminAuth = authHeader('admin');

    it('rejects invalid teacher ID (NaN)', async () => {
      const res = await request(app)
        .put('/api/admin/teachers/abc')
        .set(adminAuth)
        .send({ first_name: 'X', last_name: 'Y', email: 'x@test.ac.th' });
      expect(res.status).toBe(400);
    });
    it('rejects invalid student ID', async () => {
      const res = await request(app)
        .put('/api/admin/students/notanumber')
        .set(adminAuth)
        .send({ first_name: 'X', last_name: 'Y' });
      expect(res.status).toBe(400);
    });
    it('rejects invalid classroom ID', async () => {
      const res = await request(app)
        .put('/api/admin/classrooms/xyz')
        .set(adminAuth)
        .send({ className: 'Test', plan: 'แผนวิทย์' });
      expect(res.status).toBe(400);
    });
  });

  describe('Invalid input - login', () => {
    it('rejects null username', async () => {
      const res = await request(app)
        .post('/api/login')
        .send({ username: null, password: 'pass' });
      expect([400, 401]).toContain(res.status);
    });
    it('rejects empty password', async () => {
      const res = await request(app)
        .post('/api/login')
        .send({ username: 'admin', password: '' });
      expect([400, 401]).toContain(res.status);
    });
    it('rejects non-existent username', async () => {
      const res = await request(app)
        .post('/api/login')
        .send({ username: 'nonexistent_user_xyz', password: 'pass' });
      expect(res.status).toBe(401);
    });
  });

  describe('Invalid input - malformed / anomaly strings', () => {
    const adminAuth = authHeader('admin');

    it('handles SQL-injection-like string in login username', async () => {
      const res = await request(app)
        .post('/api/login')
        .send({ username: "admin' OR '1'='1", password: 'x' });
      expect(res.status).toBe(401);
    });
    it('handles empty array for add-student usernames', async () => {
      const res = await request(app)
        .put('/api/admin/classrooms/1/add-student')
        .set(adminAuth)
        .send({ usernames: [] });
      expect(res.status).toBe(400);
    });
    it('rejects missing required body for classroom create', async () => {
      const res = await request(app)
        .post('/api/admin/classroom/create')
        .set(adminAuth)
        .send({});
      expect(res.status).toBe(400);
    });
    it('rejects empty className', async () => {
      const res = await request(app)
        .post('/api/admin/classroom/create')
        .set(adminAuth)
        .send({ className: '', plan: 'แผนวิทย์' });
      expect(res.status).toBe(400);
    });
  });
});
