import { Router } from 'express';
import {
  getOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  createOrderSchema,
  updateOrderStatusSchema,
} from '../controllers/order.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.use(authenticate);

router.get('/', getOrders);
router.get('/:id', getOrderById);
router.post('/', validate({ body: createOrderSchema }), createOrder);
router.patch('/:id/status', validate({ body: updateOrderStatusSchema }), updateOrderStatus);

export default router;

