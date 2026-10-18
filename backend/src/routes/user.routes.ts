import { Router } from 'express';
import {
  getUsers,
  createUser,
  toggleUserStatus,
  createUserSchema,
  toggleUserStatusSchema,
} from '../controllers/user.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.use(authenticate);
router.use(authorizeRoles('ADMIN'));

router.get('/', getUsers);
router.post('/', validate({ body: createUserSchema }), createUser);
router.patch('/:id/status', validate({ body: toggleUserStatusSchema }), toggleUserStatus);

export default router;

