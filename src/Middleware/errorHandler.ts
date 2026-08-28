import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../Utils/AppError.js';

export function notFound(
  _req: Request,
  _res: Response,
  next: NextFunction
): void {
  next(new AppError(404, 'Route not found'));
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (error instanceof AppError) {
    res.status(error.status).json({ message: error.message });
    return;
  }

  if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({ message: 'Invalid JSON' });
    return;
  }

  const pgError = error as {
    code?: string;
    constraint?: string;
    message?: string;
  };

  // Violation d'une contrainte UNIQUE
  if (pgError.code === '23505') {
    if (pgError.constraint === 'ux_users_email_lower') {
      res.status(409).json({
        message: 'Email already in use'
      });
      return;
    }

    if (pgError.constraint === 'courses_code_key') {
      res.status(409).json({
        message: 'Course code already in use'
      });
      return;
    }

    if (pgError.constraint === 'uq_attempt_exam_student') {
      res.status(409).json({
        message: 'Exam already taken'
      });
      return;
    }

    res.status(409).json({
      message: 'Conflict'
    });
    return;
  }

  // Violation de clé étrangère
  if (pgError.code === '23503') {
    res.status(409).json({
      message: 'Operation not allowed because related data exists'
    });
    return;
  }

  // Contrainte CHECK / règles provenant de PostgreSQL
  if (pgError.code === '23514') {
    res.status(409).json({
      message: pgError.message ?? 'Data constraint violated'
    });
    return;
  }

  console.error(error);

  res.status(500).json({
    message: 'Internal server error'
  });
}