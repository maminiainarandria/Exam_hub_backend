import { pool } from '../Config/db.js';

export class CourseRepository {
  async list() {
    const { rows } = await pool.query(
      `SELECT
         c.id,
         c.code,
         c.name,
         c.description,
         COUNT(e.id)::int AS exam_count
       FROM courses c
       LEFT JOIN exams e ON e.course_id = c.id
       GROUP BY c.id
       ORDER BY c.code`
    );

    return rows;
  }

  async find(id: number) {
    const { rows } = await pool.query(
      `SELECT
         id,
         code,
         name,
         description
       FROM courses
       WHERE id = $1`,
      [id]
    );

    return rows[0] ?? null;
  }

  async findWithExamCount(id: number) {
    const { rows } = await pool.query(
      `SELECT
         c.id,
         c.code,
         c.name,
         c.description,
         COUNT(e.id)::int AS exam_count
       FROM courses c
       LEFT JOIN exams e ON e.course_id = c.id
       WHERE c.id = $1
       GROUP BY c.id`,
      [id]
    );

    return rows[0] ?? null;
  }

  async create(
    code: string,
    name: string,
    description: string | null
  ) {
    const { rows } = await pool.query(
      `INSERT INTO courses(
         code,
         name,
         description
       )
       VALUES($1, $2, $3)
       RETURNING id`,
      [code, name, description]
    );

    return this.findWithExamCount(Number(rows[0].id));
  }

  async update(
    id: number,
    code: string,
    name: string,
    description: string | null
  ) {
    const { rows } = await pool.query(
      `UPDATE courses
       SET code = $2,
           name = $3,
           description = $4
       WHERE id = $1
       RETURNING id`,
      [id, code, name, description]
    );

    if (!rows[0]) {
      return null;
    }

    return this.findWithExamCount(Number(rows[0].id));
  }

  async hasExams(id: number) {
    const { rows } = await pool.query(
      `SELECT EXISTS(
         SELECT 1
         FROM exams
         WHERE course_id = $1
       ) AS exists`,
      [id]
    );

    return rows[0].exists as boolean;
  }

  async delete(id: number) {
    const result = await pool.query(
      `DELETE FROM courses
       WHERE id = $1`,
      [id]
    );

    return result.rowCount === 1;
  }

  async count() {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM courses`
    );

    return rows[0].count as number;
  }
}