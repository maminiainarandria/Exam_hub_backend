import { ExamRepository } from '../Repositorie/ExamRepository.js';
import { CourseRepository } from '../Repositorie/CourseRepository.js';
import { AppError } from '../Utils/AppError.js';
import { requireId, requireString } from '../Utils/validation.js';

function parseDate(value: unknown, field: string): string {
  if (
    typeof value !== 'string' ||
    Number.isNaN(Date.parse(value))
  ) {
    throw new AppError(400, `${field} is invalid`);
  }

  return new Date(value).toISOString();
}

export class ExamService {
  constructor(
    private exams = new ExamRepository(),
    private courses = new CourseRepository()
  ) {}

  list() {
    return this.exams.listAdmin();
  }

  async get(id: number) {
    const exam = await this.exams.findAdmin(id);

    if (!exam) {
      throw new AppError(404, 'Exam not found');
    }

    return exam;
  }

  async create(body: unknown) {
    if (!body || typeof body !== 'object') {
      throw new AppError(400, 'Invalid exam data');
    }

    const input = body as Record<string, unknown>;

    const courseId = requireId(
      input.course_id,
      'course_id'
    );

    if (!await this.courses.find(courseId)) {
      throw new AppError(400, 'Course not found');
    }

    const title = requireString(
      input.title,
      'Title'
    );

    const description =
      typeof input.description === 'string'
        ? input.description.trim()
        : '';

    const startsAt = parseDate(
      input.starts_at,
      'starts_at'
    );

    const endsAt = parseDate(
      input.ends_at,
      'ends_at'
    );

    if (new Date(endsAt) <= new Date(startsAt)) {
      throw new AppError(
        400,
        'End date must be after start date'
      );
    }

    return this.exams.create(
      courseId,
      title,
      description,
      startsAt,
      endsAt
    );
  }

  async update(id: number, body: unknown) {
    const existing = await this.get(id);

    if (!body || typeof body !== 'object') {
      throw new AppError(400, 'Invalid exam data');
    }

    const input = body as Record<string, unknown>;

    const courseId = requireId(
      input.course_id ?? existing.course_id,
      'course_id'
    );

    if (!await this.courses.find(courseId)) {
      throw new AppError(400, 'Course not found');
    }

    const title = requireString(
      input.title ?? existing.title,
      'Title'
    );

    const description =
      typeof input.description === 'string'
        ? input.description.trim()
        : existing.description;

    const startsAt =
      input.starts_at !== undefined
        ? parseDate(input.starts_at, 'starts_at')
        : new Date(existing.starts_at).toISOString();

    const endsAt =
      input.ends_at !== undefined
        ? parseDate(input.ends_at, 'ends_at')
        : new Date(existing.ends_at).toISOString();

    if (new Date(endsAt) <= new Date(startsAt)) {
      throw new AppError(
        400,
        'End date must be after start date'
      );
    }

    return this.exams.update(
      id,
      courseId,
      title,
      description,
      startsAt,
      endsAt
    );
  }

  async delete(id: number) {
    if (!await this.exams.exists(id)) {
      throw new AppError(404, 'Exam not found');
    }

    if (await this.exams.hasAttempts(id)) {
      throw new AppError(
        409,
        'Cannot delete an exam that has attempts'
      );
    }

    await this.exams.delete(id);

    return {
      message: 'Exam deleted'
    };
  }

  async results(id: number) {
    const data = await this.exams.results(id);

    if (!data) {
      throw new AppError(404, 'Exam not found');
    }

    return data;
  }
}