import type { NextFunction, Request, Response } from 'express';
import { AuthService } from '../Service/AuthService.js';

const service = new AuthService();
export const authController = {
  login: async (req: Request, res: Response, next: NextFunction) => {
    try { res.json(await service.login(req.body)); } catch (error) { next(error); }
  }
};
