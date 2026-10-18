# Đặc tả Use Case chi tiết (Use Case Specifications)

Tài liệu đặc tả các use case chính của hệ thống **QuanLyBanHang** phục vụ đồ án Công nghệ phần mềm.

---

## 1. Use Case UC-01: Đăng nhập hệ thống

- **Tác nhân chính**: Quản trị viên (ADMIN), Nhân viên bán hàng (STAFF).
- **Mục tiêu**: Xác thực danh tính người dùng và cấp token JWT cho phiên làm việc.
- **Tiền điều kiện**: Người dùng đã được cấp tài khoản trong hệ thống và tài khoản đang ở trạng thái kích hoạt (`is_active = TRUE`).
- **Hậu điều kiện**: Hệ thống cấp JWT token hợp lệ, lưu token tại client và mở khóa các quyền hạn tương ứng với vai trò.

### Luồng sự kiện chính (Main Flow):
1. Người dùng truy cập website, hệ thống hiển thị màn hình đăng nhập.
2. Người dùng nhập Email và Mật khẩu, sau đó nhấn "Đăng nhập hệ thống".
3. Frontend gửi yêu cầu `POST /api/auth/login` tới Backend.
4. Backend kiểm tra sự tồn tại của Email trong cơ sở dữ liệu.
5. Backend xác thực trạng thái kích hoạt của tài khoản.
6. Backend so khớp mật khẩu bằng thư viện `bcryptjs` với chuỗi hash được lưu trong bảng `users`.
7. Backend tạo JWT token chứa `{ userId, email, role, fullName }` có thời hạn 7 ngày.
8. Backend ghi nhật ký `audit_logs` (hành động: `LOGIN`).
9. Backend trả về mã trạng thái `200 OK` kèm token và thông tin người dùng.
10. Frontend lưu token vào `localStorage`, chuyển hướng người dùng vào Dashboard.

### Các luồng rẽ nhánh (Alternative Flows):
- **A1 — Sai email hoặc mật khẩu**:
  - Tại bước 4 hoặc 6, nếu không tìm thấy email hoặc mật khẩu không khớp, Backend trả về mã lỗi `401 Unauthorized` với thông điệp: "Email hoặc mật khẩu không chính xác."
  - Frontend hiển thị cảnh báo lỗi và giữ lại email trên form.
- **A2 — Tài khoản bị khóa (`is_active = FALSE`)**:
  - Tại bước 5, Backend trả về mã lỗi `403 Forbidden` với thông điệp: "Tài khoản đã bị tạm khóa. Vui lòng liên hệ quản trị viên."
- **A3 — Dữ liệu không đúng định dạng**:
  - Email sai cú pháp hoặc mật khẩu để trống: Zod validator trả về lỗi `400 Bad Request`.

---

## 2. Use Case UC-05: Tạo đơn bán hàng & Cập nhật tồn kho (POS Checkout)

- **Tác nhân chính**: Nhân viên bán hàng (STAFF), Quản trị viên (ADMIN).
- **Mục tiêu**: Lập đơn hàng cho khách, tính toán tiền hàng, xuất hóa đơn và tự động trừ số lượng tồn kho theo giao dịch nguyên tử (Database Transaction).
- **Tiền điều kiện**: Người dùng đã đăng nhập hệ thống; các sản phẩm cần bán đang ở trạng thái kinh doanh (`is_active = TRUE`).
- **Hậu điều kiện**:
  - Đơn hàng mới được ghi nhận vào bảng `orders` với mã đơn `DH-YYMMDD-XXXX`.
  - Chi tiết từng sản phẩm được lưu snapshot vào `order_items`.
  - Tồn kho của từng sản phẩm trong bảng `products` giảm tương ứng.
  - Lịch sử biến động kho loại `OUT` được ghi vào `stock_movements`.
  - Thao tác được ghi vào `audit_logs`.

### Luồng sự kiện chính (Main Flow):
1. Nhân viên mở màn hình Bán hàng (POS).
2. Nhân viên tìm kiếm và chọn các sản phẩm khách muốn mua vào giỏ hàng.
3. Nhân viên điều chỉnh số lượng mua cho từng mặt hàng (hệ thống kiểm tra không vượt quá tồn kho hiện tại).
4. Nhân viên chọn khách hàng có sẵn hoặc để mặc định "Khách vãng lai".
5. Nhân viên nhập số tiền chiết khấu / giảm giá (nếu có) và ghi chú đơn hàng.
6. Hệ thống tự động tính toán tạm tính (Subtotal) và tổng tiền thanh toán (Total Amount).
7. Nhân viên nhấn nút "Xác nhận tạo đơn & Trừ kho".
8. Frontend gửi payload `POST /api/orders` tới Backend.
9. Backend mở Database Transaction:
   - Khóa dòng các bản ghi sản phẩm liên quan bằng `SELECT ... FOR UPDATE` theo thứ tự ID tăng dần để chống deadlock và race condition.
   - Kiểm tra tồn kho của từng sản phẩm.
   - Tự động tính toán lại Subtotal và Total Amount tại Backend (không phụ thuộc vào giá trị client gửi lên).
   - Sinh mã đơn hàng duy nhất `DH-YYMMDD-XXXX`.
   - Thêm bản ghi vào bảng `orders` (trạng thái: `COMPLETED`).
   - Thêm các dòng chi tiết vào bảng `order_items` lưu snapshot tên và đơn giá tại thời điểm bán.
   - Cập nhật giảm `stock_quantity` của từng sản phẩm trong bảng `products`.
   - Thêm bản ghi biến động kho `stock_movements` (loại `OUT`).
   - Ghi nhật ký `audit_logs` (`CREATE_ORDER`).
