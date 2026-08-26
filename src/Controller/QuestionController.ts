import type { NextFunction, Request, Response } from 'express';
import { QuestionService } from '../Service/QuestionService.js';
import { requireId } from '../Utils/validation.js';

const service = new QuestionService();
export const questionController = {
  list: async (req: Request, res: Response, next: NextFunction) => {
    try { res.json(await service.listAdmin(requireId(req.params.id))); } catch (error) { next(error); }
  },
  create: async (req: Request, res: Response, next: NextFunction) => {
    try { res.status(201).json(await service.create(requireId(req.params.id), req.body)); } catch (error) { next(error); }
  },
  update: async (req: Request, res: Response, next: NextFunction) => {
    try { res.json(await service.update(requireId(req.params.id), req.body)); } catch (error) { next(error); }
  },
  delete: async (req: Request, res: Response, next: NextFunction) => {
    try { res.json(await service.delete(requireId(req.params.id))); } catch (error) { next(error); }
  }
};
