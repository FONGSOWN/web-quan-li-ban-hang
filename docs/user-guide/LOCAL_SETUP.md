# Hướng dẫn Cài đặt, Vận hành & Demo Bảo vệ Đồ án

Tài liệu hướng dẫn chi tiết dành cho giảng viên chấm điểm và thành viên nhóm môn Công nghệ phần mềm.

---

## 1. Yêu cầu môi trường phát triển
- **Hệ điều hành**: Windows 10 / Windows 11 (hoặc macOS / Linux).
- **Node.js**: Phiên bản LTS v20.x hoặc v22.x (đã kiểm thử thành công trên Node.js v22.20.0).
- **Docker Desktop**: Cài đặt và bật sẵn Docker Desktop để chạy MySQL 8.
- **Trình duyệt**: Google Chrome, Microsoft Edge hoặc Firefox.

---

## 2. Hướng dẫn cài đặt và khởi chạy từ đầu (PowerShell)

Mở **Windows PowerShell** tại thư mục dự án `D:\QuanLyBanHang` và thực hiện lần lượt các lệnh:

### Bước 1: Thiết lập cấu hình môi trường (.env)
```powershell
Copy-Item .env.example .env
Copy-Item .env.example backend\.env
Copy-Item frontend\.env.example frontend\.env -ErrorAction SilentlyContinue
```

### Bước 2: Khởi động cơ sở dữ liệu MySQL 8 bằng Docker
```powershell
docker compose up -d mysql
```
> **Lưu ý**: Đợi khoảng 10-15 giây để container MySQL khởi tạo hoàn tất (trạng thái `healthy`). Bạn có thể kiểm tra trạng thái bằng lệnh:
```powershell
docker ps
```

### Bước 3: Cài đặt thư viện dependencies cho toàn dự án
```powershell
npm install
npm run install:all
```

### Bước 4: Chạy Migration khởi tạo cấu trúc bảng dữ liệu
```powershell
npm run db:migrate
```
*(Lệnh này tự động tạo 9 bảng quan hệ, các chỉ mục Index và ràng buộc khóa ngoại)*

### Bước 5: Nạp dữ liệu mẫu thực tế (Seed Database)
```powershell
npm run db:seed
```
*(Nạp đầy đủ vai trò, danh mục, sản phẩm, khách hàng, đơn hàng mẫu và biến động kho)*

### Bước 6: Khởi chạy đồng thời Backend API và Frontend
```powershell
npm run dev
```

