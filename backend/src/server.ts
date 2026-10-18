import { app } from './app.js';
import { config } from './config/env.js';
import { pool } from './database/pool.js';

async function startServer() {
  try {
    // Test database connection
    const conn = await pool.getConnection();
    console.log('✅ Đã kết nối thành công tới cơ sở dữ liệu MySQL!');
    conn.release();

    app.listen(config.port, () => {
      console.log(`🚀 QuanLyBanHang API Server đang chạy tại: http://localhost:${config.port}`);
      console.log(`📡 Health Check: http://localhost:${config.port}/api/health`);
    });
  } catch (error) {
    console.error('❌ Không thể khởi động máy chủ API do lỗi cơ sở dữ liệu:', error);
    process.exit(1);
  }
}

startServer();
