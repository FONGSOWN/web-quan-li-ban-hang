import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { pool } from '../database/pool.js';
import { AppError } from '../middleware/errorHandler.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { recordAuditLog } from '../utils/audit.js';

export const customerSchema = z.object({
  fullName: z.string().min(1, 'Họ tên khách hàng không được để trống').max(120),
  phone: z.string().min(8, 'Số điện thoại tối thiểu 8 chữ số').max(30),
  email: z.string().email('Email không đúng định dạng').optional().nullable().or(z.literal('')),
  address: z.string().max(255).optional().nullable(),
});

export async function getCustomers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.max(1, Math.min(100, Number(req.query.limit || 15)));
    const offset = (page - 1) * limit;
    const search = req.query.search ? String(req.query.search).trim() : '';

    const conditions: string[] = [];
    const params: any[] = [];

    if (search) {
      conditions.push('(c.full_name LIKE ? OR c.phone LIKE ? OR c.email LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countRows] = await pool.query<any[]>(
      `SELECT COUNT(*) as total FROM customers c ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    const [rows] = await pool.query<any[]>(
      `SELECT c.id, c.full_name as fullName, c.phone, c.email, c.address, c.created_at as createdAt,
              COUNT(o.id) as totalOrders,
              COALESCE(SUM(CASE WHEN o.status = 'COMPLETED' THEN o.total_amount ELSE 0 END), 0) as totalSpent
       FROM customers c
       LEFT JOIN orders o ON c.id = o.customer_id
       ${whereClause}
       GROUP BY c.id
       ORDER BY c.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      data: rows.map((r) => ({
        ...r,
        totalOrders: Number(r.totalOrders),
        totalSpent: Number(r.totalSpent),
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getCustomerById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);

    const [customerRows] = await pool.query<any[]>(
      `SELECT c.id, c.full_name as fullName, c.phone, c.email, c.address, c.created_at as createdAt,
              COUNT(o.id) as totalOrders,
              COALESCE(SUM(CASE WHEN o.status = 'COMPLETED' THEN o.total_amount ELSE 0 END), 0) as totalSpent
       FROM customers c
       LEFT JOIN orders o ON c.id = o.customer_id
       WHERE c.id = ?
       GROUP BY c.id`,
      [id]
    );

    if (!customerRows || customerRows.length === 0) {
      throw new AppError('Không tìm thấy thông tin khách hàng.', 404);
    }

    const customer = {
      ...customerRows[0],
      totalOrders: Number(customerRows[0].totalOrders),
      totalSpent: Number(customerRows[0].totalSpent),
    };

    // Customer order history
    const [orderHistory] = await pool.query<any[]>(
      `SELECT o.id, o.order_code as orderCode, o.status, o.total_amount as totalAmount,
              o.created_at as createdAt, u.full_name as createdByName
       FROM orders o
       JOIN users u ON o.created_by = u.id
       WHERE o.customer_id = ?
       ORDER BY o.created_at DESC
       LIMIT 20`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...customer,
        orderHistory: orderHistory.map((o) => ({
          ...o,
          totalAmount: Number(o.totalAmount),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function createCustomer(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { fullName, phone, email, address } = req.body;

    const [existing] = await pool.query<any[]>(
      'SELECT id FROM customers WHERE phone = ?',
      [phone.trim()]
    );

    if (existing.length > 0) {
      throw new AppError(`Số điện thoại "${phone.trim()}" đã được đăng ký cho khách hàng khác.`, 409);
    }

    const [result] = await pool.execute<any>(
      `INSERT INTO customers (full_name, phone, email, address)
       VALUES (?, ?, ?, ?)`,
      [
        fullName.trim(),
        phone.trim(),
        email ? email.trim() : null,
        address ? address.trim() : null,
      ]
    );

    await recordAuditLog({
      userId: req.user?.userId,
      action: 'CREATE_CUSTOMER',
      entityType: 'customers',
      entityId: result.insertId,
      details: { fullName, phone },
    });

    res.status(201).json({
      success: true,
      message: 'Thêm khách hàng thành công.',
      data: {
        id: result.insertId,
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email ? email.trim() : null,
        address: address ? address.trim() : null,
        totalOrders: 0,
        totalSpent: 0,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateCustomer(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);
    const { fullName, phone, email, address } = req.body;

    // Check unique phone for other customers
    const [existing] = await pool.query<any[]>(
      'SELECT id FROM customers WHERE phone = ? AND id != ?',
      [phone.trim(), id]
    );

    if (existing.length > 0) {
      throw new AppError(`Số điện thoại "${phone.trim()}" đã thuộc về khách hàng khác.`, 409);
    }

    const [result] = await pool.execute<any>(
      `UPDATE customers
       SET full_name = ?, phone = ?, email = ?, address = ?
       WHERE id = ?`,
      [
        fullName.trim(),
        phone.trim(),
        email ? email.trim() : null,
        address ? address.trim() : null,
        id,
      ]
    );

    if (result.affectedRows === 0) {
      throw new AppError('Không tìm thấy thông tin khách hàng.', 404);
    }

    await recordAuditLog({
      userId: req.user?.userId,
      action: 'UPDATE_CUSTOMER',
      entityType: 'customers',
      entityId: id,
      details: { fullName, phone },
    });

    res.json({
      success: true,
      message: 'Cập nhật thông tin khách hàng thành công.',
    });
  } catch (error) {
    next(error);
  }
}

