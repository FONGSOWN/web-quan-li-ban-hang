import { Router } from 'express';
import { getDashboardReport, exportOrdersCsv } from '../controllers/report.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/dashboard', getDashboardReport);
router.get('/export-csv', exportOrdersCsv);

export default router;

