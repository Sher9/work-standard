import { Router, type Request, type Response, type NextFunction } from 'express';
import * as service from './auth.service';
import { requireAuth } from '../common/auth';
import { errorApp } from '../middleware/errorHandler';

export const authRouter = Router();

authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { employeeNo, password } = (req.body ?? {}) as {
      employeeNo?: string;
      password?: string;
    };
    if (!employeeNo || !password) {
      throw errorApp(400, '工号和密码不能为空', 'BAD_REQUEST');
    }
    const result = await service.login({ employeeNo, password });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employee = await service.getProfile(req.user!.employeeNo);
    res.json({ employee });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/logout', requireAuth, async (req: Request, res: Response) => {
  await service.logout(req.authToken ?? '');
  res.json({ message: '已退出登录' });
});
