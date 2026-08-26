import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../Utils/AppError.js';

export function notFound(_req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(404, 'Route introuvable.'));
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof AppError) {
    res.status(error.status).json({ message: error.message });
    return;
  }
  if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({ message: 'JSON invalide.' });
    return;
  }
  const pgError = error as { code?: string; constraint?: string; message?: string };
  if (pgError.code === '23505') {
    res.status(409).json({ message: 'Conflit : une donnée unique existe déjà.' });
    return;
  }
  if (pgError.code === '23503') {
    res.status(409).json({ message: 'Opération impossible à cause de données liées.' });
    return;
  }
  if (pgError.code === '23514') {
    res.status(409).json({ message: pgError.message ?? 'Contrainte de données non respectée.' });
    return;
  }
  console.error(error);
  res.status(500).json({ message: 'Erreur interne du serveur.' });
}
