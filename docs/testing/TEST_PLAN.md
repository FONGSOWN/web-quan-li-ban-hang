# Kế hoạch & Kết quả Kiểm thử (Test Plan & Execution Results)

## 1. Mục tiêu và Phạm vi kiểm thử
- **Mục tiêu**: Đảm bảo tất cả các quy tắc nghiệp vụ, tính toàn vẹn dữ liệu, kiểm soát phân quyền (RBAC), tính nhất quán của Transaction kho và khả năng xuất báo cáo hoạt động chính xác 100% trước khi triển khai.
- **Phạm vi kiểm thử**:
  - Tầng dịch vụ và API Backend (Jest + Supertest).
  - Tầng cơ sở dữ liệu MySQL 8 (InnoDB Transactions & Constraints).
  - Tầng giao diện người dùng React (Form Validation & User Flow).

## 2. Kết quả kiểm thử tự động thực tế (Actual Test Execution)
- **Công cụ thực thi**: `Jest v29.7.0` + `Supertest v7.0.0` + `ts-jest`
- **Môi trường thực thi**: Node.js v22.20.0, Windows 11, MySQL 8.4 Docker Container
- **Lệnh thực thi**: `npm test` (hoặc `npm --prefix backend test`)
- **Kết quả tổng thể**: **4/4 Test Suites PASS, 22/22 Tests PASS (100%), Thời gian chạy: 3.71s**.

```
PASS tests/orders_and_stock.test.ts
PASS tests/reports_and_csv.test.ts
PASS tests/validation.test.ts
PASS tests/auth.test.ts

Test Suites: 4 passed, 4 total
Tests:       22 passed, 22 total
Snapshots:   0 total
Time:        3.71 s
```

---

## 3. Bảng chi tiết kết quả từng Ca kiểm thử (Test Cases)

| Mã ca test | Phân hệ kiểm thử | Kịch bản kiểm thử | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
|---|---|---|---|---|:---:|
| **TC-01** | Xác thực | Đăng nhập với tài khoản ADMIN hợp lệ | HTTP 200, trả JWT Token, role ADMIN | Nhận 200, token hợp lệ | **PASS** |
| **TC-02** | Xác thực | Đăng nhập với tài khoản STAFF hợp lệ | HTTP 200, trả JWT Token, role STAFF | Nhận 200, token hợp lệ | **PASS** |
| **TC-03** | Xác thực | Đăng nhập sai mật khẩu | HTTP 401 Unauthorized | Nhận 401, không tiết lộ mật khẩu | **PASS** |
| **TC-04** | Xác thực | Đăng nhập email không tồn tại | HTTP 401 Unauthorized | Nhận 401, thông báo bảo mật | **PASS** |
| **TC-05** | Xác thực | Gọi `/api/auth/me` với Bearer Token | HTTP 200, trả thông tin profile | Nhận 200, đúng user | **PASS** |
| **TC-06** | Xác thực | Gọi `/api/auth/me` không có Token | HTTP 401 Unauthorized | Nhận 401, từ chối truy cập | **PASS** |
| **TC-07** | Phân quyền | ADMIN gọi `/api/users` (quản lý người dùng) | HTTP 200, trả danh sách tài khoản | Nhận 200, danh sách users | **PASS** |
| **TC-08** | Phân quyền | STAFF gọi `/api/users` (quản lý người dùng) | HTTP 403 Forbidden | Nhận 403 Forbidden | **PASS** |
| **TC-09** | Validation | Thêm sản phẩm có mã SKU đã tồn tại | HTTP 409 Conflict, báo trùng SKU | Nhận 409 Conflict | **PASS** |
| **TC-10** | Validation | Thêm sản phẩm có giá bán âm (`salePrice < 0`) | HTTP 400 Bad Request | Nhận 400 Bad Request | **PASS** |
| **TC-11** | Validation | Thêm sản phẩm có tồn kho âm (`stock < 0`) | HTTP 400 Bad Request | Nhận 400 Bad Request | **PASS** |
| **TC-12** | Validation | Thêm khách hàng có số điện thoại trùng lặp | HTTP 409 Conflict | Nhận 409 Conflict | **PASS** |
| **TC-13** | Validation | Thêm khách hàng có định dạng email sai hoặc SĐT ngắn | HTTP 400 Bad Request (Zod error) | Nhận 400 Bad Request | **PASS** |
| **TC-14** | Đơn hàng & Kho | Tạo đơn hàng hợp lệ nhiều sản phẩm | HTTP 201, tính subtotal, trừ kho đúng | Nhận 201, kho trừ chính xác | **PASS** |
| **TC-15** | Đơn hàng & Kho | Tạo đơn có số lượng vượt quá tồn kho hiện tại | HTTP 400, từ chối, kho không đổi | Nhận 400, kho nguyên vẹn | **PASS** |
| **TC-16** | Đơn hàng & Kho | **Rollback Transaction**: 1 sản phẩm đủ, 1 sản phẩm vượt tồn | Rollback toàn bộ, không trừ sản phẩm hợp lệ | Nhận 400, rollback hoàn tất | **PASS** |
| **TC-17** | Đơn hàng & Kho | **Hủy đơn hàng**: Cập nhật trạng thái CANCELLED | Phục hồi lại số lượng vào kho, ghi log `IN` | Nhận 200, kho được cộng lại | **PASS** |
| **TC-18** | Quản lý kho | Thao tác kho thủ công loại Nhập kho (`IN`) | Tăng số lượng tồn kho tương ứng | Nhận 201, kho tăng | **PASS** |
| **TC-19** | Quản lý kho | Thao tác kho thủ công loại Xuất kho (`OUT`) | Giảm số lượng; chặn xuất âm | Nhận 201, chặn xuất âm 400 | **PASS** |
| **TC-20** | Báo cáo | Thống kê Dashboard loại trừ đơn hủy khỏi doanh thu | `totalRevenue` khớp với SUM(total) đơn COMPLETED | Nhận 200, loại trừ đơn hủy | **PASS** |
| **TC-21** | Tìm kiếm | Tìm kiếm sản phẩm theo tên/SKU và phân trang | Trả danh sách khớp và metadata pagination | Nhận 200, phân trang chuẩn | **PASS** |
| **TC-22** | Xuất dữ liệu | Xuất báo cáo đơn hàng định dạng CSV | File CSV tải về có UTF-8 BOM, đúng tiếng Việt | Nhận 200, có UTF-8 BOM `\uFEFF` | **PASS** |

---

## 4. Hướng dẫn chạy lại toàn bộ bài kiểm thử
Tại thư mục gốc dự án, thành viên nhóm chạy lệnh PowerShell:
```powershell
npm test
```
Hoặc chạy trực tiếp từ thư mục `backend/`:
```powershell
npm --prefix backend test
```
Tất cả các ca kiểm thử sẽ được nạp và chạy trực tiếp trên cơ sở dữ liệu MySQL, đảm bảo tính xác thực 100% của báo cáo kiểm thử.
