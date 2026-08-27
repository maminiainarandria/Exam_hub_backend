import { UserRepository } from '../Repositorie/UserRepository.js';
import { hashPassword } from '../Security/password.js';
import { AppError } from '../Utils/AppError.js';
import { requireEmail, requirePassword, requireString } from '../Utils/validation.js';

export class StudentService {
  constructor(private users = new UserRepository()) {}

  list() { return this.users.listStudents(); }

  async create(body: unknown) {
    if (!body || typeof body !== 'object') throw new AppError(400, 'Données étudiant invalides.');
    const input = body as Record<string, unknown>;
    const name = requireString(input.name, 'Nom', 2);
    const email = requireEmail(input.email);
    const password = requirePassword(input.password);
    return this.users.createStudent(name, email, await hashPassword(password));
  }

  async update(id: number, body: unknown) {
    const existing = await this.users.findStudent(id);
    if (!existing) throw new AppError(404, 'Étudiant introuvable.');
    if (!body || typeof body !== 'object') throw new AppError(400, 'Données étudiant invalides.');
    const input = body as Record<string, unknown>;
    const name = requireString(input.name ?? existing.name, 'Nom', 2);
    const email = requireEmail(input.email ?? existing.email);
    let passwordHash: string | undefined;
    if (input.password !== undefined && input.password !== '') {
      passwordHash = await hashPassword(requirePassword(input.password));
    }
    let updated = await this.users.updateStudent(id, name, email, passwordHash);
    if (!updated) throw new AppError(404, 'Étudiant introuvable.');
    if (typeof input.active === 'boolean' && input.active !== updated.active) {
      updated = await this.users.setStudentActive(id, input.active);
    }
    return updated;
  }

  async deactivate(id: number) {
    const updated = await this.users.setStudentActive(id, false);
    if (!updated) throw new AppError(404, 'Étudiant introuvable.');
    return updated;
  }
}
