# QuanLyBanHang — Website Quản Lý Bán Hàng & Tồn Kho (Đồ Án Môn Công Nghệ Phần Mềm)

Hệ thống quản lý bán hàng (Point of Sale), kiểm soát tồn kho và phân tích doanh thu hoàn chỉnh, được xây dựng theo kiến trúc phân lớp chuẩn công nghiệp, đảm bảo tính nguyên tử của giao dịch (ACID Transactions) và phân quyền chặt chẽ (RBAC).

---

## 1. Công nghệ sử dụng
- **Frontend**: React 18, Vite 6, TypeScript, Recharts (Area/Pie Charts), Lucide Icons, Modern SaaS Design System (bảng màu Indigo/Slate, collapsible sidebar, responsive layout).
- **Backend**: Node.js v22 LTS, Express 4, TypeScript, Zod Validation, JWT Authentication, Bcryptjs Password Hashing.
- **Database**: MySQL 8.4 (chạy trên Docker Compose container), MySQL2 Promise Pool với Database Transactions & Row Locking (`FOR UPDATE`).
- **Kiểm thử tự động**: Jest 29, Supertest 7, TS-Jest (22/22 ca test tích hợp đạt chuẩn PASS).
- **Môi trường phát triển**: Windows 11, VS Code, Docker Desktop, PowerShell.

---

## 2. Các phân hệ chức năng chính
1. **Xác thực & Phân quyền**: Đăng nhập bằng Email/Password băm bằng Bcrypt, JWT token 7 ngày, phân quyền 2 vai trò `ADMIN` và `STAFF` được thực thi nghiêm ngặt tại Backend Middleware.
2. **Dashboard Kinh doanh**: Thống kê doanh thu thực tế, số lượng đơn hàng theo trạng thái, sản phẩm đang bán, cảnh báo hàng sắp hết, biểu đồ xu hướng doanh thu 7 ngày và top 5 sản phẩm bán chạy nhất.
3. **Điểm bán hàng (POS Checkout)**: Chọn khách hàng, chọn nhiều sản phẩm vào giỏ hàng, tự động tính tạm tính và chiết khấu. Đơn hàng được xử lý trong **Database Transaction**: khóa dòng sản phẩm, kiểm tra tồn kho, trừ kho và ghi nhận biến động kho.
4. **Quản lý sản phẩm**: Thêm, xem, sửa, ngừng kinh doanh hoặc mở bán lại sản phẩm; kiểm tra mã SKU duy nhất; bảo toàn lịch sử giao dịch khi xóa sản phẩm đã có đơn.
5. **Quản lý danh mục**: Phân loại sản phẩm, đếm số lượng sản phẩm liên kết, bảo vệ ràng buộc khóa ngoại khi xóa.
6. **Quản lý khách hàng**: Quản lý thông tin, số điện thoại duy nhất, tra cứu lịch sử mua hàng chi tiết và tổng chi tiêu tích lũy.
7. **Quản lý đơn hàng**: Danh sách đơn hàng với bộ lọc trạng thái và tìm kiếm. Hỗ trợ **Hủy đơn hàng** với cơ chế tự động hoàn trả số lượng vào tồn kho và ghi log `IN`.
8. **Quản trị tồn kho**: Lịch sử biến động kho (`stock_movements`), thao tác Nhập/Xuất/Điều chỉnh kho thủ công, bảng cảnh báo các mặt hàng có tồn kho ≤ 10 sản phẩm.
9. **Báo cáo & Xuất file CSV**: Thống kê doanh thu (chỉ tính đơn hoàn thành, loại trừ đơn hủy), xuất file `.csv` chuẩn UTF-8 BOM cho Microsoft Excel không bị lỗi font tiếng Việt.
10. **Quản lý người dùng (ADMIN)**: Tạo tài khoản nhân viên, đổi vai trò ADMIN/STAFF, khóa hoặc kích hoạt tài khoản.

---

## 3. Hướng dẫn chạy dự án trên Windows (PowerShell)

### Yêu cầu tiên quyết:
- Đã cài đặt **Node.js 20+** hoặc **Node.js 22 LTS**.
- Đã mở ứng dụng **Docker Desktop** (Engine running).

### Các bước thực thi từ thư mục gốc `D:\QuanLyBanHang`:

