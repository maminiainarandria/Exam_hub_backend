import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../Utils/AppError.js';
import { verifyToken } from '../Security/jwt.js';
import type { JwtUser, Role } from '../Model/types.js';
import { pool } from '../Config/db.js';

declare global {
  namespace Express {
    interface Request {
      user?: JwtUser;
    }
  }
}

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const header = req.header('Authorization');
  if (!header?.startsWith('Bearer ')) {
    next(new AppError(401, 'Authentification requise.'));
    return;
  }

  let tokenUser: JwtUser;
  try {
    tokenUser = verifyToken(header.slice(7));
  } catch {
    next(new AppError(401, 'Token invalide ou expiré.'));
    return;
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, email, role, active FROM users WHERE id=$1`,
      [tokenUser.id]
    );
    const current = rows[0];
    if (!current) throw new AppError(401, 'Compte introuvable.');
    if (!current.active) throw new AppError(403, 'Compte désactivé. Contactez un administrateur.');
    if (current.role !== tokenUser.role) throw new AppError(401, 'Session invalide.');
    req.user = { id: Number(current.id), email: current.email, role: current.role };
    next();
  } catch (error) {
    next(error);
  }
}

export function authorize(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(new AppError(401, 'Authentification requise.'));
    if (!roles.includes(req.user.role)) return next(new AppError(403, 'Accès interdit pour ce rôle.'));
    next();
  };
}
