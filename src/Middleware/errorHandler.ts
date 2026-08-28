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
    res.status(error.status).json({
      message: error.message
    });
    return;
  }

  if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({
      message: 'Invalid JSON'
    });
    return;
  }

  const pgError = error as {
    code?: string;
    constraint?: string;
    message?: string;
  };

  // Contrainte UNIQUE
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

  // Clé étrangère
  if (pgError.code === '23503') {
    res.status(409).json({
      message: 'Operation not allowed because related data exists'
    });
    return;
  }

  // Contraintes CHECK et règles métier PostgreSQL
  if (pgError.code === '23514') {
    const message = (pgError.message ?? '').toLowerCase();

    // RG-08 : questions / choix verrouillés après tentative
    if (
      message.includes('verrouill') ||
      message.includes('déjà une tentative') ||
      message.includes('deja une tentative')
    ) {
      res.status(409).json({
        message: 'Cannot modify questions of an exam that has attempts'
      });
      return;
    }

    // RG-04 : entre 2 et 6 choix
    if (
      message.includes('entre 2 et 6 choix')
    ) {
      res.status(400).json({
        message: 'A question must have between 2 and 6 choices'
      });
      return;
    }

    // RG-04 : exactement un choix correct
    if (
      message.includes('exactement un choix correct')
    ) {
      res.status(400).json({
        message: 'A question must have exactly one correct choice'
      });
      return;
    }

    // Autre contrainte de données
    res.status(400).json({
      message: pgError.message ?? 'Data constraint violated'
    });
    return;
  }

  console.error(error);

  res.status(500).json({
    message: 'Internal server error'
  });
}