import { pool } from '../Config/db.js';

export class CourseRepository {
  async list() {
    const { rows } = await pool.query(
      `SELECT c.id, c.code, c.name, c.description, c.created_at, c.updated_at,
              COUNT(e.id)::int AS exam_count
       FROM courses c
       LEFT JOIN exams e ON e.course_id = c.id
       GROUP BY c.id
       ORDER BY c.code`
    );
    return rows;
  }

  async find(id: number) {
    const { rows } = await pool.query(`SELECT * FROM courses WHERE id=$1`, [id]);
    return rows[0] ?? null;
  }

  async create(code: string, name: string, description: string) {
    const { rows } = await pool.query(
      `INSERT INTO courses(code, name, description) VALUES($1,$2,$3)
       RETURNING id, code, name, description, created_at`,
      [code, name, description]
    );
    return rows[0];
  }

  async update(id: number, code: string, name: string, description: string) {
    const { rows } = await pool.query(
      `UPDATE courses SET code=$2, name=$3, description=$4 WHERE id=$1
       RETURNING id, code, name, description, updated_at`,
      [id, code, name, description]
    );
    return rows[0] ?? null;
  }

  async hasExams(id: number) {
    const { rows } = await pool.query(`SELECT EXISTS(SELECT 1 FROM exams WHERE course_id=$1) AS exists`, [id]);
    return rows[0].exists as boolean;
  }

  async delete(id: number) {
    const result = await pool.query(`DELETE FROM courses WHERE id=$1`, [id]);
    return result.rowCount === 1;
  }

  async count() {
    const { rows } = await pool.query(`SELECT COUNT(*)::int AS count FROM courses`);
    return rows[0].count as number;
  }
}
