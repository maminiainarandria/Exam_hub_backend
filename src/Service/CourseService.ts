import { CourseRepository } from '../Repositorie/CourseRepository.js';
import { AppError } from '../Utils/AppError.js';
import { requireString } from '../Utils/validation.js';

export class CourseService {
  constructor(private courses = new CourseRepository()) {}
  list() { return this.courses.list(); }

  async create(body: unknown) {
    if (!body || typeof body !== 'object') throw new AppError(400, 'Données du cours invalides.');
    const input = body as Record<string, unknown>;
    const code = requireString(input.code, 'Code').toUpperCase();
    const name = requireString(input.name, 'Nom');
    const description = typeof input.description === 'string' ? input.description.trim() : '';
    return this.courses.create(code, name, description);
  }

  async update(id: number, body: unknown) {
    const existing = await this.courses.find(id);
    if (!existing) throw new AppError(404, 'Cours introuvable.');
    if (!body || typeof body !== 'object') throw new AppError(400, 'Données du cours invalides.');
    const input = body as Record<string, unknown>;
    const code = requireString(input.code ?? existing.code, 'Code').toUpperCase();
    const name = requireString(input.name ?? existing.name, 'Nom');
    const description = typeof input.description === 'string' ? input.description.trim() : existing.description;
    return this.courses.update(id, code, name, description);
  }

  async delete(id: number) {
    if (!await this.courses.find(id)) throw new AppError(404, 'Cours introuvable.');
    if (await this.courses.hasExams(id)) throw new AppError(409, 'Impossible de supprimer un cours qui possède des examens.');
    await this.courses.delete(id);
    return { message: 'Cours supprimé.' };
  }
}
