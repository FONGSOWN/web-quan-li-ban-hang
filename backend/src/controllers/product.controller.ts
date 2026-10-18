import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { pool, withTransaction } from '../database/pool.js';
import { AppError } from '../middleware/errorHandler.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { recordAuditLog } from '../utils/audit.js';

export const createProductSchema = z.object({
  sku: z.string().min(1, 'Mã SKU không được để trống').max(60, 'Mã SKU tối đa 60 ký tự'),
  name: z.string().min(1, 'Tên sản phẩm không được để trống').max(180, 'Tên sản phẩm tối đa 180 ký tự'),
  categoryId: z.number().nullable().optional(),
  costPrice: z.number().min(0, 'Giá vốn không được âm').default(0),
  salePrice: z.number().min(0, 'Giá bán không được âm'),
  stockQuantity: z.number().int().min(0, 'Số lượng tồn kho không được âm').default(0),
  description: z.string().optional().nullable(),
});

export const updateProductSchema = z.object({
  name: z.string().min(1, 'Tên sản phẩm không được để trống').max(180),
  categoryId: z.number().nullable().optional(),
  costPrice: z.number().min(0, 'Giá vốn không được âm'),
  salePrice: z.number().min(0, 'Giá bán không được âm'),
  description: z.string().optional().nullable(),
});

