import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { pool, withTransaction } from '../database/pool.js';
import { AppError } from '../middleware/errorHandler.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { recordAuditLog } from '../utils/audit.js';

export const createMovementSchema = z.object({
  productId: z.number().int().positive('ID sản phẩm không hợp lệ'),
  movementType: z.enum(['IN', 'OUT', 'ADJUSTMENT'], {
    message: 'Loại biến động phải là IN (nhập), OUT (xuất) hoặc ADJUSTMENT (điều chỉnh)',
  }),
  quantity: z.number().int().positive('Số lượng thao tác phải là số nguyên dương'),
  note: z.string().max(255).optional().nullable(),
});

export async function getStockMovements(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.max(1, Math.min(100, Number(req.query.limit || 20)));
    const offset = (page - 1) * limit;

    const productId = req.query.productId ? Number(req.query.productId) : null;
    const movementType = req.query.movementType ? String(req.query.movementType) : '';
    const startDate = req.query.startDate ? String(req.query.startDate) : '';
    const endDate = req.query.endDate ? String(req.query.endDate) : '';

    const conditions: string[] = [];
    const params: any[] = [];

    if (productId) {
      conditions.push('sm.product_id = ?');
      params.push(productId);
    }

    if (movementType) {
      conditions.push('sm.movement_type = ?');
      params.push(movementType);
    }

    if (startDate) {
      conditions.push('DATE(sm.created_at) >= ?');
      params.push(startDate);
    }

    if (endDate) {
      conditions.push('DATE(sm.created_at) <= ?');
      params.push(endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countRows] = await pool.query<any[]>(
      `SELECT COUNT(*) as total FROM stock_movements sm ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    const [rows] = await pool.query<any[]>(
      `SELECT sm.id, sm.product_id as productId, p.sku as productSku, p.name as productName,
              sm.user_id as userId, u.full_name as userName,
              sm.movement_type as movementType, sm.quantity,
              sm.reference_code as referenceCode, sm.note, sm.created_at as createdAt
       FROM stock_movements sm
       JOIN products p ON sm.product_id = p.id
       JOIN users u ON sm.user_id = u.id
       ${whereClause}
       ORDER BY sm.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      data: rows.map((r) => ({
        ...r,
        quantity: Number(r.quantity),
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

export async function createStockMovement(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { productId, movementType, quantity, note } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('Chưa xác thực người dùng.', 401);
    }

    const updatedStock = await withTransaction(async (conn) => {
      const [productRows] = await conn.query<any[]>(
        `SELECT id, name, sku, stock_quantity as stockQuantity FROM products WHERE id = ? FOR UPDATE`,
        [productId]
      );

      if (!productRows || productRows.length === 0) {
        throw new AppError('Không tìm thấy sản phẩm.', 404);
      }

      const product = productRows[0];
      let newStock = product.stockQuantity;

      if (movementType === 'IN') {
        newStock += quantity;
      } else if (movementType === 'OUT') {
        if (product.stockQuantity < quantity) {
          throw new AppError(
            `Không thể xuất kho: Số lượng tồn kho hiện tại chỉ còn ${product.stockQuantity}, không đủ để xuất ${quantity}.`,
            400
          );
        }
        newStock -= quantity;
      } else if (movementType === 'ADJUSTMENT') {
        // Direct adjustment: set to quantity
        newStock = quantity;
      }

      await conn.execute('UPDATE products SET stock_quantity = ? WHERE id = ?', [newStock, productId]);

      const refCode = `KHO-${Date.now().toString(36).toUpperCase()}`;

      await conn.execute(
        `INSERT INTO stock_movements (product_id, user_id, movement_type, quantity, reference_code, note)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [productId, userId, movementType, quantity, refCode, note ? note.trim() : `Thao tác kho: ${movementType}`]
      );

      await recordAuditLog(
        {
          userId,
          action: `STOCK_${movementType}`,
          entityType: 'products',
          entityId: productId,
          details: { oldStock: product.stockQuantity, newStock, quantity, note },
        },
        conn
      );

      return {
        productId,
        productName: product.name,
        oldStock: product.stockQuantity,
        newStock,
      };
    });

    res.status(201).json({
      success: true,
      message: 'Cập nhật biến động kho thành công.',
      data: updatedStock,
    });
  } catch (error) {
    next(error);
  }
}

export async function getLowStockProducts(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [rows] = await pool.query<any[]>(
      `SELECT p.id, p.sku, p.name, c.name as categoryName, p.sale_price as salePrice, p.stock_quantity as stockQuantity
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.stock_quantity <= 10 AND p.is_active = TRUE
       ORDER BY p.stock_quantity ASC`
    );

    res.json({
      success: true,
      data: rows.map((r) => ({
        ...r,
        salePrice: Number(r.salePrice),
        stockQuantity: Number(r.stockQuantity),
      })),
    });
  } catch (error) {
    next(error);
  }
}

