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
});
