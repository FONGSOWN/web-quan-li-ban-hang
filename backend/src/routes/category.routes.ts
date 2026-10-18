import { Router } from 'express';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  categorySchema,
} from '../controllers/category.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.use(authenticate);

router.get('/', getCategories);
router.post('/', authorizeRoles('ADMIN', 'STAFF'), validate({ body: categorySchema }), createCategory);
router.put('/:id', authorizeRoles('ADMIN'), validate({ body: categorySchema }), updateCategory);
router.delete('/:id', authorizeRoles('ADMIN'), deleteCategory);

export default router;