10. Backend Commit Transaction thành công và trả về mã `201 Created` cùng chi tiết đơn.
11. Frontend hiển thị Toast thông báo thành công, xóa giỏ hàng và chuyển về danh sách đơn hàng.

### Các luồng rẽ nhánh (Alternative Flows):
- **A1 — Số lượng mua vượt quá tồn kho thực tế**:
  - Tại bước 9, nếu bất kỳ sản phẩm nào có `stock_quantity < quantity_yeu_cau`, Backend tự động thực hiện **Rollback toàn bộ Transaction**.
  - Không có đơn hàng nào được tạo, không có sản phẩm nào bị trừ tồn kho.
  - Backend trả về mã lỗi `400 Bad Request` với thông điệp chi tiết: `"Sản phẩm [Tên] không đủ tồn kho (hiện còn X, yêu cầu mua Y)."`.
  - Frontend hiển thị thông báo lỗi để nhân viên điều chỉnh giỏ hàng.
- **A2 — Lỗi hệ thống cơ sở dữ liệu**:
  - Nếu xảy ra lỗi kết nối hoặc vi phạm ràng buộc dữ liệu, Transaction tự động Rollback hoàn toàn và trả về mã `500 Server Error`.

---

## 3. Use Case UC-08: Hủy đơn hàng và Phục hồi tồn kho (Order Cancellation)

- **Tác nhân chính**: Quản trị viên (ADMIN), Nhân viên bán hàng (STAFF).
- **Mục tiêu**: Hủy bỏ đơn hàng đã tạo và hoàn trả lại đầy đủ số lượng sản phẩm vào kho hàng.
- **Tiền điều kiện**: Đơn hàng tồn tại và đang ở trạng thái `COMPLETED` hoặc `PENDING` (chưa bị hủy trước đó).
- **Hậu điều kiện**:
  - Trạng thái đơn đổi sang `CANCELLED`.
  - Tồn kho của các mặt hàng trong đơn được cộng hoàn trả lại trong bảng `products`.
  - Ghi nhận biến động kho loại `IN` (Hoàn kho do hủy đơn) trong `stock_movements`.
  - Doanh thu của đơn bị loại trừ khỏi báo cáo tài chính.

### Luồng sự kiện chính (Main Flow):
1. Người dùng mở danh sách đơn hàng hoặc chi tiết đơn hàng cần hủy.
2. Người dùng nhấn nút "Hủy đơn" (biểu tượng cấm).
3. Hệ thống hiển thị hộp thoại xác nhận cảnh báo hoàn kho.
4. Người dùng bấm "Xác nhận".
5. Frontend gửi yêu cầu `PATCH /api/orders/:id/status` với body `{ status: 'CANCELLED' }`.
6. Backend mở Transaction:
   - Khóa dòng đơn hàng với `FOR UPDATE`.
   - Kiểm tra trạng thái hiện tại; nếu đã là `CANCELLED`, báo lỗi.
   - Truy vấn danh sách `order_items` thuộc đơn hàng.
   - Cộng dồn hoàn trả số lượng (`stock_quantity = stock_quantity + quantity`) cho từng sản phẩm.
   - Ghi bản ghi `stock_movements` (loại `IN`, mã tham chiếu là mã đơn).
   - Cập nhật trạng thái đơn thành `CANCELLED`.
   - Ghi nhật ký `audit_logs` (`CANCEL_ORDER`).
   - Commit Transaction.
7. Backend trả về `200 OK` kèm thông báo thành công.
8. Frontend cập nhật lại giao diện và thông báo cho người dùng.

---

## 4. Use Case UC-02: Quản lý sản phẩm (Product Management)

- **Tác nhân chính**: Quản trị viên (ADMIN), Nhân viên bán hàng (STAFF).
- **Phân quyền**:
  - STAFF: Được xem danh sách, tìm kiếm, lọc, thêm sản phẩm mới và cập nhật thông tin sản phẩm.
  - ADMIN: Toàn quyền, bao gồm ngừng kinh doanh/mở bán lại (`toggle status`) và xóa sản phẩm.
- **Quy tắc nghiệp vụ**:
  - Mã SKU phải là duy nhất trên toàn hệ thống.
  - Giá vốn, giá bán và số lượng tồn kho không được âm.
  - Nếu sản phẩm đã từng phát sinh đơn hàng, thao tác xóa sẽ được hệ thống tự động chuyển đổi thành "Ngừng kinh doanh" để đảm bảo tính toàn vẹn dữ liệu lịch sử kế toán.

---

## 5. Use Case UC-09: Quản lý tài khoản & Phân quyền (User Management)

- **Tác nhân chính**: Quản trị viên (ADMIN).
- **Phân quyền**: Nghiêm cấm STAFF truy cập (Backend trả về `403 Forbidden`).
- **Mục tiêu**: Tạo mới tài khoản nhân viên, phân quyền ADMIN/STAFF, tạm khóa hoặc kích hoạt lại tài khoản.
- **Quy tắc bảo mật**:
  - Mật khẩu khi tạo mới được hash một chiều bằng thuật toán `bcrypt` với muối (salt rounds = 10).
  - Không bao giờ trả về trường `password_hash` trong các phản hồi API.
  - ADMIN không thể tự vô hiệu hóa tài khoản của chính mình để tránh tình huống hệ thống mất quyền quản trị.

