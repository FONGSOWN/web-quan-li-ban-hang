import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/database/pool.js';

describe('4. Reports, Search, Pagination & CSV Export Tests', () => {
  afterAll(async () => {
    await pool.end();
  });

  let staffToken = '';

  beforeAll(async () => {
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'staff@quanlybanhang.local',
      password: 'Staff@123456',
    });
    staffToken = loginRes.body.data.token;
  });

  it('Dashboard API trả về dữ liệu thật từ database và loại trừ đơn đã hủy khỏi doanh thu', async () => {
    const res = await request(app)
      .get('/api/reports/dashboard')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const data = res.body.data;

    expect(data.revenue).toHaveProperty('totalRevenue');
    expect(data.revenue).toHaveProperty('completedOrders');
    expect(data.revenue).toHaveProperty('cancelledOrders');
    expect(data.revenue.totalRevenue).toBeGreaterThan(0);

    // Verify in SQL: totalRevenue matches sum of COMPLETED orders only
    const [sqlSum] = await pool.query<any[]>(
      "SELECT COALESCE(SUM(total_amount), 0) as expectedRevenue FROM orders WHERE status = 'COMPLETED'"
    );
    expect(data.revenue.totalRevenue).toBe(Number(sqlSum[0].expectedRevenue));

    expect(data.inventory).toHaveProperty('totalProducts');
    expect(data.customers).toHaveProperty('totalCustomers');
    expect(Array.isArray(data.topSellingProducts)).toBe(true);
    expect(Array.isArray(data.recentOrders)).toBe(true);
  });

  it('Tìm kiếm sản phẩm theo tên, SKU và phân trang (page, limit)', async () => {
    // Search keyword 'Tai nghe'
    const searchRes = await request(app)
      .get('/api/products?search=Tai+nghe&page=1&limit=5')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(searchRes.status).toBe(200);
    expect(searchRes.body.success).toBe(true);
    expect(searchRes.body.pagination).toBeDefined();
    expect(searchRes.body.pagination.page).toBe(1);
    expect(searchRes.body.pagination.limit).toBe(5);

    for (const item of searchRes.body.data) {
      const match = item.name.toLowerCase().includes('tai nghe') || item.sku.toLowerCase().includes('tai nghe');
      expect(match).toBe(true);
    }
  });

  it('Lọc sản phẩm sắp hết hàng (stock_quantity <= 10)', async () => {
    const lowStockRes = await request(app)
      .get('/api/products?lowStock=true')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(lowStockRes.status).toBe(200);
    for (const item of lowStockRes.body.data) {
      expect(item.stockQuantity).toBeLessThanOrEqual(10);
    }
  });

  it('Xuất báo cáo đơn hàng định dạng CSV kèm UTF-8 BOM cho tiếng Việt', async () => {
    const res = await request(app)
      .get('/api/reports/export-csv')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('attachment');

    const csvText = res.text;
    // Check UTF-8 BOM
    expect(csvText.charCodeAt(0)).toBe(0xfeff);
    // Check Vietnamese headers
    expect(csvText).toContain('Mã đơn hàng');
    expect(csvText).toContain('Khách hàng');
    expect(csvText).toContain('Tổng tiền (VNĐ)');
  });
});

