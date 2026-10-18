import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { pool } from '../database/pool.js';
import { hashPassword } from '../utils/password.js';
import { AppError } from '../middleware/errorHandler.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { recordAuditLog } from '../utils/audit.js';

export const createUserSchema = z.object({
  fullName: z.string().min(2, 'Họ tên phải có ít nhất 2 ký tự'),
  email: z.string().email('Email không đúng định dạng'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
  role: z.enum(['ADMIN', 'STAFF'], { message: 'Vai trò phải là ADMIN hoặc STAFF' }),
});

export const toggleUserStatusSchema = z.object({
  isActive: z.boolean(),
});

export async function getUsers(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const [rows] = await pool.query<any[]>(
      `SELECT u.id, u.full_name, u.email, u.is_active, u.created_at, r.name as role
       FROM users u
       JOIN roles r ON u.role_id = r.id
       ORDER BY u.id ASC`
    );

    const users = rows.map((u) => ({
      id: u.id,
      fullName: u.full_name,
      email: u.email,
      role: u.role,
      isActive: Boolean(u.is_active),
      createdAt: u.created_at,
    }));

    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
}

export async function createUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { fullName, email, password, role } = req.body;

    const [roleRows] = await pool.query<any[]>('SELECT id FROM roles WHERE name = ?', [role]);
    if (!roleRows || roleRows.length === 0) {
      throw new AppError('Vai trò không hợp lệ.', 400);
    }
    const roleId = roleRows[0].id;

    const hashedPassword = await hashPassword(password);

    const [result] = await pool.execute<any>(
      `INSERT INTO users (role_id, full_name, email, password_hash, is_active)
       VALUES (?, ?, ?, ?, TRUE)`,
      [roleId, fullName, email, hashedPassword]
    );

    await recordAuditLog({
      userId: req.user?.userId,
      action: 'CREATE_USER',
      entityType: 'users',
      entityId: result.insertId,
      details: { email, role, fullName },
    });

    res.status(201).json({
      success: true,
      message: 'Tạo tài khoản thành công.',
      data: {
        id: result.insertId,
        fullName,
        email,
        role,
        isActive: true,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function toggleUserStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = Number(req.params.id);
    const { isActive } = req.body;

    if (req.user?.userId === userId && !isActive) {
      throw new AppError('Không thể tự vô hiệu hóa tài khoản của chính mình.', 400);
    }

    const [result] = await pool.execute<any>(
      'UPDATE users SET is_active = ? WHERE id = ?',
      [isActive ? 1 : 0, userId]
    );

    if (result.affectedRows === 0) {
      throw new AppError('Không tìm thấy tài khoản người dùng.', 404);
    }

    await recordAuditLog({
      userId: req.user?.userId,
      action: isActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
      entityType: 'users',
      entityId: userId,
    });

    res.json({
      success: true,
      message: isActive ? 'Đã kích hoạt tài khoản.' : 'Đã vô hiệu hóa tài khoản.',
    });
  } catch (error) {
    next(error);
  }
}

