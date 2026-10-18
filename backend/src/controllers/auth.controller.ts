import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { pool } from '../database/pool.js';
import { comparePassword } from '../utils/password.js';
import { signToken } from '../utils/jwt.js';
import { AppError } from '../middleware/errorHandler.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { recordAuditLog } from '../utils/audit.js';

export const loginSchema = z.object({
  email: z.string().email('Email không đúng định dạng'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;

    const [rows] = await pool.query<any[]>(
      `SELECT u.id, u.full_name, u.email, u.password_hash, u.is_active, r.name as role
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.email = ?`,
      [email]
    );

    if (!rows || rows.length === 0) {
      throw new AppError('Email hoặc mật khẩu không chính xác.', 401);
    }

    const user = rows[0];

    if (!user.is_active) {
      throw new AppError('Tài khoản đã bị tạm khóa. Vui lòng liên hệ quản trị viên.', 403);
    }

    const passwordMatch = await comparePassword(password, user.password_hash);
    if (!passwordMatch) {
      throw new AppError('Email hoặc mật khẩu không chính xác.', 401);
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      fullName: user.full_name,
    });

    await recordAuditLog({
      userId: user.id,
      action: 'LOGIN',
      entityType: 'users',
      entityId: user.id,
      details: { email: user.email },
    });

    res.json({
      success: true,
      message: 'Đăng nhập thành công.',
      data: {
        token,
        user: {
          id: user.id,
          fullName: user.full_name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.user) {
      await recordAuditLog({
        userId: req.user.userId,
        action: 'LOGOUT',
        entityType: 'users',
        entityId: req.user.userId,
      });
    }

    res.json({
      success: true,
      message: 'Đăng xuất thành công.',
    });
  } catch (error) {
    next(error);
  }
}

export async function getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Chưa xác thực.', 401);
    }

    const [rows] = await pool.query<any[]>(
      `SELECT u.id, u.full_name, u.email, u.is_active, u.created_at, r.name as role
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [req.user.userId]
    );

    if (!rows || rows.length === 0) {
      throw new AppError('Không tìm thấy thông tin tài khoản.', 404);
    }

    const user = rows[0];
    res.json({
      success: true,
      data: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        isActive: Boolean(user.is_active),
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
}

