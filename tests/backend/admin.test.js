const request = require('supertest');
const app = require('../../backend/app');
const { authHeader } = require('../helpers');

describe('Admin API', () => {
  const adminAuth = authHeader('admin');

  it('GET /api/admin/get-teachers requires auth', async () => {
    const res = await request(app).get('/api/admin/get-teachers');
    expect(res.status).toBe(401);
  });
  it('GET /api/admin/get-teachers returns list', async () => {
    const res = await request(app).get('/api/admin/get-teachers').set(adminAuth);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
  it('GET /api/admin/classrooms returns list', async () => {
    const res = await request(app).get('/api/admin/classrooms').set(adminAuth);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
  it('POST /api/admin/classroom/create creates classroom', async () => {
    const res = await request(app).post('/api/admin/classroom/create').set(adminAuth).send({ className: 'ม.6/2', plan: 'แผนวิทย์' });
    expect(res.status).toBe(200);
    expect(res.body.classID).toBeDefined();
  });
  it('POST /api/admin/classroom/create rejects missing className', async () => {
    const res = await request(app).post('/api/admin/classroom/create').set(adminAuth).send({ plan: 'แผนวิทย์' });
    expect(res.status).toBe(400);
  });
  it('GET /api/admin/announcements returns list', async () => {
    const res = await request(app).get('/api/admin/announcements').set(adminAuth);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
  it('POST /api/admin/announcement/add creates announcement', async () => {
    const res = await request(app).post('/api/admin/announcement/add').set(adminAuth).send({ title: 'Test', content: 'Test', category: 'GENERAL', targetRole: 'ALL' });
    expect(res.status).toBe(200);
  });
  it('PUT /api/admin/teachers/:id updates teacher', async () => {
    const res = await request(app).put('/api/admin/teachers/1').set(adminAuth).send({ email: 'john@test.ac.th', department: 'คณิตศาสตร์' });
    expect(res.status).toBe(200);
  });
  it('PUT /api/admin/students/:id updates student', async () => {
    const res = await request(app).put('/api/admin/students/1').set(adminAuth).send({ first_name: 'Jane', last_name: 'Smith', status: 'STUDYING' });
    expect(res.status).toBe(200);
  });
});
