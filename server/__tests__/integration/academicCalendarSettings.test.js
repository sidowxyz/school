import request from 'supertest';
import app from '../../src/server.js';
import User from '../../src/models/User.js';
import Year from '../../src/models/Year.js';
import Term from '../../src/models/Term.js';
import SystemSetting from '../../src/models/SystemSetting.js';
import { generateAccessToken } from '../../src/utils/tokenService.js';

describe('Academic calendar settings', () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const created = {};

  beforeAll(async () => {
    const admin = await User.create({
      firstName: 'Calendar',
      lastName: 'Admin',
      email: `calendar-admin-${suffix}@test.local`,
      password: 'Password123',
      role: 'admin',
    });
    const year = await Year.create({ y_no: `CAL-${suffix}`, y_name: `Calendar Year ${suffix}` });
    const term = await Term.create({
      name: `Calendar Term ${suffix}`,
      academicYearId: year._id,
      startDate: '2035-01-10',
      endDate: '2035-05-30',
      status: 'active',
    });
    Object.assign(created, { admin, year, term, token: generateAccessToken(admin) });
  }, 30000);

  afterAll(async () => {
    if (created.holidayId || created.eventId) {
      await SystemSetting.updateMany({}, {
        $pull: {
          holidays: { _id: created.holidayId },
          calendarEvents: { _id: created.eventId },
        },
      });
    }
    await Term.deleteMany({ _id: created.term?._id });
    await Year.deleteMany({ _id: created.year?._id });
    await User.deleteMany({ _id: created.admin?._id });
  }, 30000);

  it('builds the calendar from real academic structure dates', async () => {
    const response = await request(app)
      .get(`/api/v1/settings/academic-calendar?academicYearId=${created.year._id}`)
      .set('Authorization', `Bearer ${created.token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.selectedAcademicYear._id).toBe(created.year._id.toString());
    expect(response.body.data.sessionStart).toContain('2035-01-10');
    expect(response.body.data.sessionEnd).toContain('2035-05-30');
    expect(response.body.data.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ title: expect.stringContaining('Begins'), type: 'term' }),
      expect.objectContaining({ title: expect.stringContaining('Ends'), type: 'term' }),
    ]));
  });

  it('persists the live school profile, branding colors and discount policy', async () => {
    const updated = await request(app)
      .put('/api/v1/settings')
      .set('Authorization', `Bearer ${created.token}`)
      .send({
        schoolName: `Calendar School ${suffix}`,
        schoolCode: 'CAL-001',
        schoolEmail: `school-${suffix}@test.local`,
        schoolPhone: '0612222222',
        website: 'https://calendar-school.test',
        principalName: 'Calendar Principal',
        timezone: 'Africa/Mogadishu',
        language: 'Somali',
        brandingColors: { primary: '#16A34A', secondary: '#1E3A8A' },
        discountRule: 'combined',
      });

    expect(updated.status).toBe(200);
    expect(updated.body.data).toEqual(expect.objectContaining({
      schoolCode: 'CAL-001', language: 'Somali', discountRule: 'combined',
    }));

    const loaded = await request(app)
      .get('/api/v1/settings')
      .set('Authorization', `Bearer ${created.token}`);
    expect(loaded.status).toBe(200);
    expect(loaded.body.data.schoolName).toContain('Calendar School');
    expect(loaded.body.data.brandingColors.primary).toBe('#16A34A');
  });

  it('creates, edits and deletes a holiday', async () => {
    const added = await request(app)
      .post('/api/v1/settings/holidays')
      .set('Authorization', `Bearer ${created.token}`)
      .send({ name: `Founders Day ${suffix}`, date: '2035-02-01', academicYearId: created.year._id.toString() });

    expect(added.status).toBe(201);
    created.holidayId = added.body.data._id;

    const edited = await request(app)
      .put(`/api/v1/settings/holidays/${created.holidayId}`)
      .set('Authorization', `Bearer ${created.token}`)
      .send({ name: `Updated Founders Day ${suffix}`, date: '2035-02-02', academicYearId: created.year._id.toString() });

    expect(edited.status).toBe(200);
    expect(edited.body.data.name).toContain('Updated Founders Day');

    const deleted = await request(app)
      .delete(`/api/v1/settings/holidays/${created.holidayId}`)
      .set('Authorization', `Bearer ${created.token}`);

    expect(deleted.status).toBe(200);
    created.holidayId = null;
  });

  it('persists school events and returns them in the consolidated calendar', async () => {
    const added = await request(app)
      .post('/api/v1/settings/calendar-events')
      .set('Authorization', `Bearer ${created.token}`)
      .send({ title: `Parents Meeting ${suffix}`, date: '2035-03-05', academicYearId: created.year._id.toString() });

    expect(added.status).toBe(201);
    created.eventId = added.body.data._id;

    const calendar = await request(app)
      .get(`/api/v1/settings/academic-calendar?academicYearId=${created.year._id}`)
      .set('Authorization', `Bearer ${created.token}`);

    expect(calendar.status).toBe(200);
    expect(calendar.body.data.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: created.eventId, title: expect.stringContaining('Parents Meeting'), type: 'event', editable: true }),
    ]));

    const removed = await request(app)
      .delete(`/api/v1/settings/calendar-events/${created.eventId}`)
      .set('Authorization', `Bearer ${created.token}`);
    expect(removed.status).toBe(200);
    created.eventId = null;
  });
});
