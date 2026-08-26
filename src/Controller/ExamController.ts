import type { NextFunction, Request, Response } from 'express';
import { ExamService } from '../Service/ExamService.js';
import { requireId } from '../Utils/validation.js';

const service = new ExamService();
export const examController = {
  list: async (_req: Request, res: Response, next: NextFunction) => {
    try { res.json(await service.list()); } catch (error) { next(error); }
  },
  get: async (req: Request, res: Response, next: NextFunction) => {
    try { res.json(await service.get(requireId(req.params.id))); } catch (error) { next(error); }
  },
  create: async (req: Request, res: Response, next: NextFunction) => {
    try { res.status(201).json(await service.create(req.body)); } catch (error) { next(error); }
  },
  update: async (req: Request, res: Response, next: NextFunction) => {
    try { res.json(await service.update(requireId(req.params.id), req.body)); } catch (error) { next(error); }
  },
  delete: async (req: Request, res: Response, next: NextFunction) => {
    try { res.json(await service.delete(requireId(req.params.id))); } catch (error) { next(error); }
  },
  results: async (req: Request, res: Response, next: NextFunction) => {
    try { res.json(await service.results(requireId(req.params.id))); } catch (error) { next(error); }
  }
};
