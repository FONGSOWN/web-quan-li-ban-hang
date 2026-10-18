import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/database/pool.js';

describe('1. Authentication & RBAC Tests', () => {
  afterAll(async () => {
    await pool.end();
  });

  let adminToken = '';
  let staffToken = '';

  it('Đăng nhập thành công với tài khoản ADMIN', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'admin@quanlybanhang.local',
      password: 'Admin@123456',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user.role).toBe('ADMIN');
    adminToken = res.body.data.token;
  });

  it('Đăng nhập thành công với tài khoản STAFF', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'staff@quanlybanhang.local',
      password: 'Staff@123456',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe('STAFF');
    staffToken = res.body.data.token;
  });

  it('Từ chối đăng nhập khi sai mật khẩu (401)', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'admin@quanlybanhang.local',
      password: 'WrongPassword123',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('Từ chối đăng nhập khi email không tồn tại (401)', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'nonexistent@quanlybanhang.local',
      password: 'Admin@123456',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('Lấy thông tin tài khoản hiện tại qua /api/auth/me', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('admin@quanlybanhang.local');
  });

  it('Từ chối truy cập /api/auth/me khi không có token (401)', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('Phân quyền: ADMIN có quyền truy cập quản lý người dùng /api/users (200)', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('Phân quyền: STAFF bị từ chối truy cập quản lý người dùng /api/users (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});