export async function getProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.max(1, Math.min(100, Number(req.query.limit || 15)));
    const offset = (page - 1) * limit;

    const search = req.query.search ? String(req.query.search).trim() : '';
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : null;
    const status = req.query.status ? String(req.query.status) : null; // 'active', 'inactive', 'all'
    const lowStock = req.query.lowStock === 'true';

    const conditions: string[] = [];
    const params: any[] = [];

    if (search) {
      conditions.push('(p.name LIKE ? OR p.sku LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    if (categoryId) {
      conditions.push('p.category_id = ?');
      params.push(categoryId);
    }

    if (status === 'active') {
      conditions.push('p.is_active = TRUE');
    } else if (status === 'inactive') {
      conditions.push('p.is_active = FALSE');
    }

    if (lowStock) {
      conditions.push('p.stock_quantity <= 10');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total count
    const [countRows] = await pool.query<any[]>(
      `SELECT COUNT(*) as total FROM products p ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    // Data query
    const [rows] = await pool.query<any[]>(
      `SELECT p.id, p.sku, p.name, p.category_id as categoryId, c.name as categoryName,
              p.cost_price as costPrice, p.sale_price as salePrice, p.stock_quantity as stockQuantity,
              p.description, p.is_active as isActive, p.created_at as createdAt, p.updated_at as updatedAt
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       ${whereClause}
       ORDER BY p.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      data: rows.map((r) => ({
        ...r,
        isActive: Boolean(r.isActive),
        costPrice: Number(r.costPrice),
        salePrice: Number(r.salePrice),
        stockQuantity: Number(r.stockQuantity),
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

export async function getProductById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);

    const [rows] = await pool.query<any[]>(
      `SELECT p.id, p.sku, p.name, p.category_id as categoryId, c.name as categoryName,
              p.cost_price as costPrice, p.sale_price as salePrice, p.stock_quantity as stockQuantity,
              p.description, p.is_active as isActive, p.created_at as createdAt, p.updated_at as updatedAt
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = ?`,
      [id]
    );

    if (!rows || rows.length === 0) {
      throw new AppError('Không tìm thấy sản phẩm.', 404);
    }

    const p = rows[0];
    res.json({
      success: true,
      data: {
        ...p,
        isActive: Boolean(p.isActive),
        costPrice: Number(p.costPrice),
        salePrice: Number(p.salePrice),
        stockQuantity: Number(p.stockQuantity),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function createProduct(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { sku, name, categoryId, costPrice, salePrice, stockQuantity, description } = req.body;

    const result = await withTransaction(async (conn) => {
      // Check SKU uniqueness
      const [existing] = await conn.query<any[]>('SELECT id FROM products WHERE sku = ?', [sku.trim()]);
      if (existing.length > 0) {
        throw new AppError(`Mã SKU "${sku.trim()}" đã tồn tại. Vui lòng chọn mã SKU khác.`, 409);
      }

      // Check Category if provided
      if (categoryId) {
        const [cat] = await conn.query<any[]>('SELECT id FROM categories WHERE id = ?', [categoryId]);
        if (cat.length === 0) {
          throw new AppError('Danh mục sản phẩm không tồn tại.', 400);
        }
      }

      const [insertResult] = await conn.execute<any>(
        `INSERT INTO products (sku, name, category_id, cost_price, sale_price, stock_quantity, description)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          sku.trim(),
          name.trim(),
          categoryId ?? null,
          costPrice,
          salePrice,
          stockQuantity,
          description ? description.trim() : null,
        ]
      );

      const productId = insertResult.insertId;

      // Initial stock movement
      if (stockQuantity > 0 && req.user?.userId) {
        await conn.execute(
          `INSERT INTO stock_movements (product_id, user_id, movement_type, quantity, reference_code, note)
           VALUES (?, ?, 'IN', ?, ?, 'Khởi tạo tồn kho ban đầu')`,
          [productId, req.user.userId, stockQuantity, sku.trim()]
        );
      }

      await recordAuditLog(
        {
          userId: req.user?.userId,
          action: 'CREATE_PRODUCT',
          entityType: 'products',
          entityId: productId,
          details: { sku, name, salePrice, stockQuantity },
        },
        conn
      );

      return productId;
    });

    res.status(201).json({
      success: true,
      message: 'Thêm sản phẩm thành công.',
      data: { id: result },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProduct(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);
    const { name, categoryId, costPrice, salePrice, description } = req.body;

    if (categoryId) {
      const [cat] = await pool.query<any[]>('SELECT id FROM categories WHERE id = ?', [categoryId]);
      if (cat.length === 0) {
        throw new AppError('Danh mục sản phẩm không tồn tại.', 400);
      }
    }

    const [result] = await pool.execute<any>(
      `UPDATE products
       SET name = ?, category_id = ?, cost_price = ?, sale_price = ?, description = ?
       WHERE id = ?`,
      [
        name.trim(),
        categoryId ?? null,
        costPrice,
        salePrice,
        description ? description.trim() : null,
        id,
      ]
    );

    if (result.affectedRows === 0) {
      throw new AppError('Không tìm thấy sản phẩm.', 404);
    }

    await recordAuditLog({
      userId: req.user?.userId,
      action: 'UPDATE_PRODUCT',
      entityType: 'products',
      entityId: id,
      details: { name, salePrice, costPrice },
    });

    res.json({
      success: true,
      message: 'Cập nhật sản phẩm thành công.',
    });
  } catch (error) {
    next(error);
  }
}

export async function toggleProductStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);

    const [rows] = await pool.query<any[]>('SELECT id, is_active FROM products WHERE id = ?', [id]);
    if (!rows || rows.length === 0) {
      throw new AppError('Không tìm thấy sản phẩm.', 404);
    }

    const newStatus = !rows[0].is_active;
    await pool.execute('UPDATE products SET is_active = ? WHERE id = ?', [newStatus ? 1 : 0, id]);

    await recordAuditLog({
      userId: req.user?.userId,
      action: newStatus ? 'ACTIVATE_PRODUCT' : 'DISCONTINUE_PRODUCT',
      entityType: 'products',
      entityId: id,
    });

    res.json({
      success: true,
      message: newStatus ? 'Đã mở bán lại sản phẩm.' : 'Đã ngừng kinh doanh sản phẩm.',
      data: { isActive: newStatus },
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteProduct(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);

    // Check if product is in any orders
    const [orderRows] = await pool.query<any[]>(
      'SELECT COUNT(*) as count FROM order_items WHERE product_id = ?',
      [id]
    );

    if (orderRows[0].count > 0) {
      // Soft-discontinue if already referenced in orders
      await pool.execute('UPDATE products SET is_active = FALSE WHERE id = ?', [id]);
      await recordAuditLog({
        userId: req.user?.userId,
        action: 'DISCONTINUE_PRODUCT_REFERENCED',
        entityType: 'products',
        entityId: id,
      });

      res.json({
        success: true,
        message: 'Sản phẩm đã từng phát sinh đơn hàng nên được chuyển sang trạng thái "Ngừng kinh doanh" để bảo toàn lịch sử giao dịch.',
      });
      return;
    }

    // Otherwise, clean stock movements and delete product
    await withTransaction(async (conn) => {
      await conn.execute('DELETE FROM stock_movements WHERE product_id = ?', [id]);
      const [result] = await conn.execute<any>('DELETE FROM products WHERE id = ?', [id]);
      if (result.affectedRows === 0) {
        throw new AppError('Không tìm thấy sản phẩm để xóa.', 404);
      }

      await recordAuditLog(
        {
          userId: req.user?.userId,
          action: 'DELETE_PRODUCT',
          entityType: 'products',
          entityId: id,
        },
        conn
      );
    });

    res.json({
      success: true,
      message: 'Đã xóa sản phẩm thành công.',
    });
  } catch (error) {
    next(error);
  }
}

