import { AppError } from './AppError.js';
import type { QuestionInput } from '../Model/types.js';

export function requireString(
  value: unknown,
  field: string,
  min = 1
): string {
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

  if (password.length < 8) {
    throw new AppError(
      400,
      'Le mot de passe doit contenir au moins 8 caractères.'
    );
  }

  return password;
}

export function requireId(
  value: unknown,
  field = 'Identifiant'
): number {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, `${field} invalide.`);
  }

  return id;
}

export function validateQuestionInput(body: unknown): QuestionInput {
  if (!body || typeof body !== 'object') {
    throw new AppError(400, 'Question invalide.');
  }

  const value = body as Record<string, unknown>;

  const statement = requireString(
    value.statement,
    'Énoncé'
  );

  const points =
    value.points === undefined
      ? 1
      : Number(value.points);

  if (!Number.isInteger(points) || points < 1) {
    throw new AppError(
      400,
      'Le nombre de points doit être un entier supérieur ou égal à 1.'
    );
  }

  const position =
    value.position === undefined
      ? 1
      : Number(value.position);

  if (!Number.isInteger(position) || position < 1) {
    throw new AppError(
      400,
      'La position doit être un entier supérieur ou égal à 1.'
    );
  }

  if (
    !Array.isArray(value.choices) ||
    value.choices.length < 2 ||
    value.choices.length > 6
  ) {
    throw new AppError(
      400,
      'A question must have between 2 and 6 choices'
    );
  }

  const choices = value.choices.map((choice, index) => {
    if (!choice || typeof choice !== 'object') {
      throw new AppError(
        400,
        `Choix ${index + 1} invalide.`
      );
    }

    const input = choice as Record<string, unknown>;

    if (typeof input.is_correct !== 'boolean') {
      throw new AppError(
        400,
        `Le champ is_correct du choix ${index + 1} est invalide.`
      );
    }

    return {
      // Conversion du contrat OpenAPI vers le format interne
      label: requireString(
        input.text,
        `Texte du choix ${index + 1}`
      ),
      isCorrect: input.is_correct
    };
  });

  if (
    choices.filter((choice) => choice.isCorrect).length !== 1
  ) {
    throw new AppError(
      400,
      'A question must have exactly one correct choice'
    );
  }

  return {
    statement,
    points,
    position,
    choices
  };
}