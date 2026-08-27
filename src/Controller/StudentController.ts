import type { NextFunction, Request, Response } from 'express';
import { StudentService } from '../Service/StudentService.js';
import { requireId } from '../Utils/validation.js';

const service = new StudentService();
export const studentController = {
  list: async (_req: Request, res: Response, next: NextFunction) => {
    try { res.json(await service.list()); } catch (error) { next(error); }
  },
  create: async (req: Request, res: Response, next: NextFunction) => {
    try { res.status(201).json(await service.create(req.body)); } catch (error) { next(error); }
  },
  update: async (req: Request, res: Response, next: NextFunction) => {
    try { res.json(await service.update(requireId(req.params.id), req.body)); } catch (error) { next(error); }
  },
  deactivate: async (req: Request, res: Response, next: NextFunction) => {
    try { res.json(await service.deactivate(requireId(req.params.id))); } catch (error) { next(error); }
  }
};
