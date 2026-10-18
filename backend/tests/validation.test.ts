import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/database/pool.js';

describe('2. Validation & Business Constraints Tests', () => {
  afterAll(async () => {
    await pool.end();
  });

  let adminToken = '';

  beforeAll(async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'admin@quanlybanhang.local',
      password: 'Admin@123456',
    });
    adminToken = res.body.data.token;
  });

  it('Từ chối tạo sản phẩm khi trùng mã SKU (409 Conflict)', async () => {
    // SP-001 already exists in seed data
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        sku: 'SP-001',
        name: 'Sản phẩm thử nghiệm trùng SKU',
        costPrice: 100000,
        salePrice: 150000,
        stockQuantity: 10,
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('SKU');
  });

  it('Từ chối tạo sản phẩm khi giá bán âm (400 Bad Request)', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        sku: 'SP-NEG-PRICE',
        name: 'Sản phẩm giá âm',
        costPrice: 50000,
        salePrice: -10000,
        stockQuantity: 5,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('Từ chối tạo sản phẩm khi số lượng tồn âm (400 Bad Request)', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        sku: 'SP-NEG-STOCK',
        name: 'Sản phẩm tồn kho âm',
        costPrice: 50000,
        salePrice: 100000,
        stockQuantity: -5,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('Từ chối tạo khách hàng khi trùng số điện thoại (409 Conflict)', async () => {
    // 0901234567 already exists in seed data
    const res = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullName: 'Khách hàng trùng SĐT',
        phone: '0901234567',
        email: 'duplicate@example.com',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('Từ chối tạo khách hàng khi số điện thoại quá ngắn hoặc email sai định dạng (400 Bad Request)', async () => {
    const res = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullName: 'Khách hàng test',
        phone: '123',
        email: 'invalid-email-format',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

