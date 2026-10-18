import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { pool, withTransaction } from '../database/pool.js';
import { AppError } from '../middleware/errorHandler.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { recordAuditLog } from '../utils/audit.js';

export const createOrderSchema = z.object({
  customerId: z.number().nullable().optional(),
  items: z
    .array(
      z.object({
        productId: z.number().int().positive('ID sản phẩm không hợp lệ'),
        quantity: z.number().int().positive('Số lượng mua phải lớn hơn 0'),
        unitPrice: z.number().min(0, 'Đơn giá không được âm').optional(),
      })
    )
    .min(1, 'Đơn hàng phải có ít nhất 1 sản phẩm'),
  discountAmount: z.number().min(0, 'Số tiền giảm giá không được âm').default(0),
  note: z.string().max(500).optional().nullable(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['PENDING', 'COMPLETED', 'CANCELLED'], {
    message: 'Trạng thái đơn hàng phải là PENDING, COMPLETED hoặc CANCELLED',
  }),
});

function generateOrderCode(): string {
  const now = new Date();
  const y = String(now.getFullYear()).slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `DH-${y}${m}${d}-${randomPart}`;
}

export async function getOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.max(1, Math.min(100, Number(req.query.limit || 15)));
    const offset = (page - 1) * limit;

    const search = req.query.search ? String(req.query.search).trim() : '';
    const status = req.query.status ? String(req.query.status).trim() : '';
    const startDate = req.query.startDate ? String(req.query.startDate) : '';
    const endDate = req.query.endDate ? String(req.query.endDate) : '';

    const conditions: string[] = [];
    const params: any[] = [];

    if (search) {
      conditions.push('(o.order_code LIKE ? OR c.full_name LIKE ? OR c.phone LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (status) {
      conditions.push('o.status = ?');
      params.push(status);
    }

    if (startDate) {
      conditions.push('DATE(o.created_at) >= ?');
      params.push(startDate);
    }

    if (endDate) {
      conditions.push('DATE(o.created_at) <= ?');
      params.push(endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countRows] = await pool.query<any[]>(
      `SELECT COUNT(*) as total
       FROM orders o
       LEFT JOIN customers c ON o.customer_id = c.id
       ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    const [rows] = await pool.query<any[]>(
      `SELECT o.id, o.order_code as orderCode, o.customer_id as customerId,
              c.full_name as customerName, c.phone as customerPhone,
              u.full_name as createdByName, o.status,
              o.subtotal, o.discount_amount as discountAmount, o.total_amount as totalAmount,
              o.note, o.created_at as createdAt,
              COUNT(oi.id) as itemCount
       FROM orders o
       LEFT JOIN customers c ON o.customer_id = c.id
       JOIN users u ON o.created_by = u.id
       LEFT JOIN order_items oi ON o.id = oi.order_id
       ${whereClause}
       GROUP BY o.id
       ORDER BY o.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      data: rows.map((r) => ({
        ...r,
        subtotal: Number(r.subtotal),
        discountAmount: Number(r.discountAmount),
        totalAmount: Number(r.totalAmount),
        itemCount: Number(r.itemCount),
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

export async function getOrderById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);

    const [orderRows] = await pool.query<any[]>(
      `SELECT o.id, o.order_code as orderCode, o.customer_id as customerId,
              c.full_name as customerName, c.phone as customerPhone, c.address as customerAddress,
              u.full_name as createdByName, o.status,
              o.subtotal, o.discount_amount as discountAmount, o.total_amount as totalAmount,
              o.note, o.created_at as createdAt
       FROM orders o
       LEFT JOIN customers c ON o.customer_id = c.id
       JOIN users u ON o.created_by = u.id
       WHERE o.id = ?`,
      [id]
    );

    if (!orderRows || orderRows.length === 0) {
      throw new AppError('Không tìm thấy đơn hàng.', 404);
    }

    const order = orderRows[0];

    const [items] = await pool.query<any[]>(
      `SELECT oi.id, oi.product_id as productId, p.sku as productSku,
              oi.product_name_snapshot as productName,
              oi.quantity, oi.unit_price as unitPrice, oi.line_total as lineTotal
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = ?
       ORDER BY oi.id ASC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...order,
        subtotal: Number(order.subtotal),
        discountAmount: Number(order.discountAmount),
        totalAmount: Number(order.totalAmount),
        items: items.map((it) => ({
          ...it,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
          lineTotal: Number(it.lineTotal),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function createOrder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { customerId, items, discountAmount = 0, note } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('Chưa xác thực người dùng.', 401);
    }

    // Process order in a strictly isolated database transaction with row locks
    const createdOrder = await withTransaction(async (conn) => {
      // 1. Verify customer if given
      if (customerId) {
        const [cust] = await conn.query<any[]>('SELECT id FROM customers WHERE id = ?', [customerId]);
        if (cust.length === 0) {
          throw new AppError('Không tìm thấy thông tin khách hàng.', 400);
        }
      }

      // 2. Lock product rows in ascending order to prevent deadlocks
      const productIds = Array.from(new Set(items.map((i: any) => i.productId))).sort((a: any, b: any) => a - b);
      const placeholders = productIds.map(() => '?').join(',');

      const [productRows] = await conn.query<any[]>(
        `SELECT id, sku, name, sale_price as salePrice, stock_quantity as stockQuantity, is_active as isActive
         FROM products
         WHERE id IN (${placeholders})
         FOR UPDATE`,
        productIds
      );

      const productMap = new Map<number, any>();
      for (const p of productRows) {
        productMap.set(p.id, p);
      }

      // 3. Validate stock & calculate subtotal at backend
      let subtotal = 0;
      const verifiedItems: Array<{
        productId: number;
        productName: string;
        quantity: number;
        unitPrice: number;
        lineTotal: number;
      }> = [];

      for (const item of items) {
        const p = productMap.get(item.productId);
        if (!p) {
          throw new AppError(`Không tìm thấy sản phẩm có ID: ${item.productId}`, 400);
        }
        if (!p.isActive) {
          throw new AppError(`Sản phẩm "${p.name}" hiện đang ngừng kinh doanh.`, 400);
        }
        if (p.stockQuantity < item.quantity) {
          throw new AppError(
            `Sản phẩm "${p.name}" không đủ tồn kho (hiện còn ${p.stockQuantity}, yêu cầu mua ${item.quantity}).`,
            400
          );
        }

        const unitPrice = item.unitPrice !== undefined ? Number(item.unitPrice) : Number(p.salePrice);
        if (unitPrice < 0) {
          throw new AppError(`Đơn giá sản phẩm "${p.name}" không hợp lệ.`, 400);
        }

        const lineTotal = unitPrice * item.quantity;
        subtotal += lineTotal;

        // Decrease in memory stock map in case the same product is listed multiple times
        p.stockQuantity -= item.quantity;

        verifiedItems.push({
          productId: p.id,
          productName: p.name,
          quantity: item.quantity,
          unitPrice,
          lineTotal,
        });
      }

      const cleanDiscount = Math.max(0, Number(discountAmount) || 0);
      const totalAmount = Math.max(0, subtotal - cleanDiscount);
      const orderCode = generateOrderCode();

      // 4. Insert into orders table
      const [orderResult] = await conn.execute<any>(
        `INSERT INTO orders (order_code, customer_id, created_by, status, subtotal, discount_amount, total_amount, note)
         VALUES (?, ?, ?, 'COMPLETED', ?, ?, ?, ?)`,
        [
          orderCode,
          customerId ?? null,
          userId,
          subtotal,
          cleanDiscount,
          totalAmount,
          note ? note.trim() : null,
        ]
      );
      const orderId = orderResult.insertId;

      // 5. Insert order_items and deduct stock with movements
      for (const item of verifiedItems) {
        await conn.execute(
          `INSERT INTO order_items (order_id, product_id, product_name_snapshot, quantity, unit_price, line_total)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [orderId, item.productId, item.productName, item.quantity, item.unitPrice, item.lineTotal]
        );

        // Deduct inventory
        await conn.execute(
          `UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?`,
          [item.quantity, item.productId]
        );

        // Record stock movement OUT
        await conn.execute(
          `INSERT INTO stock_movements (product_id, user_id, movement_type, quantity, reference_code, note)
           VALUES (?, ?, 'OUT', ?, ?, ?)`,
          [
            item.productId,
            userId,
            item.quantity,
            orderCode,
            `Bán hàng theo đơn hàng ${orderCode}`,
          ]
        );
      }

      // 6. Record Audit Log
      await recordAuditLog(
        {
          userId,
          action: 'CREATE_ORDER',
          entityType: 'orders',
          entityId: orderId,
          details: { orderCode, subtotal, discountAmount: cleanDiscount, totalAmount, itemsCount: verifiedItems.length },
        },
        conn
      );

      return {
        orderId,
        orderCode,
        subtotal,
        discountAmount: cleanDiscount,
        totalAmount,
      };
    });

    res.status(201).json({
      success: true,
      message: 'Tạo đơn hàng thành công và đã cập nhật tồn kho.',
      data: createdOrder,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateOrderStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('Chưa xác thực người dùng.', 401);
    }

    await withTransaction(async (conn) => {
      const [orderRows] = await conn.query<any[]>(
        `SELECT id, order_code as orderCode, status FROM orders WHERE id = ? FOR UPDATE`,
        [id]
      );

      if (!orderRows || orderRows.length === 0) {
        throw new AppError('Không tìm thấy đơn hàng.', 404);
      }

      const order = orderRows[0];

      if (order.status === status) {
        return; // No status change
      }

      if (order.status === 'CANCELLED') {
        throw new AppError('Đơn hàng đã bị hủy, không thể thay đổi trạng thái nữa.', 400);
      }

      // If cancelling order: Restore inventory for all items
      if (status === 'CANCELLED') {
        const [items] = await conn.query<any[]>(
          `SELECT product_id as productId, quantity FROM order_items WHERE order_id = ?`,
          [id]
        );

        for (const it of items) {
          await conn.execute(
            `UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?`,
            [it.quantity, it.productId]
          );

          await conn.execute(
            `INSERT INTO stock_movements (product_id, user_id, movement_type, quantity, reference_code, note)
             VALUES (?, ?, 'IN', ?, ?, ?)`,
            [
              it.productId,
              userId,
              it.quantity,
              order.orderCode,
              `Hoàn kho do hủy đơn hàng ${order.orderCode}`,
            ]
          );
        }
      }

      await conn.execute('UPDATE orders SET status = ? WHERE id = ?', [status, id]);

      await recordAuditLog(
        {
          userId,
          action: status === 'CANCELLED' ? 'CANCEL_ORDER' : 'UPDATE_ORDER_STATUS',
          entityType: 'orders',
          entityId: id,
          details: { oldStatus: order.status, newStatus: status, orderCode: order.orderCode },
        },
        conn
      );
    });

    res.json({
      success: true,
      message: status === 'CANCELLED' ? 'Đã hủy đơn hàng và hoàn trả số lượng vào kho.' : 'Cập nhật trạng thái đơn hàng thành công.',
    });
  } catch (error) {
    next(error);
  }
}

