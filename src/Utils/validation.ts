import { AppError } from './AppError.js';
import type { QuestionInput } from '../Model/types.js';

export function requireString(value: unknown, field: string, min = 1): string {
  if (typeof value !== 'string' || value.trim().length < min) {
    throw new AppError(400, `${field} est invalide.`);
  }
  return value.trim();
}

export function requireEmail(value: unknown): string {
  const email = requireString(value, 'Email').toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError(400, 'Email invalide.');
  }
  return email;
}

export function requirePassword(value: unknown): string {
  const password = requireString(value, 'Mot de passe', 8);
  if (password.length < 8) throw new AppError(400, 'Le mot de passe doit contenir au moins 8 caractères.');
  return password;
}

export function requireId(value: unknown, field = 'Identifiant'): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(400, `${field} invalide.`);
  return id;
}

export function validateQuestionInput(body: unknown): QuestionInput {
  if (!body || typeof body !== 'object') throw new AppError(400, 'Question invalide.');
  const value = body as Record<string, unknown>;
  const statement = requireString(value.statement, 'Énoncé');
  const points = value.points === undefined ? 1 : Number(value.points);
  if (!Number.isFinite(points) || points <= 0) throw new AppError(400, 'Le nombre de points doit être supérieur à 0.');
  if (!Array.isArray(value.choices) || value.choices.length < 2 || value.choices.length > 6) {
    throw new AppError(400, 'Une question doit contenir entre 2 et 6 choix.');
  }
  const choices = value.choices.map((choice, index) => {
    if (!choice || typeof choice !== 'object') throw new AppError(400, `Choix ${index + 1} invalide.`);
    const c = choice as Record<string, unknown>;
    return {
      label: requireString(c.label, `Texte du choix ${index + 1}`),
      isCorrect: c.isCorrect === true
    };
  });
  if (choices.filter((choice) => choice.isCorrect).length !== 1) {
    throw new AppError(400, 'Une question doit avoir exactement un choix correct.');
  }
  return { statement, points, choices };
}
