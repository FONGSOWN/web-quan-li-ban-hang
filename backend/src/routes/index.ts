import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import categoryRoutes from './category.routes.js';
import productRoutes from './product.routes.js';
import customerRoutes from './customer.routes.js';
import orderRoutes from './order.routes.js';
import inventoryRoutes from './inventory.routes.js';
import reportRoutes from './report.routes.js';

const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'QuanLyBanHang API',
    timestamp: new Date().toISOString(),
  });
});

// Domain routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/customers', customerRoutes);
router.use('/orders', orderRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/reports', reportRoutes);

export default router;

