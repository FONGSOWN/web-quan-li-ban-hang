import { pool } from '../database/pool.js';
import { hashPassword } from '../utils/password.js';

async function createAdmin() {
  const args = process.argv.slice(2);
  const getArg = (name: string) => {
    const found = args.find((a) => a.startsWith(`--${name}=`));
    return found ? found.split('=')[1] : null;
  };

  const email = getArg('email') || process.env.ADMIN_EMAIL || 'admin_init@quanlybanhang.local';
  const password = getArg('password') || process.env.ADMIN_PASSWORD || 'Admin@Secret2026';
  const fullName = getArg('name') || 'Quản Trị Viên Hệ Thống';

  console.log(`🔐 Đang khởi tạo tài khoản quản trị viên: ${email}`);

  const [roleRows] = await pool.query<any[]>('SELECT id FROM roles WHERE name = "ADMIN"');
  if (roleRows.length === 0) {
    console.error('❌ Không tìm thấy vai trò ADMIN trong cơ sở dữ liệu. Vui lòng chạy db:migrate trước.');
    process.exit(1);
  }

  const roleId = roleRows[0].id;
  const hashedPassword = await hashPassword(password);

  await pool.execute(
    `INSERT INTO users (role_id, full_name, email, password_hash, is_active)
     VALUES (?, ?, ?, ?, TRUE)
     ON DUPLICATE KEY UPDATE
       password_hash = VALUES(password_hash),
       full_name = VALUES(full_name),
       is_active = TRUE`,
    [roleId, fullName, email, hashedPassword]
  );

  console.log('✅ Khởi tạo tài khoản ADMIN thành công!');
  console.log(`   Email: ${email}`);
  console.log(`   Mật khẩu: ${password}`);
  await pool.end();
}

createAdmin().catch(async (err) => {
  console.error('❌ Lỗi khởi tạo admin:', err);
  await pool.end();
  process.exit(1);
});

