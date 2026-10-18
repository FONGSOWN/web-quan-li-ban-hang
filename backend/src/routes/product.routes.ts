import { Router } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  toggleProductStatus,
  deleteProduct,
  createProductSchema,
  updateProductSchema,
} from '../controllers/product.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.use(authenticate);

router.get('/', getProducts);
router.get('/:id', getProductById);
router.post('/', authorizeRoles('ADMIN', 'STAFF'), validate({ body: createProductSchema }), createProduct);
router.put('/:id', authorizeRoles('ADMIN', 'STAFF'), validate({ body: updateProductSchema }), updateProduct);
router.patch('/:id/status', authorizeRoles('ADMIN'), toggleProductStatus);
router.delete('/:id', authorizeRoles('ADMIN'), deleteProduct);

export default router;

