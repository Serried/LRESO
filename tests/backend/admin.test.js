const path = require('path');
const request = require('supertest');
const app = require('../../backend/app');
const { authHeader, yt } = require('../helpers');

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

  describe('Teacher creation - same name allowed (unique username)', () => {
    it('POST /api/admin/teachers creates multiple teachers with same name (each gets unique username)', async () => {
      const avatarPath = path.join(__dirname, '../fixtures/avatar.jpg');
      const res1 = await request(app)
        .post('/api/admin/teachers')
        .set(adminAuth)
        .field('first_name', 'Jane')
        .field('last_name', 'Smith')
        .field('email', 'jane.smith1@test.ac.th')
        .attach('avatar', avatarPath);
      expect(res1.status).toBe(200);
      const m1 = res1.body.message.match(/jane\.s\d*/);
      expect(m1).toBeTruthy();
      const res2 = await request(app)
        .post('/api/admin/teachers')
        .set(adminAuth)
        .field('first_name', 'Jane')
        .field('last_name', 'Smith')
        .field('email', 'jane.smith2@test.ac.th')
        .attach('avatar', avatarPath);
      expect(res2.status).toBe(200);
      const m2 = res2.body.message.match(/jane\.s\d*/);
      expect(m2).toBeTruthy();
      expect(m2[0]).not.toBe(m1[0]);
    });
  });

  describe('Schedule - teacher overlap prevention', () => {
    it('PUT /api/admin/classrooms/:classID/schedule rejects same teacher at same day/period in another class', async () => {
      const { year, term } = yt();
      await request(app)
        .post('/api/admin/subjects/add-subject')
        .set(adminAuth)
        .send({ classID: 2, subjectID: 1, teacherID: 1, year, term });
      const res = await request(app)
        .put('/api/admin/classrooms/2/schedule')
        .set(adminAuth)
        .send({
          year,
          term,
          slots: [{ subjectID: 1, teacherID: 1, dayOfWeek: 1, period: 1 }],
        });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/คาบ/);
    });
  });
});
