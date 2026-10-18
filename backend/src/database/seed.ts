import { pool, withTransaction } from './pool.js';
import { hashPassword } from '../utils/password.js';

export async function runSeed() {
  console.log('🌱 Đang nạp dữ liệu mẫu (Seed Database)...');

  await withTransaction(async (conn) => {
    // 1. Roles
    await conn.query(`
      INSERT INTO roles (id, name) VALUES (1, 'ADMIN'), (2, 'STAFF')
      ON DUPLICATE KEY UPDATE name=VALUES(name);
    `);

    // 2. Default Users
    const adminPasswordHash = await hashPassword('Admin@123456');
    const staffPasswordHash = await hashPassword('Staff@123456');

    await conn.query(`
      INSERT INTO users (id, role_id, full_name, email, password_hash, is_active)
      VALUES
        (1, 1, 'Quản Trị Viên', 'admin@quanlybanhang.local', ?, TRUE),
        (2, 2, 'Nguyễn Văn Nam (Nhân viên)', 'staff@quanlybanhang.local', ?, TRUE)
      ON DUPLICATE KEY UPDATE
        full_name = VALUES(full_name),
        password_hash = VALUES(password_hash),
        is_active = TRUE;
    `, [adminPasswordHash, staffPasswordHash]);

    // 3. Categories
    await conn.query(`
      INSERT INTO categories (id, name, description)
      VALUES
        (1, 'Điện tử', 'Thiết bị điện tử, âm thanh và phụ kiện số'),
        (2, 'Phụ kiện', 'Phụ kiện máy tính, điện thoại văn phòng'),
        (3, 'Đồ gia dụng', 'Thiết bị thông minh và tiện ích gia đình'),
        (4, 'Thời trang', 'Balo, túi xách và phụ kiện cá nhân')
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        description = VALUES(description);
    `);

    // 4. Products
    const products = [
      { id: 1, catId: 1, sku: 'SP-001', name: 'Tai nghe Bluetooth Pro', cost: 380000, price: 590000, stock: 28, desc: 'Tai nghe chống ồn chủ động, pin 24 giờ.' },
      { id: 2, catId: 3, sku: 'SP-002', name: 'Bình giữ nhiệt Inox 500ml', cost: 110000, price: 185000, stock: 7, desc: 'Giữ nhiệt nóng lạnh 12h, chất liệu Inox 304.' },
      { id: 3, catId: 2, sku: 'SP-003', name: 'Chuột không dây Silent M10', cost: 190000, price: 320000, stock: 46, desc: 'Chuột click không ồn, pin dùng 6 tháng.' },
      { id: 4, catId: 4, sku: 'SP-004', name: 'Balo laptop Urban 15.6 inch', cost: 280000, price: 450000, stock: 5, desc: 'Chống thấm nước, đệm lưng thoáng khí.' },
      { id: 5, catId: 3, sku: 'SP-005', name: 'Đèn bàn LED chống cận', cost: 160000, price: 275000, stock: 19, desc: '3 chế độ sáng bảo vệ mắt, cổng sạc Type-C.' },
      { id: 6, catId: 2, sku: 'SP-006', name: 'Bàn phím cơ Mini RGB', cost: 550000, price: 890000, stock: 4, desc: 'Switch cơ êm ái, đèn LED nhiều chế độ.' },
      { id: 7, catId: 1, sku: 'SP-007', name: 'Loa Bluetooth Bass Mini', cost: 250000, price: 420000, stock: 15, desc: 'Âm thanh vòm 360, chống nước chuẩn IPX5.' },
      { id: 8, catId: 2, sku: 'SP-008', name: 'Cáp sạc nhanh 65W Type-C', cost: 70000, price: 145000, stock: 52, desc: 'Hỗ trợ sạc siêu nhanh PD cho laptop và điện thoại.' },
    ];

    for (const p of products) {
      await conn.query(`
        INSERT INTO products (id, category_id, sku, name, cost_price, sale_price, stock_quantity, description, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)
        ON DUPLICATE KEY UPDATE
          category_id = VALUES(category_id),
          name = VALUES(name),
          cost_price = VALUES(cost_price),
          sale_price = VALUES(sale_price),
          stock_quantity = VALUES(stock_quantity),
          description = VALUES(description),
          is_active = TRUE;
      `, [p.id, p.catId, p.sku, p.name, p.cost, p.price, p.stock, p.desc]);
    }

    // 5. Customers
    const customers = [
      { id: 1, name: 'Nguyễn Minh Anh', phone: '0901234567', email: 'minhanh@example.com', addr: 'Quận 1, TP. Hồ Chí Minh' },
      { id: 2, name: 'Trần Quốc Bảo', phone: '0902345678', email: 'quocbao@example.com', addr: 'Cầu Giấy, TP. Hà Nội' },
      { id: 3, name: 'Lê Thảo Vy', phone: '0903456789', email: 'thaovy@example.com', addr: 'Hải Châu, TP. Đà Nẵng' },
      { id: 4, name: 'Phạm Hoàng Nam', phone: '0904567890', email: 'hoangnam@example.com', addr: 'Ninh Kiều, TP. Cần Thơ' },
      { id: 5, name: 'Đỗ Ngọc Hà', phone: '0905678901', email: 'ngocha@example.com', addr: 'Quận 3, TP. Hồ Chí Minh' },
    ];

    for (const c of customers) {
      await conn.query(`
        INSERT INTO customers (id, full_name, phone, email, address)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          full_name = VALUES(full_name),
          email = VALUES(email),
          address = VALUES(address);
      `, [c.id, c.name, c.phone, c.email, c.addr]);
    }

    // 6. Orders and Order Items
    // Clean old seed demo orders to ensure consistent state
    await conn.query('DELETE FROM order_items WHERE order_id IN (1, 2, 3, 4, 5)');
    await conn.query('DELETE FROM orders WHERE id IN (1, 2, 3, 4, 5)');

    const ordersData = [
      {
        id: 1,
        code: 'DH-261015-1024',
        custId: 1,
        creator: 1,
        status: 'COMPLETED',
        subtotal: 1180000,
        discount: 0,
        total: 1180000,
        note: 'Giao hàng giờ hành chính',
        createdAt: '2026-10-15 09:30:00',
        items: [
          { prodId: 1, name: 'Tai nghe Bluetooth Pro', qty: 2, price: 590000, total: 1180000 },
        ],
      },
      {
        id: 2,
        code: 'DH-261016-1025',
        custId: 2,
        creator: 2,
        status: 'COMPLETED',
        subtotal: 590000,
        discount: 0,
        total: 590000,
        note: 'Khách nhận tại quầy',
        createdAt: '2026-10-16 11:15:00',
        items: [
          { prodId: 1, name: 'Tai nghe Bluetooth Pro', qty: 1, price: 590000, total: 590000 },
        ],
      },
      {
        id: 3,
        code: 'DH-261016-1026',
        custId: 3,
        creator: 2,
        status: 'COMPLETED',
        subtotal: 640000,
        discount: 5000,
        total: 635000,
        note: 'Tặng kèm móc khóa',
        createdAt: '2026-10-16 15:45:00',
        items: [
          { prodId: 3, name: 'Chuột không dây Silent M10', qty: 2, price: 320000, total: 640000 },
        ],
      },
      {
        id: 4,
        code: 'DH-261017-1027',
        custId: 4,
        creator: 1,
        status: 'PENDING',
        subtotal: 450000,
        discount: 0,
        total: 450000,
        note: 'Đang đợi chuyển khoản',
        createdAt: '2026-10-17 10:20:00',
        items: [
          { prodId: 4, name: 'Balo laptop Urban 15.6 inch', qty: 1, price: 450000, total: 450000 },
        ],
      },
      {
        id: 5,
        code: 'DH-261017-1028',
        custId: 5,
        creator: 2,
        status: 'CANCELLED',
        subtotal: 890000,
        discount: 0,
        total: 890000,
        note: 'Khách đổi ý muốn lấy mẫu khác',
        createdAt: '2026-10-17 13:00:00',
        items: [
          { prodId: 6, name: 'Bàn phím cơ Mini RGB', qty: 1, price: 890000, total: 890000 },
        ],
      },
    ];

    for (const o of ordersData) {
      await conn.query(`
        INSERT INTO orders (id, order_code, customer_id, created_by, status, subtotal, discount_amount, total_amount, note, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [o.id, o.code, o.custId, o.creator, o.status, o.subtotal, o.discount, o.total, o.note, o.createdAt]);

      for (const item of o.items) {
        await conn.query(`
          INSERT INTO order_items (order_id, product_id, product_name_snapshot, quantity, unit_price, line_total)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [o.id, item.prodId, item.name, item.qty, item.price, item.total]);

        if (o.status === 'COMPLETED') {
          await conn.query(`
            INSERT INTO stock_movements (product_id, user_id, movement_type, quantity, reference_code, note, created_at)
            VALUES (?, ?, 'OUT', ?, ?, ?, ?)
          `, [item.prodId, o.creator, item.qty, o.code, `Bán hàng theo đơn ${o.code}`, o.createdAt]);
        }
      }
    }

    // 7. Initial stock movements for inventory history
    for (const p of products) {
      await conn.query(`
        INSERT INTO stock_movements (product_id, user_id, movement_type, quantity, reference_code, note, created_at)
        VALUES (?, 1, 'IN', ?, ?, 'Nhập kho ban đầu', '2026-10-10 08:00:00')
      `, [p.id, p.stock + 10, p.sku]);
    }

    // 8. Initial audit logs
    await conn.query(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
      VALUES
        (1, 'SYSTEM_SEED', 'system', '1', '{"message": "Khởi tạo dữ liệu mẫu thành công"}')
    `);

    console.log('✅ Seed dữ liệu mẫu hoàn tất!');
    console.log('----------------------------------------------------');
    console.log('Tài khoản ADMIN: admin@quanlybanhang.local / Admin@123456');
    console.log('Tài khoản STAFF: staff@quanlybanhang.local / Staff@123456');
    console.log('----------------------------------------------------');
  });
}

// Chạy trực tiếp
runSeed()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('❌ Seed thất bại:', err);
    await pool.end();
    process.exit(1);
  });

