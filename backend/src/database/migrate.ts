import { pool } from './pool.js';

export async function runMigration() {
  console.log('🔄 Đang chạy migration cơ sở dữ liệu...');
  const conn = await pool.getConnection();

  try {
    // 1. roles
    await conn.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(30) NOT NULL UNIQUE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. users
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        role_id BIGINT UNSIGNED NOT NULL,
        full_name VARCHAR(120) NOT NULL,
        email VARCHAR(190) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_users_role (role_id),
        INDEX idx_users_email (email),
        FOREIGN KEY (role_id) REFERENCES roles(id) ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. categories
    await conn.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL UNIQUE,
        description VARCHAR(255) NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. products
    await conn.query(`
      CREATE TABLE IF NOT EXISTS products (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        category_id BIGINT UNSIGNED NULL,
        sku VARCHAR(60) NOT NULL UNIQUE,
        name VARCHAR(180) NOT NULL,
        description TEXT NULL,
        cost_price DECIMAL(12,2) NOT NULL DEFAULT 0,
        sale_price DECIMAL(12,2) NOT NULL,
        stock_quantity INT NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_products_category (category_id),
        INDEX idx_products_sku (sku),
        INDEX idx_products_name (name),
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT chk_product_cost CHECK (cost_price >= 0),
        CONSTRAINT chk_product_sale CHECK (sale_price >= 0),
        CONSTRAINT chk_product_stock CHECK (stock_quantity >= 0)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 5. customers
    await conn.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        full_name VARCHAR(120) NOT NULL,
        phone VARCHAR(30) NOT NULL,
        email VARCHAR(190) NULL,
        address VARCHAR(255) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_customer_phone (phone),
        INDEX idx_customer_name (full_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 6. orders
    await conn.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        order_code VARCHAR(40) NOT NULL UNIQUE,
        customer_id BIGINT UNSIGNED NULL,
        created_by BIGINT UNSIGNED NOT NULL,
        status ENUM('PENDING','COMPLETED','CANCELLED') NOT NULL DEFAULT 'PENDING',
        subtotal DECIMAL(12,2) NOT NULL,
        discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
        total_amount DECIMAL(12,2) NOT NULL,
        note VARCHAR(500) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_orders_customer (customer_id),
        INDEX idx_orders_creator (created_by),
        INDEX idx_orders_status (status),
        INDEX idx_orders_created_at (created_at),
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL ON UPDATE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE CASCADE,
        CONSTRAINT chk_order_subtotal CHECK (subtotal >= 0),
        CONSTRAINT chk_order_discount CHECK (discount_amount >= 0),
        CONSTRAINT chk_order_total CHECK (total_amount >= 0)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 7. order_items
    await conn.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        order_id BIGINT UNSIGNED NOT NULL,
        product_id BIGINT UNSIGNED NOT NULL,
        product_name_snapshot VARCHAR(180) NOT NULL,
        quantity INT NOT NULL,
        unit_price DECIMAL(12,2) NOT NULL,
        line_total DECIMAL(12,2) NOT NULL,
        INDEX idx_order_items_order (order_id),
        INDEX idx_order_items_product (product_id),
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON UPDATE CASCADE,
        CONSTRAINT chk_item_qty CHECK (quantity > 0),
        CONSTRAINT chk_item_price CHECK (unit_price >= 0),
        CONSTRAINT chk_item_line CHECK (line_total >= 0)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 8. stock_movements
    await conn.query(`
      CREATE TABLE IF NOT EXISTS stock_movements (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        product_id BIGINT UNSIGNED NOT NULL,
        user_id BIGINT UNSIGNED NOT NULL,
        movement_type ENUM('IN','OUT','ADJUSTMENT') NOT NULL,
        quantity INT NOT NULL,
        reference_code VARCHAR(60) NULL,
        note VARCHAR(255) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_stock_product (product_id),
        INDEX idx_stock_user (user_id),
        INDEX idx_stock_created_at (created_at),
        FOREIGN KEY (product_id) REFERENCES products(id) ON UPDATE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 9. audit_logs
    await conn.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NULL,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(80) NOT NULL,
        entity_id VARCHAR(80) NULL,
        details JSON NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_audit_user (user_id),
        INDEX idx_audit_entity (entity_type, entity_id),
        INDEX idx_audit_created_at (created_at),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Đảm bảo roles mặc định có mặt
    await conn.query(`
      INSERT INTO roles (name) VALUES ('ADMIN'), ('STAFF')
      ON DUPLICATE KEY UPDATE name=name;
    `);

    console.log('✅ Migration hoàn tất thành công!');
  } finally {
    conn.release();
  }
}

// Chạy trực tiếp từ CLI
runMigration()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('❌ Migration thất bại:', err);
    await pool.end();
    process.exit(1);
  });

