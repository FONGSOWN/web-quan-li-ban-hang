import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log internal error on server side
  if (process.env.NODE_ENV !== 'test') {
    console.error('Server error:', err);
  }

  // Known AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // Handle MySQL duplicate key (ER_DUP_ENTRY / 1062)
  if (err?.code === 'ER_DUP_ENTRY' || err?.errno === 1062) {
    let msg = 'Dữ liệu đã tồn tại trong hệ thống (trùng lặp).';
    if (err.message.includes('sku')) msg = 'Mã SKU này đã tồn tại trong hệ thống.';
    if (err.message.includes('phone')) msg = 'Số điện thoại này đã được sử dụng.';
    if (err.message.includes('email')) msg = 'Địa chỉ email này đã được sử dụng.';
    if (err.message.includes('order_code')) msg = 'Mã đơn hàng bị trùng lặp, vui lòng thử lại.';
    if (err.message.includes('name')) msg = 'Tên bản ghi đã tồn tại.';

    res.status(409).json({
      success: false,
      message: msg,
    });
    return;
  }

  // Handle MySQL check constraint violation (ER_CHECK_CONSTRAINT_VIOLATED / 3819)
  if (err?.code === 'ER_CHECK_CONSTRAINT_VIOLATED' || err?.errno === 3819) {
    res.status(400).json({
      success: false,
      message: 'Dữ liệu vi phạm ràng buộc số liệu (ví dụ: giá hoặc số lượng không được âm).',
    });
    return;
  }

  // Handle Foreign Key Constraint (ER_ROW_IS_REFERENCED / 1451)
  if (err?.code === 'ER_ROW_IS_REFERENCED' || err?.errno === 1451) {
    res.status(409).json({
      success: false,
      message: 'Không thể xóa bản ghi vì đang có dữ liệu khác liên kết đến.',
    });
    return;
  }

  // General server error - do NOT leak stack traces
  res.status(500).json({
    success: false,
    message: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau hoặc liên hệ quản trị viên.',
  });
}

