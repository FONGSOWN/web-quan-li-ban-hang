# Đặc tả REST API (API Specifications)

Hệ thống cung cấp RESTful API với định dạng trao đổi dữ liệu `JSON`. Tất cả các endpoint được tiền tố bởi `/api`.

- Base URL cục bộ: `http://localhost:3000/api`
- Tiêu đề xác thực: `Authorization: Bearer <jwt_token>`

---

## 1. Xác thực & Tài khoản (`/api/auth`)

### 1.1 Đăng nhập
- **Method**: `POST`
- **Endpoint**: `/api/auth/login`
- **Quyền truy cập**: Public (Công khai)
- **Request Body**:
```json
{
  "email": "admin@quanlybanhang.local",
  "password": "Admin@123456"
}
```
- **Response 200 OK**:
```json
{
  "success": true,
  "message": "Đăng nhập thành công.",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "fullName": "Quản Trị Viên",
      "email": "admin@quanlybanhang.local",
      "role": "ADMIN"
    }
  }
}
```
- **Response 401 Unauthorized**:
```json
{
  "success": false,
  "message": "Email hoặc mật khẩu không chính xác."
}
```

### 1.2 Đăng xuất
- **Method**: `POST`
- **Endpoint**: `/api/auth/logout`
- **Quyền truy cập**: Đã đăng nhập (`ADMIN` / `STAFF`)
- **Response 200 OK**:
```json
{
  "success": true,
  "message": "Đăng xuất thành công."
}
```

### 1.3 Lấy thông tin tài khoản hiện tại
- **Method**: `GET`
- **Endpoint**: `/api/auth/me`
- **Quyền truy cập**: Đã đăng nhập (`ADMIN` / `STAFF`)
- **Response 200 OK**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "fullName": "Quản Trị Viên",
    "email": "admin@quanlybanhang.local",
    "role": "ADMIN",
    "isActive": true,
    "createdAt": "2026-10-17T10:00:00.000Z"
  }
}
```

---

## 2. Quản lý người dùng (`/api/users`) — Chỉ dành cho ADMIN

### 2.1 Danh sách người dùng
- **Method**: `GET`
- **Endpoint**: `/api/users`
- **Quyền truy cập**: `ADMIN` (STAFF gọi sẽ nhận `403 Forbidden`)

### 2.2 Tạo người dùng mới
- **Method**: `POST`
- **Endpoint**: `/api/users`
- **Quyền truy cập**: `ADMIN`
- **Request Body**:
```json
{
  "fullName": "Nguyễn Văn B",
  "email": "nhanvien@quanlybanhang.local",
  "password": "Password@123",
  "role": "STAFF"
}
```
- **Response 201 Created**.

### 2.3 Khóa / Kích hoạt tài khoản
- **Method**: `PATCH`
- **Endpoint**: `/api/users/:id/status`
- **Quyền truy cập**: `ADMIN`
- **Request Body**: `{ "isActive": false }`

---

## 3. Sản phẩm & Danh mục

### 3.1 Danh sách sản phẩm
- **Method**: `GET`
- **Endpoint**: `/api/products`
- **Query Params**: `page=1`, `limit=12`, `search=tai+nghe`, `categoryId=1`, `status=active`, `lowStock=true`
- **Response 200 OK**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "sku": "SP-001",
      "name": "Tai nghe Bluetooth Pro",
      "categoryId": 1,
      "categoryName": "Điện tử",
      "costPrice": 380000,
      "salePrice": 590000,
      "stockQuantity": 28,
      "description": "Tai nghe chống ồn chủ động",
      "isActive": true,
      "createdAt": "2026-10-17T10:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 8,
    "page": 1,
    "limit": 12,
    "totalPages": 1
  }
}
```

### 3.2 Thêm sản phẩm
- **Method**: `POST`
- **Endpoint**: `/api/products`
- **Quyền truy cập**: `ADMIN`, `STAFF`
- **Request Body**:
```json
{
  "sku": "SP-009",
  "name": "Chuột Gaming RGB",
  "categoryId": 2,
  "costPrice": 250000,
  "salePrice": 450000,
  "stockQuantity": 15,
  "description": "DPI 16000, switch quang học"
}
```

### 3.3 Đổi trạng thái kinh doanh / Xóa sản phẩm
- **Method**: `PATCH /api/products/:id/status` (Quyền: `ADMIN`)
- **Method**: `DELETE /api/products/:id` (Quyền: `ADMIN` — Tự động chuyển soft-discontinue nếu đã có đơn hàng)

