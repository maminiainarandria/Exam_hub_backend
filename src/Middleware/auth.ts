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

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.header('Authorization');

  if (!header) {
    next(new AppError(401, 'No token provided'));
    return;
  }

  if (
    !header.startsWith('Bearer ') ||
    header.slice(7).trim() === ''
  ) {
    next(new AppError(401, 'Invalid or expired token'));
    return;
  }

  let tokenUser: JwtUser;

  try {
    tokenUser = verifyToken(header.slice(7));
  } catch {
    next(new AppError(401, 'Invalid or expired token'));
    return;
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, role, active
       FROM users
       WHERE id = $1`,
      [tokenUser.userId]
    );

    const current = rows[0];

    if (!current) {
      throw new AppError(
        401,
        'Invalid or expired token'
      );
    }

    if (!current.active) {
      throw new AppError(
        401,
        'Account disabled'
      );
    }

    if (current.role !== tokenUser.role) {
      throw new AppError(
        401,
        'Invalid or expired token'
      );
    }

    req.user = {
      userId: Number(current.id),
      role: current.role
    };

    next();
  } catch (error) {
    next(error);
  }
}

export function authorize(...roles: Role[]) {
  return (
    req: Request,
    _res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      next(new AppError(401, 'No token provided'));
      return;
    }

    if (!roles.includes(req.user.role)) {
      if (roles.length === 1 && roles[0] === 'admin') {
        next(new AppError(403, 'Admin access required'));
        return;
      }

      if (roles.length === 1 && roles[0] === 'student') {
        next(new AppError(403, 'Student access required'));
        return;
      }

      next(new AppError(403, 'Access forbidden'));
      return;
    }

    next();
  };
}