Sau khi chạy lệnh:
- **Giao diện Quản Lý (Frontend)**: Mở trình duyệt truy cập [http://localhost:5173](http://localhost:5173)
- **API Health Check**: Truy cập [http://localhost:3000/api/health](http://localhost:3000/api/health)

---

## 3. Tài khoản đăng nhập hệ thống

Hệ thống đã được nạp sẵn 2 tài khoản mẫu phục vụ kiểm thử và thuyết trình:

| Vai trò | Email đăng nhập | Mật khẩu | Quyền hạn chính |
|---|---|---|---|
| **Quản trị viên (ADMIN)** | `admin@quanlybanhang.local` | `Admin@123456` | Toàn quyền hệ thống, quản lý người dùng, xem doanh thu, xóa/ngừng bán sản phẩm |
| **Nhân viên (STAFF)** | `staff@quanlybanhang.local` | `Staff@123456` | Bán hàng POS, xem đơn, thêm sản phẩm, nhập/xuất kho (không thể vào trang Quản lý người dùng) |

> Trên màn hình đăng nhập có sẵn 2 nút bấm nhanh **"👑 Quản trị (Admin)"** và **"👤 Nhân viên (Staff)"** để tự động điền thông tin đăng nhập trong 1 click.

---

## 4. Chạy kiểm thử tự động (Automated Testing)

Để chạy bộ kiểm thử tự động gồm 22 ca test tích hợp API và Transaction cơ sở dữ liệu:
```powershell
npm test
```
Kết quả kiểm thử trả về trong ~4 giây với **22/22 ca test đạt chuẩn PASS (100%)**.

---

## 5. Kịch bản Demo bảo vệ đồ án trước Hội đồng chấm thi

Dưới đây là kịch bản chuẩn từng bước giúp nhóm ghi điểm tối đa khi demo:

### Phần 1: Tổng quan kiến trúc & Đăng nhập phân quyền (2 phút)
1. Mở trang đăng nhập `http://localhost:5173`.
2. Bấm nút **"👤 Nhân viên (Staff)"** và đăng nhập.
3. Cho hội đồng thấy menu bên trái không có mục **"Người dùng"** (do tài khoản là Staff).
4. Mở tab DevTools Network, chứng minh nếu gọi API `/api/users` thì Backend sẽ từ chối trả về `403 Forbidden`.

### Phần 2: Thực hiện Bán hàng tại quầy (POS) & Trừ tồn kho (3 phút)
1. Bấm vào menu **"Bán hàng (POS)"**.
2. Chọn khách hàng "Nguyễn Minh Anh", thêm 2 sản phẩm vào giỏ (ví dụ: *Tai nghe Bluetooth Pro* và *Balo laptop Urban*).
3. Nhập giảm giá 20.000 VNĐ. Quan sát tổng tiền được tính tự động.
4. Bấm **"Xác nhận tạo đơn & Trừ kho"**.
5. Chuyển sang menu **"Quản lý kho"** -> **"Lịch sử biến động kho"**: Chỉ ra dòng biến động loại `OUT` vừa được sinh ra kèm đúng mã đơn hàng.
6. Chuyển sang menu **"Sản phẩm"**: Chứng minh số lượng tồn kho của 2 sản phẩm trên đã giảm chính xác.

### Phần 3: Chứng minh Transaction Rollback chống bán vượt tồn kho (2 phút)
1. Mở màn hình POS, chọn sản phẩm sắp hết hàng (ví dụ chỉ còn 4 chiếc).
2. Thử nhập số lượng là `10` chiếc.
3. Bấm tạo đơn: Hệ thống báo lỗi rõ ràng *"Sản phẩm không đủ tồn kho"*.
4. Kiểm tra lại kho: Tồn kho vẫn giữ nguyên 4 chiếc, không có đơn hàng rác nào được lưu vào database.

### Phần 4: Quy trình Hủy đơn hàng và Tự động hoàn kho (2 phút)
1. Mở menu **"Đơn hàng"**, bấm vào đơn hàng vừa tạo ở Phần 2.
2. Bấm nút **"Hủy đơn & Hoàn kho"**, xác nhận hộp thoại.
3. Kiểm tra lại menu **"Sản phẩm"**: Số lượng tồn kho của các mặt hàng đã được cộng hoàn trả lại ngay lập tức.
4. Kiểm tra **"Lịch sử biến động kho"**: Xuất hiện các dòng biến động loại `IN` với ghi chú *"Hoàn kho do hủy đơn..."*.

### Phần 5: Phân hệ Quản trị viên, Báo cáo & Xuất file CSV (3 phút)
1. Đăng xuất tài khoản Staff, đăng nhập vào bằng tài khoản **"👑 Quản trị (Admin)"**.
2. Menu xuất hiện thêm mục **"Người dùng"**: Mở màn hình này để chứng minh chức năng tạo tài khoản nhân viên mới và khóa tài khoản.
3. Mở menu **"Báo cáo"**:
   - Chỉ ra tổng doanh thu: Giải thích rõ **doanh thu chỉ tính các đơn Hoàn thành**, đơn vừa hủy ở Phần 4 đã được tự động loại bỏ.
   - Bấm nút **"Xuất file CSV (Excel UTF-8)"**: Mở file `.csv` vừa tải về trên Microsoft Excel, chứng minh toàn bộ tiếng Việt hiển thị rõ ràng, không bị lỗi font hay mã hóa nhờ cơ chế `\uFEFF BOM`.

### Phần 6: Minh chứng Kiểm thử tự động (1 phút)
1. Mở terminal, chạy lệnh `npm test`.
2. Cho hội đồng thấy 22/22 ca test (xác thực, validation, transaction rollback, hủy đơn, báo cáo) đều PASS 100%.

---

## 6. Xử lý sự cố thường gặp (Troubleshooting)

- **Cổng 3306 bị chiếm dụng (Port already in use)**:
  - Nếu máy bạn đã cài sẵn MySQL cục bộ ở Windows Service, hãy tạm dừng service đó bằng lệnh:
    `Stop-Service -Name MySQL80` hoặc `Stop-Service -Name MySQL`.
  - Hoặc sửa cổng trong file `docker-compose.yml` thành `"3307:3306"` và cập nhật `DB_PORT=3307` trong `.env`.
- **Lỗi không kết nối được Docker daemon**:
  - Đảm bảo ứng dụng **Docker Desktop** đã được mở và biểu tượng cá voi ở khay hệ thống hiển thị trạng thái "Engine running" (màu xanh lá).
- **Cần tạo lại toàn bộ dữ liệu mẫu từ đầu**:
  - Chạy lại lệnh:
    ```powershell
    npm run db:migrate
    npm run db:seed
    ```