### 3.4 Quản lý danh mục (`/api/categories`)
- `GET /api/categories`: Lấy danh sách kèm số lượng sản phẩm liên kết (`product_count`).
- `POST /api/categories`: Tạo danh mục mới (`{ "name": "...", "description": "..." }`).
- `PUT /api/categories/:id`: Sửa thông tin danh mục (`ADMIN`).
- `DELETE /api/categories/:id`: Xóa danh mục (`ADMIN`, từ chối nếu có sản phẩm).

---

## 4. Khách hàng (`/api/customers`)

- `GET /api/customers?page=1&limit=15&search=0901`: Lấy danh sách kèm tổng đơn đã mua và tổng chi tiêu.
- `GET /api/customers/:id`: Lấy chi tiết hồ sơ kèm lịch sử các đơn hàng gần nhất (`orderHistory`).
- `POST /api/customers`: Thêm khách hàng mới (`{ "fullName": "...", "phone": "0901234567", "email": "...", "address": "..." }`).
- `PUT /api/customers/:id`: Cập nhật thông tin khách hàng.

---

## 5. Đơn hàng & Bán hàng (`/api/orders`)

### 5.1 Tạo đơn hàng (POS Checkout)
- **Method**: `POST`
- **Endpoint**: `/api/orders`
- **Request Body**:
```json
{
  "customerId": 1,
  "items": [
    { "productId": 1, "quantity": 2, "unitPrice": 590000 },
    { "productId": 3, "quantity": 1, "unitPrice": 320000 }
  ],
  "discountAmount": 20000,
  "note": "Giao hàng buổi chiều"
}
```
- **Xử lý Backend**: Mở Transaction nguyên tử, khóa dòng sản phẩm với `FOR UPDATE`, kiểm tra tồn kho, trừ kho, tạo `stock_movements`, lưu snapshot và commit.
- **Response 201 Created**:
```json
{
  "success": true,
  "message": "Tạo đơn hàng thành công và đã cập nhật tồn kho.",
  "data": {
    "orderId": 6,
    "orderCode": "DH-261017-4821",
    "subtotal": 1500000,
    "discountAmount": 20000,
    "totalAmount": 1480000
  }
}
```

### 5.2 Hủy đơn hàng (Hoàn kho)
- **Method**: `PATCH`
- **Endpoint**: `/api/orders/:id/status`
- **Request Body**: `{ "status": "CANCELLED" }`
- **Xử lý**: Tự động hoàn trả tồn kho cho tất cả sản phẩm trong đơn và ghi `stock_movements` loại `IN`.

---

## 6. Quản lý kho (`/api/inventory`)

- `GET /api/inventory/movements`: Xem lịch sử biến động kho (loại `IN`, `OUT`, `ADJUSTMENT`).
- `POST /api/inventory/movements`: Thao tác kho thủ công:
```json
{
  "productId": 1,
  "movementType": "IN",
  "quantity": 10,
  "note": "Nhập hàng từ nhà cung cấp"
}
```
- `GET /api/inventory/low-stock`: Danh sách các sản phẩm có tồn kho an toàn dưới 10 chiếc.

---

## 7. Báo cáo & Xuất dữ liệu (`/api/reports`)

### 7.1 Thống kê tổng quan Dashboard
- **Method**: `GET`
- **Endpoint**: `/api/reports/dashboard`
- **Response 200 OK**:
```json
{
  "success": true,
  "data": {
    "revenue": {
      "totalRevenue": 2405000,
      "totalOrders": 5,
      "completedOrders": 3,
      "pendingOrders": 1,
      "cancelledOrders": 1
    },
    "inventory": { "totalProducts": 8, "lowStockCount": 3 },
    "customers": { "totalCustomers": 5 },
    "topSellingProducts": [ ... ],
    "recentOrders": [ ... ],
    "trend": [ ... ]
  }
}
```

### 7.2 Xuất báo cáo CSV
- **Method**: `GET`
- **Endpoint**: `/api/reports/export-csv`
- **Response**: File định dạng `text/csv; charset=utf-8` đính kèm ký tự UTF-8 BOM `\uFEFF`, đảm bảo mở tiếng Việt có dấu hoàn hảo trên Excel.

