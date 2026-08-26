import { ExamRepository } from '../Repositorie/ExamRepository.js';
import { CourseRepository } from '../Repositorie/CourseRepository.js';
import { AppError } from '../Utils/AppError.js';
import { requireId, requireString } from '../Utils/validation.js';

function parseDate(value: unknown, field: string): string {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) throw new AppError(400, `${field} invalide.`);
  return new Date(value).toISOString();
}

export class ExamService {
  constructor(private exams = new ExamRepository(), private courses = new CourseRepository()) {}
  list() { return this.exams.listAdmin(); }

  async get(id: number) {
    const exam = await this.exams.findAdmin(id);
    if (!exam) throw new AppError(404, 'Examen introuvable.');
    return exam;
  }

  async create(body: unknown) {
    if (!body || typeof body !== 'object') throw new AppError(400, 'Données examen invalides.');
    const input = body as Record<string, unknown>;
    const courseId = requireId(input.courseId, 'Cours');
    if (!await this.courses.find(courseId)) throw new AppError(404, 'Cours introuvable.');
    const title = requireString(input.title, 'Titre');
    const description = typeof input.description === 'string' ? input.description.trim() : '';
    const startsAt = parseDate(input.startsAt, 'Date de début');
    const endsAt = parseDate(input.endsAt, 'Date de fin');
    if (new Date(endsAt) <= new Date(startsAt)) throw new AppError(400, 'La fin doit être postérieure au début.');
    return this.exams.create(courseId, title, description, startsAt, endsAt);
  }

  async update(id: number, body: unknown) {
    const existing = await this.get(id);
    if (!body || typeof body !== 'object') throw new AppError(400, 'Données examen invalides.');
    const input = body as Record<string, unknown>;
    const courseId = requireId(input.courseId ?? existing.course_id, 'Cours');
    if (!await this.courses.find(courseId)) throw new AppError(404, 'Cours introuvable.');
    const title = requireString(input.title ?? existing.title, 'Titre');
    const description = typeof input.description === 'string' ? input.description.trim() : existing.description;
    const startsAt = input.startsAt ? parseDate(input.startsAt, 'Date de début') : new Date(existing.starts_at).toISOString();
    const endsAt = input.endsAt ? parseDate(input.endsAt, 'Date de fin') : new Date(existing.ends_at).toISOString();
    if (new Date(endsAt) <= new Date(startsAt)) throw new AppError(400, 'La fin doit être postérieure au début.');
    return this.exams.update(id, courseId, title, description, startsAt, endsAt);
  }

  async delete(id: number) {
    if (!await this.exams.exists(id)) throw new AppError(404, 'Examen introuvable.');
    if (await this.exams.hasAttempts(id)) throw new AppError(409, 'Impossible de supprimer un examen qui possède des tentatives.');
    await this.exams.delete(id);
    return { message: 'Examen supprimé.' };
  }

  async results(id: number) {
    const data = await this.exams.results(id);
    if (!data) throw new AppError(404, 'Examen introuvable.');
    return data;
  }
}
