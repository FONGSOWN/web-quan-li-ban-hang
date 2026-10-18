import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { pool } from '../database/pool.js';
import { AppError } from '../middleware/errorHandler.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { recordAuditLog } from '../utils/audit.js';

export const categorySchema = z.object({
  name: z.string().min(1, 'Tên danh mục không được để trống').max(100, 'Tối đa 100 ký tự'),
  description: z.string().max(255).optional().nullable(),
});

export async function getCategories(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [rows] = await pool.query<any[]>(
      `SELECT c.id, c.name, c.description, COUNT(p.id) as product_count
       FROM categories c
       LEFT JOIN products p ON c.id = p.category_id AND p.is_active = TRUE
       GROUP BY c.id, c.name, c.description
       ORDER BY c.id ASC`
    );

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    next(error);
  }
}

export async function createCategory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, description } = req.body;

    const [result] = await pool.execute<any>(
      'INSERT INTO categories (name, description) VALUES (?, ?)',
      [name.trim(), description ? description.trim() : null]
    );

    await recordAuditLog({
      userId: req.user?.userId,
      action: 'CREATE_CATEGORY',
      entityType: 'categories',
      entityId: result.insertId,
      details: { name },
    });

    res.status(201).json({
      success: true,
      message: 'Tạo danh mục thành công.',
      data: {
        id: result.insertId,
        name: name.trim(),
        description: description ? description.trim() : null,
        product_count: 0,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateCategory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);
    const { name, description } = req.body;

    const [result] = await pool.execute<any>(
      'UPDATE categories SET name = ?, description = ? WHERE id = ?',
      [name.trim(), description ? description.trim() : null, id]
    );

    if (result.affectedRows === 0) {
      throw new AppError('Không tìm thấy danh mục.', 404);
    }

    await recordAuditLog({
      userId: req.user?.userId,
      action: 'UPDATE_CATEGORY',
      entityType: 'categories',
      entityId: id,
      details: { name },
    });

    res.json({
      success: true,
      message: 'Cập nhật danh mục thành công.',
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteCategory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);

    // Check if products exist in this category
    const [prodRows] = await pool.query<any[]>(
      'SELECT COUNT(*) as count FROM products WHERE category_id = ?',
      [id]
    );

    if (prodRows[0].count > 0) {
      throw new AppError(
        `Không thể xóa danh mục này vì đang có ${prodRows[0].count} sản phẩm thuộc danh mục.`,
        400
      );
    }

    const [result] = await pool.execute<any>('DELETE FROM categories WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      throw new AppError('Không tìm thấy danh mục để xóa.', 404);
    }

    await recordAuditLog({
      userId: req.user?.userId,
      action: 'DELETE_CATEGORY',
      entityType: 'categories',
      entityId: id,
    });

    res.json({
      success: true,
      message: 'Đã xóa danh mục thành công.',
    });
  } catch (error) {
    next(error);
  }
}

