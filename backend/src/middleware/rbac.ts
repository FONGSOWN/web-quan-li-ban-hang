import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.js';

export function authorizeRoles(...allowedRoles: Array<'ADMIN' | 'STAFF'>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Chưa xác thực người dùng.',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thực hiện chức năng này.',
      });
      return;
    }

    next();
  };
}