```powershell
# 1. Tạo file biến môi trường từ mẫu
Copy-Item .env.example .env
Copy-Item .env.example backend\.env

# 2. Khởi động MySQL 8 container qua Docker
docker compose up -d mysql

# 3. Cài đặt các gói thư viện
npm install
npm run install:all

# 4. Chạy Migration tạo 9 bảng cơ sở dữ liệu
npm run db:migrate

# 5. Nạp dữ liệu mẫu thực tế (Seed)
npm run db:seed

# 6. Khởi chạy đồng thời cả Backend và Frontend
npm run dev
```

Sau khi chạy xong:
- **Frontend Web**: Mở trình duyệt tại [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3000](http://localhost:3000) (Health check: `/api/health`)

---

## 4. Tài khoản Demo kiểm thử

| Vai trò | Email đăng nhập | Mật khẩu | Quyền hạn |
|---|---|---|---|
| **ADMIN** | `admin@quanlybanhang.local` | `Admin@123456` | Toàn quyền, quản lý tài khoản, báo cáo doanh thu, hủy/ngừng bán sản phẩm |
| **STAFF** | `staff@quanlybanhang.local` | `Staff@123456` | Bán hàng POS, xem đơn, thêm sản phẩm, xuất nhập kho |

*(Màn hình đăng nhập có 2 nút bấm nhanh tự động điền tài khoản để demo tiện lợi)*

---

## 5. Chạy kiểm thử tự động (Unit & Integration Tests)

Chạy toàn bộ 22 ca test nghiệp vụ tự động:
```powershell
npm test
```
Kết quả kiểm thử thực tế: **4 Test Suites PASS, 22 Tests PASS (100%), thời gian: ~3.7 giây**.

---

## 6. Cấu trúc thư mục dự án

```
QuanLyBanHang/
├── backend/                  # REST API server (Express + TypeScript + MySQL2)
│   ├── src/
│   │   ├── config/           # Cấu hình biến môi trường
│   │   ├── controllers/      # Bộ điều khiển nghiệp vụ (Auth, Product, Order, v.v.)
│   │   ├── database/         # Pool kết nối, Migrate & Seed scripts
│   │   ├── middleware/       # Auth JWT, RBAC phân quyền, Zod validate, Error handler
│   │   ├── routes/           # Định tuyến API endpoint
│   │   ├── scripts/          # CLI tạo tài khoản Admin an toàn
│   │   ├── utils/            # Bcrypt, JWT, UTF-8 CSV generator, Audit logger
│   │   ├── app.ts            # Khởi tạo Express App
│   │   └── server.ts         # Khởi động máy chủ API
│   ├── tests/                # 4 bộ kiểm thử Jest tự động (Auth, Validation, Orders, Reports)
│   └── package.json
├── frontend/                 # Giao diện người dùng (React + Vite + TypeScript)
│   ├── src/
│   │   ├── api/client.ts     # Client gọi API có gắn Token và xử lý lỗi
│   │   ├── App.tsx           # Ứng dụng Single Page Application với 11 phân hệ
│   │   ├── styles.css        # Hệ thống giao diện responsive tiếng Việt
│   │   └── main.tsx
│   └── package.json
├── database/
│   └── schema.sql            # Bản đặc tả SQL cấu trúc bảng và ràng buộc
├── docs/                     # Tài liệu đồ án Công nghệ phần mềm
│   ├── requirements/         # SRS.md, TEAM_PLAN.md, USE_CASE_SPEC.md
│   ├── uml/                  # Use-case, ERD, Kiến trúc, Activity, Sequence diagrams (.puml)
│   ├── testing/              # Kế hoạch & Kết quả kiểm thử chi tiết (TEST_PLAN.md)
│   ├── api/                  # Đặc tả chi tiết các REST API (API_SPEC.md)
│   └── user-guide/           # Hướng dẫn cài đặt & kịch bản demo bảo vệ đồ án (LOCAL_SETUP.md)
├── docker-compose.yml        # Docker Compose cấu hình MySQL 8.4
├── .env.example              # Mẫu biến môi trường an toàn (không chứa bí mật)
├── .gitignore                # Bỏ qua node_modules, .env, dist, logs
└── package.json              # Script quản lý dev, test, migrate, seed đồng bộ
```
