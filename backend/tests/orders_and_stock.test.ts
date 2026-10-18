import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/database/pool.js';

describe('3. Orders, Inventory Transactions & Rollback Tests', () => {
  afterAll(async () => {
    await pool.end();
  });

  let staffToken = '';
  let testProductId1 = 0;
  let testProductId2 = 0;

  beforeAll(async () => {
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'staff@quanlybanhang.local',
      password: 'Staff@123456',
    });
    staffToken = loginRes.body.data.token;

    const suffix = Date.now().toString(36);
    // Create 2 test products with known inventory for testing orders
    const p1 = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        sku: `TEST-A-${suffix}`,
        name: 'Sản phẩm Test A',
        salePrice: 100000,
        stockQuantity: 20,
      });
    testProductId1 = p1.body.data.id;

    const p2 = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        sku: `TEST-B-${suffix}`,
        name: 'Sản phẩm Test B',
        salePrice: 200000,
        stockQuantity: 5,
      });
    testProductId2 = p2.body.data.id;
  });

  it('Tạo đơn hàng thành công, tự tính subtotal và total, trừ kho chính xác', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        customerId: 1,
        items: [
          { productId: testProductId1, quantity: 2 }, // 2 * 100,000 = 200,000
          { productId: testProductId2, quantity: 1 }, // 1 * 200,000 = 200,000
        ],
        discountAmount: 30000,
        note: 'Đơn hàng kiểm thử tính tiền',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.subtotal).toBe(400000);
    expect(res.body.data.discountAmount).toBe(30000);
    expect(res.body.data.totalAmount).toBe(370000);

    // Verify inventory deduction in database
    const [p1Rows] = await pool.query<any[]>('SELECT stock_quantity FROM products WHERE id = ?', [testProductId1]);
    expect(p1Rows[0].stock_quantity).toBe(18); // 20 - 2 = 18

    const [p2Rows] = await pool.query<any[]>('SELECT stock_quantity FROM products WHERE id = ?', [testProductId2]);
    expect(p2Rows[0].stock_quantity).toBe(4); // 5 - 1 = 4

    // Verify stock_movements recorded
    const [movRows] = await pool.query<any[]>(
      'SELECT movement_type, quantity FROM stock_movements WHERE reference_code = ?',
      [res.body.data.orderCode]
    );
    expect(movRows.length).toBe(2);
    expect(movRows[0].movement_type).toBe('OUT');
  });

  it('Từ chối tạo đơn khi số lượng vượt quá tồn kho (400 Bad Request)', async () => {
    // Current stock of testProductId2 is 4
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        customerId: 1,
        items: [{ productId: testProductId2, quantity: 10 }], // Requests 10, only 4 left
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('không đủ tồn kho');

    // Stock must remain intact
    const [p2Rows] = await pool.query<any[]>('SELECT stock_quantity FROM products WHERE id = ?', [testProductId2]);
    expect(p2Rows[0].stock_quantity).toBe(4);
  });

  it('Transaction Rollback: Nếu 1 sản phẩm bị lỗi tồn kho, toàn bộ giao dịch phải được rollback', async () => {
    // Current stock: testProductId1 = 18, testProductId2 = 4
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        customerId: 1,
        items: [
          { productId: testProductId1, quantity: 5 }, // valid
          { productId: testProductId2, quantity: 50 }, // exceeds stock!
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);

    // Verify rollback: testProductId1 MUST NOT be deducted!
    const [p1Rows] = await pool.query<any[]>('SELECT stock_quantity FROM products WHERE id = ?', [testProductId1]);
    expect(p1Rows[0].stock_quantity).toBe(18); // Still 18!
  });

  it('Hủy đơn hàng: Phục hồi lại số lượng tồn kho và ghi nhận stock_movement IN', async () => {
    // 1. Create an order with 3 units of testProductId1
    const createRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        customerId: 1,
        items: [{ productId: testProductId1, quantity: 3 }],
      });

    const orderId = createRes.body.data.orderId;
    const orderCode = createRes.body.data.orderCode;

    // Stock was 18 -> now 15
    const [afterCreate] = await pool.query<any[]>('SELECT stock_quantity FROM products WHERE id = ?', [testProductId1]);
    expect(afterCreate[0].stock_quantity).toBe(15);

    // 2. Cancel the order
    const cancelRes = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'CANCELLED' });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.success).toBe(true);

    // 3. Stock restored back to 18!
    const [afterCancel] = await pool.query<any[]>('SELECT stock_quantity FROM products WHERE id = ?', [testProductId1]);
    expect(afterCancel[0].stock_quantity).toBe(18);

    // 4. Verify stock_movements IN created
    const [inMov] = await pool.query<any[]>(
      'SELECT movement_type, quantity FROM stock_movements WHERE reference_code = ? AND movement_type = "IN"',
      [orderCode]
    );
    expect(inMov.length).toBeGreaterThanOrEqual(1);
    expect(inMov[0].quantity).toBe(3);
  });

  it('Quản lý kho thủ công: Nhập kho (IN) và Xuất kho (OUT) đúng quy tắc', async () => {
    // Current stock: testProductId1 = 18
    // Manual Import IN +10
    const inRes = await request(app)
      .post('/api/inventory/movements')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        productId: testProductId1,
        movementType: 'IN',
        quantity: 10,
        note: 'Nhập hàng lô mới',
      });

    expect(inRes.status).toBe(201);
    expect(inRes.body.data.newStock).toBe(28);

    // Manual Export OUT -5
    const outRes = await request(app)
      .post('/api/inventory/movements')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        productId: testProductId1,
        movementType: 'OUT',
        quantity: 5,
        note: 'Xuất mẫu giới thiệu',
      });

    expect(outRes.status).toBe(201);
    expect(outRes.body.data.newStock).toBe(23);

    // Export exceeding stock OUT -100 must fail
    const failOutRes = await request(app)
      .post('/api/inventory/movements')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        productId: testProductId1,
        movementType: 'OUT',
        quantity: 100,
      });

    expect(failOutRes.status).toBe(400);
    expect(failOutRes.body.success).toBe(false);
  });
});
