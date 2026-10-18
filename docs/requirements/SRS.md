# Đặc tả yêu cầu phần mềm (Software Requirements Specification - SRS)

## 1. Giới thiệu tổng quan
Dự án **QuanLyBanHang** là ứng dụng web quản lý bán hàng và tồn kho hoàn chỉnh, phục vụ đồ án môn Công nghệ phần mềm. Hệ thống cung cấp giải pháp chuyển đổi số toàn diện cho các cửa hàng bán lẻ và doanh nghiệp vừa và nhỏ, bao gồm quản lý hàng hóa, khách hàng, giao dịch bán hàng (POS), điều phối biến động kho và phân tích báo cáo doanh thu theo thời gian thực.

## 2. Phạm vi và Giới hạn hệ thống
- **Phạm vi hệ thống**:
  - Quản lý định danh, xác thực và phân quyền người dùng (ADMIN, STAFF).
  - Quản lý danh mục và thông tin chi tiết sản phẩm kèm mã SKU duy nhất.
  - Quản lý thông tin khách hàng, số điện thoại, tích lũy điểm và lịch sử giao dịch.
  - Điểm bán hàng tại quầy (POS): tạo đơn hàng nhiều sản phẩm, tính toán chiết khấu, tự động trừ tồn kho qua Database Transaction nguyên tử.
  - Quản lý kho hàng: nhập kho, xuất kho, điều chỉnh số lượng và ghi nhận lịch sử biến động kho (`stock_movements`).
  - Cảnh báo sản phẩm sắp hết hàng (tồn kho ≤ 10).
  - Báo cáo thống kê doanh thu, biểu đồ xu hướng 7 ngày, xếp hạng sản phẩm bán chạy và xuất file CSV chuẩn UTF-8 BOM.
- **Giới hạn hệ thống**:
  - Phiên bản hiện tại tập trung vận hành tại mạng nội bộ hoặc máy chủ cục bộ (Local / Docker).
  - Chưa tích hợp cổng thanh toán trực tuyến bên thứ ba (VNPay, MoMo) — các đơn hàng hiện tại thanh toán bằng tiền mặt/chuyển khoản tại quầy.

## 3. Đối tượng sử dụng và Phân quyền (RBAC)
Hệ thống thiết lập 2 vai trò người dùng được kiểm soát nghiêm ngặt từ tầng Backend Middleware:
- **Quản trị viên (ADMIN)**:
  - Toàn quyền trên toàn bộ các phân hệ của hệ thống.
  - Quản lý người dùng: tạo tài khoản nhân viên, đổi vai trò, khóa/mở khóa tài khoản.
  - Ngừng kinh doanh hoặc mở bán lại sản phẩm.
  - Xóa sản phẩm và xóa danh mục khi chưa có dữ liệu ràng buộc.
  - Xem và xuất báo cáo tài chính tổng hợp.
- **Nhân viên bán hàng (STAFF)**:
  - Đăng nhập, xem thông tin cá nhân.
  - Tra cứu danh mục, sản phẩm và khách hàng.
  - Thực hiện tạo đơn bán hàng tại quầy (POS) và in hóa đơn.
  - Thêm mới sản phẩm, cập nhật giá bán.
  - Xem danh sách đơn hàng và thực hiện hủy đơn (hoàn kho) khi khách đổi ý.
  - Thực hiện các thao tác nhập/xuất kho thủ công.
  - **Không có quyền**: Truy cập phân hệ quản lý người dùng `/api/users` (trả về lỗi `403 Forbidden`).

