const request = require('supertest');
const app = require('../../backend/app');
const { authHeader } = require('../helpers');

describe('Me API', () => {
  it('GET /api/me/admin requires auth', async () => {
    const res = await request(app).get('/api/me/admin');
    expect(res.status).toBe(401);
  });
  it('GET /api/me/admin returns profile', async () => {
    const res = await request(app).get('/api/me/admin').set(authHeader('admin'));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
  it('GET /api/me/teacher returns 403 for non-teacher', async () => {
    const res = await request(app).get('/api/me/teacher').set(authHeader('admin'));
    expect(res.status).toBe(403);
  });
  it('GET /api/me/teacher returns profile', async () => {
    const res = await request(app).get('/api/me/teacher').set(authHeader('teacher'));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
  it('GET /api/me/student returns profile', async () => {
    const res = await request(app).get('/api/me/student').set(authHeader('student'));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
  it('GET /api/me/tickets returns own tickets', async () => {
    const res = await request(app).get('/api/me/tickets').set(authHeader('student'));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
