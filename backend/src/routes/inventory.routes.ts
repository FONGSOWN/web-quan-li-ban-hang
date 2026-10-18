import { Router } from 'express';
import {
  getStockMovements,
  createStockMovement,
  getLowStockProducts,
  createMovementSchema,
} from '../controllers/inventory.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.use(authenticate);

router.get('/movements', getStockMovements);
router.post('/movements', validate({ body: createMovementSchema }), createStockMovement);
router.get('/low-stock', getLowStockProducts);

export default router;

