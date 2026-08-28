import type { NextFunction, Request, Response } from 'express';
import { StudentExamService } from '../Service/StudentExamService.js';
import { requireId } from '../Utils/validation.js';
import { AppError } from '../Utils/AppError.js';

const service = new StudentExamService();
function studentId(req: Request): number {
  if (!req.user) throw new AppError(401, 'Authentification requise.');
  return req.user.userId;
}

export const myExamController = {
  list: async (req: Request, res: Response, next: NextFunction) => {
    try { res.json(await service.listAvailable(studentId(req))); } catch (error) { next(error); }
  },
  get: async (req: Request, res: Response, next: NextFunction) => {
    try { res.json(await service.getAvailable(requireId(req.params.id), studentId(req))); } catch (error) { next(error); }
  },
  submit: async (req: Request, res: Response, next: NextFunction) => {
    try { res.status(201).json(await service.submit(requireId(req.params.id), studentId(req), req.body)); } catch (error) { next(error); }
  },
  results: async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.query.examId !== undefined) {
        res.json(await service.result(studentId(req), requireId(req.query.examId, 'Examen')));
      } else {
        res.json(await service.history(studentId(req)));
      }
    } catch (error) { next(error); }
  }
};