## 4. Yêu cầu chức năng (Functional Requirements)
- **FR-01: Xác thực người dùng**: Đăng nhập qua Email/Mật khẩu; mật khẩu băm một chiều bằng `bcryptjs`; phiên làm việc duy trì bằng JWT Token (hạn 7 ngày). Có chức năng đăng xuất và lấy thông tin tài khoản hiện tại (`/api/auth/me`).
- **FR-02: Phân quyền vai trò**: Phân quyền Role-based Access Control (ADMIN / STAFF) được thực thi độc lập tại Backend Middleware, không chỉ ẩn nút bấm trên giao diện.
- **FR-03: Quản lý danh mục**: Thêm, xem, sửa, xóa danh mục. Không cho phép xóa danh mục nếu đang có sản phẩm thuộc danh mục đó.
- **FR-04: Quản lý sản phẩm**: Thêm, xem, sửa, đổi trạng thái (đang bán / ngừng kinh doanh). Kiểm tra mã SKU duy nhất trên toàn hệ thống. Tự động chuyển đổi xóa vật lý sang ngừng kinh doanh nếu sản phẩm đã phát sinh giao dịch.
- **FR-05: Quản lý khách hàng**: Thêm, xem, sửa thông tin khách hàng. Số điện thoại là duy nhất. Xem hồ sơ chi tiết gồm lịch sử mua hàng và tổng số tiền đã chi tiêu tích lũy.
- **FR-06: Điểm bán hàng (POS) & Tạo đơn**: Cho phép chọn nhiều sản phẩm, số lượng, đơn giá và tiền giảm giá. Backend tự động tính toán Subtotal và Total Amount, không tin cậy số liệu tổng tiền gửi lên từ Frontend.
- **FR-07: Tính nhất quán giao dịch (Database Transaction)**: Khi tạo đơn, việc lưu thông tin đơn, lưu snapshot chi tiết sản phẩm, trừ tồn kho và ghi log biến động kho phải diễn ra trong cùng một Transaction. Nếu xảy ra bất kỳ lỗi nào hoặc số lượng vượt quá tồn kho, hệ thống tự động Rollback toàn bộ.
- **FR-08: Chống xung đột đơn hàng đồng thời (Race Condition)**: Sử dụng cơ chế khóa dòng dữ liệu (`SELECT ... FOR UPDATE`) khi đọc và cập nhật tồn kho.
- **FR-09: Hủy đơn hàng**: Cho phép hủy đơn hàng chưa hủy; toàn bộ số lượng sản phẩm được tự động hoàn trả lại vào kho và ghi nhận bản ghi `stock_movements` loại `IN`.
- **FR-10: Quản lý kho hàng**: Hỗ trợ nhập kho (`IN`), xuất kho (`OUT`) và điều chỉnh (`ADJUSTMENT`). Bảng cảnh báo hàng sắp hết lọc nhanh các mặt hàng có tồn kho ≤ 10 sản phẩm.
- **FR-11: Dashboard & Báo cáo**: Hiển thị tổng doanh thu thực nhận, tổng đơn theo trạng thái, số lượng sản phẩm, khách hàng, biểu đồ xu hướng 7 ngày và top 5 sản phẩm bán chạy nhất. **Doanh thu chỉ tính các đơn hàng có trạng thái `COMPLETED`**, hoàn toàn loại trừ các đơn đã hủy.
- **FR-12: Xuất dữ liệu CSV**: Cho phép lọc theo khoảng ngày và tải xuống file CSV chuẩn định dạng Microsoft Excel kèm ký tự UTF-8 BOM, đảm bảo hiển thị đúng dấu tiếng Việt.

## 5. Yêu cầu phi chức năng (Non-Functional Requirements)
- **NFR-01: Giao diện và Trải nghiệm**: Giao diện thiết kế theo phong cách hiện đại, responsive trên Desktop, Tablet và Mobile. Toàn bộ ngôn ngữ hiển thị bằng tiếng Việt tự nhiên và nhất quán.
- **NFR-02: Bảo mật mật khẩu và dữ liệu nhạy cảm**: Mật khẩu được hash với thuật toán `bcrypt` (salt rounds = 10). Mã bí mật JWT (`JWT_SECRET`) và thông tin kết nối database được cấu hình qua biến môi trường `.env`, tuyệt đối không commit lên Git repository.
- **NFR-03: Kiểm soát lỗi và bảo mật API**: Backend xử lý lỗi tập trung, không tiết lộ cấu trúc mã nguồn hoặc stack trace cho client; áp dụng CORS chỉ cho phép origin được cấu hình (`http://localhost:5173`).
- **NFR-04: Tính toàn vẹn số liệu**: Các trường tiền tệ sử dụng kiểu dữ liệu `DECIMAL(12,2)`, không sử dụng kiểu dấu phẩy động `FLOAT` hoặc `DOUBLE` để tránh sai số làm tròn tài chính.
- **NFR-05: Khả năng kiểm thử (Testability)**: Toàn bộ các API quan trọng được bảo vệ bằng bộ kiểm thử tự động Jest & Supertest, chạy độc lập và trả kết quả dưới 5 giây.
