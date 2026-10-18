import { Request, Response, NextFunction } from 'express';
import { pool } from '../database/pool.js';
import { generateCsv } from '../utils/csv.js';

export async function getDashboardReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const startDate = req.query.startDate ? String(req.query.startDate) : '';
    const endDate = req.query.endDate ? String(req.query.endDate) : '';

    const dateConditions: string[] = [];
    const dateParams: any[] = [];

    if (startDate) {
      dateConditions.push('DATE(o.created_at) >= ?');
      dateParams.push(startDate);
    }
    if (endDate) {
      dateConditions.push('DATE(o.created_at) <= ?');
      dateParams.push(endDate);
    }

    const whereDate = dateConditions.length > 0 ? `AND ${dateConditions.join(' AND ')}` : '';

    // 1. Revenue and Order status counts
    const [orderStats] = await pool.query<any[]>(
      `SELECT
         COALESCE(SUM(CASE WHEN o.status = 'COMPLETED' THEN o.total_amount ELSE 0 END), 0) as totalRevenue,
         COUNT(o.id) as totalOrders,
         SUM(CASE WHEN o.status = 'COMPLETED' THEN 1 ELSE 0 END) as completedOrders,
         SUM(CASE WHEN o.status = 'PENDING' THEN 1 ELSE 0 END) as pendingOrders,
         SUM(CASE WHEN o.status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelledOrders
       FROM orders o
       WHERE 1=1 ${whereDate}`,
      dateParams
    );

    // 2. Total active products count
    const [prodStats] = await pool.query<any[]>(
      `SELECT
         COUNT(*) as totalProducts,
         SUM(CASE WHEN stock_quantity <= 10 THEN 1 ELSE 0 END) as lowStockCount
       FROM products
       WHERE is_active = TRUE`
    );

    // 3. Total customers count
    const [custStats] = await pool.query<any[]>('SELECT COUNT(*) as totalCustomers FROM customers');

    // 4. Top 5 selling products (from COMPLETED orders only)
    const [topProducts] = await pool.query<any[]>(
      `SELECT oi.product_id as productId, oi.product_name_snapshot as productName,
              p.sku as productSku,
              SUM(oi.quantity) as totalSold,
              SUM(oi.line_total) as totalRevenue,
              p.stock_quantity as currentStock
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       JOIN products p ON oi.product_id = p.id
       WHERE o.status = 'COMPLETED' ${whereDate}
       GROUP BY oi.product_id, oi.product_name_snapshot, p.sku, p.stock_quantity
       ORDER BY totalSold DESC
       LIMIT 5`,
      dateParams
    );

    // 5. Recent 5 orders
    const [recentOrders] = await pool.query<any[]>(
      `SELECT o.id, o.order_code as orderCode, c.full_name as customerName,
              o.status, o.total_amount as totalAmount, o.created_at as createdAt
       FROM orders o
       LEFT JOIN customers c ON o.customer_id = c.id
       ORDER BY o.id DESC
       LIMIT 5`
    );

    // 6. 7-day revenue trend
    const [trendRows] = await pool.query<any[]>(
      `SELECT DATE(o.created_at) as saleDate,
              COALESCE(SUM(o.total_amount), 0) as dailyRevenue,
              COUNT(o.id) as dailyOrders
       FROM orders o
       WHERE o.status = 'COMPLETED'
         AND o.created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
       GROUP BY DATE(o.created_at)
       ORDER BY saleDate ASC`
    );

    res.json({
      success: true,
      data: {
        revenue: {
          totalRevenue: Number(orderStats[0].totalRevenue || 0),
          totalOrders: Number(orderStats[0].totalOrders || 0),
          completedOrders: Number(orderStats[0].completedOrders || 0),
          pendingOrders: Number(orderStats[0].pendingOrders || 0),
          cancelledOrders: Number(orderStats[0].cancelledOrders || 0),
        },
        inventory: {
          totalProducts: Number(prodStats[0].totalProducts || 0),
          lowStockCount: Number(prodStats[0].lowStockCount || 0),
        },
        customers: {
          totalCustomers: Number(custStats[0].totalCustomers || 0),
        },
        topSellingProducts: topProducts.map((tp) => ({
          ...tp,
          totalSold: Number(tp.totalSold),
          totalRevenue: Number(tp.totalRevenue),
          currentStock: Number(tp.currentStock),
        })),
        recentOrders: recentOrders.map((ro) => ({
          ...ro,
          totalAmount: Number(ro.totalAmount),
        })),
        trend: trendRows.map((tr) => ({
          date: tr.saleDate instanceof Date ? tr.saleDate.toISOString().split('T')[0] : String(tr.saleDate),
          revenue: Number(tr.dailyRevenue),
          orders: Number(tr.dailyOrders),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function exportOrdersCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const startDate = req.query.startDate ? String(req.query.startDate) : '';
    const endDate = req.query.endDate ? String(req.query.endDate) : '';

    const conditions: string[] = [];
    const params: any[] = [];

    if (startDate) {
      conditions.push('DATE(o.created_at) >= ?');
      params.push(startDate);
    }
    if (endDate) {
      conditions.push('DATE(o.created_at) <= ?');
      params.push(endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await pool.query<any[]>(
      `SELECT o.order_code, COALESCE(c.full_name, 'Khách vãng lai') as customer_name,
              COALESCE(c.phone, '') as phone,
              DATE_FORMAT(o.created_at, '%d/%m/%Y %H:%i') as created_time,
              CASE
                WHEN o.status = 'COMPLETED' THEN 'Hoàn thành'
                WHEN o.status = 'PENDING' THEN 'Đang xử lý'
                ELSE 'Đã hủy'
              END as status_vn,
              o.subtotal, o.discount_amount, o.total_amount,
              u.full_name as creator,
              COALESCE(o.note, '') as note
       FROM orders o
       LEFT JOIN customers c ON o.customer_id = c.id
       JOIN users u ON o.created_by = u.id
       ${whereClause}
       ORDER BY o.id DESC`,
      params
    );

    const headers = [
      'Mã đơn hàng',
      'Khách hàng',
      'Số điện thoại',
      'Thời gian đặt',
      'Trạng thái',
      'Tạm tính (VNĐ)',
      'Giảm giá (VNĐ)',
      'Tổng tiền (VNĐ)',
      'Nhân viên tạo',
      'Ghi chú',
    ];

    const dataRows = rows.map((r) => [
      r.order_code,
      r.customer_name,
      r.phone,
      r.created_time,
      r.status_vn,
      Number(r.subtotal),
      Number(r.discount_amount),
      Number(r.total_amount),
      r.creator,
      r.note,
    ]);

    const csvContent = generateCsv(headers, dataRows);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="bao-cao-don-hang.csv"');
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
}

