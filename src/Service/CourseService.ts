import { CourseRepository } from '../Repositorie/CourseRepository.js';
import { AppError } from '../Utils/AppError.js';
import { requireString } from '../Utils/validation.js';

export class CourseService {
  constructor(
    private courses = new CourseRepository()
  ) {}

  list() {
    return this.courses.list();
  }

  async create(body: unknown) {
    if (!body || typeof body !== 'object') {
      throw new AppError(400, 'Invalid course data');
    }

    const input = body as Record<string, unknown>;

    const code = requireString(
      input.code,
      'Code'
    ).toUpperCase();

    const name = requireString(
      input.name,
      'Name'
    );

    const description =
      input.description === null ||
      input.description === undefined
        ? null
        : requireString(input.description, 'Description');

    return this.courses.create(
      code,
      name,
      description
    );
  }

  async update(id: number, body: unknown) {
    const existing = await this.courses.find(id);

    if (!existing) {
      throw new AppError(404, 'Course not found');
    }

    if (!body || typeof body !== 'object') {
      throw new AppError(400, 'Invalid course data');
    }

    const input = body as Record<string, unknown>;

    const code = requireString(
      input.code,
      'Code'
    ).toUpperCase();

    const name = requireString(
      input.name,
      'Name'
    );

    const description =
      input.description === null ||
      input.description === undefined
        ? null
        : requireString(input.description, 'Description');

    const updated = await this.courses.update(
      id,
      code,
      name,
      description
    );

    if (!updated) {
      throw new AppError(404, 'Course not found');
    }

    return updated;
  }

  async delete(id: number) {
    const existing = await this.courses.find(id);

    if (!existing) {
      throw new AppError(404, 'Course not found');
    }

    if (await this.courses.hasExams(id)) {
      throw new AppError(
        409,
        'Cannot delete a course that has exams'
      );
    }

    await this.courses.delete(id);

    return {
      message: 'Course deleted'
    };
  }
}