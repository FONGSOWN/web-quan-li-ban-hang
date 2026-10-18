import { Router } from 'express';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  customerSchema,
} from '../controllers/customer.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.use(authenticate);

router.get('/', getCustomers);
router.get('/:id', getCustomerById);
router.post('/', validate({ body: customerSchema }), createCustomer);
router.put('/:id', validate({ body: customerSchema }), updateCustomer);

export default router;

