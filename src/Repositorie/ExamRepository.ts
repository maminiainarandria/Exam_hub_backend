import { pool } from '../Config/db.js';

export class ExamRepository {
  async listAdmin() {
    const { rows } = await pool.query(
      `SELECT e.id, e.course_id, c.code AS course_code, c.name AS course_name,
              e.title, e.description, e.starts_at, e.ends_at,
              EXISTS(SELECT 1 FROM attempts a WHERE a.exam_id=e.id) AS locked,
              (SELECT COUNT(*)::int FROM questions q WHERE q.exam_id=e.id) AS question_count,
              (SELECT COUNT(*)::int FROM attempts a WHERE a.exam_id=e.id) AS attempt_count
       FROM exams e JOIN courses c ON c.id=e.course_id
       ORDER BY e.starts_at DESC, e.id DESC`
    );
    return rows;
  }

  async findAdmin(id: number) {
    const { rows } = await pool.query(
      `SELECT e.*, c.code AS course_code, c.name AS course_name,
              EXISTS(SELECT 1 FROM attempts a WHERE a.exam_id=e.id) AS locked
       FROM exams e JOIN courses c ON c.id=e.course_id WHERE e.id=$1`,
      [id]
    );
    return rows[0] ?? null;
  }

  async create(courseId: number, title: string, description: string, startsAt: string, endsAt: string) {
    const { rows } = await pool.query(
      `INSERT INTO exams(course_id,title,description,starts_at,ends_at)
       VALUES($1,$2,$3,$4,$5)
       RETURNING *`,
      [courseId, title, description, startsAt, endsAt]
    );
    return rows[0];
  }

  async update(id: number, courseId: number, title: string, description: string, startsAt: string, endsAt: string) {
    const { rows } = await pool.query(
      `UPDATE exams SET course_id=$2,title=$3,description=$4,starts_at=$5,ends_at=$6
       WHERE id=$1 RETURNING *`,
      [id, courseId, title, description, startsAt, endsAt]
    );
    return rows[0] ?? null;
  }

  async hasAttempts(id: number) {
    const { rows } = await pool.query(`SELECT EXISTS(SELECT 1 FROM attempts WHERE exam_id=$1) AS exists`, [id]);
    return rows[0].exists as boolean;
  }

  async delete(id: number) {
    const result = await pool.query(`DELETE FROM exams WHERE id=$1`, [id]);
    return result.rowCount === 1;
  }

  async listAvailableForStudent(studentId: number) {
    const { rows } = await pool.query(
      `SELECT e.id, e.title, e.description, e.starts_at, e.ends_at,
              c.code AS course_code, c.name AS course_name,
              COUNT(q.id)::int AS question_count,
              COALESCE(SUM(q.points),0)::float AS max_score
       FROM exams e
       JOIN courses c ON c.id=e.course_id
       LEFT JOIN questions q ON q.exam_id=e.id
       WHERE NOW() BETWEEN e.starts_at AND e.ends_at
         AND NOT EXISTS (
           SELECT 1 FROM attempts a WHERE a.exam_id=e.id AND a.student_id=$1
         )
       GROUP BY e.id, c.id
       ORDER BY e.ends_at ASC`,
      [studentId]
    );
    return rows;
  }

  async findAvailableForStudent(examId: number, studentId: number) {
    const { rows } = await pool.query(
      `SELECT e.id, e.title, e.description, e.starts_at, e.ends_at,
              c.code AS course_code, c.name AS course_name
       FROM exams e JOIN courses c ON c.id=e.course_id
       WHERE e.id=$1
         AND NOW() BETWEEN e.starts_at AND e.ends_at
         AND NOT EXISTS (
           SELECT 1 FROM attempts a WHERE a.exam_id=e.id AND a.student_id=$2
         )`,
      [examId, studentId]
    );
    return rows[0] ?? null;
  }

  async exists(id: number) {
    const { rows } = await pool.query(`SELECT EXISTS(SELECT 1 FROM exams WHERE id=$1) AS exists`, [id]);
    return rows[0].exists as boolean;
  }

  async results(examId: number) {
    const summary = await pool.query(
      `SELECT e.id, e.title, c.code AS course_code,
              COUNT(a.id)::int AS attempt_count,
              COALESCE(AVG(a.score),0)::float AS average_score,
              COALESCE(MAX(a.max_score),0)::float AS max_score
       FROM exams e JOIN courses c ON c.id=e.course_id
       LEFT JOIN attempts a ON a.exam_id=e.id
       WHERE e.id=$1
       GROUP BY e.id, c.id`,
      [examId]
    );
    if (!summary.rows[0]) return null;
    const attempts = await pool.query(
      `SELECT a.id AS attempt_id, u.id AS student_id, u.name AS student_name, u.email,
              a.score::float, a.max_score::float, a.submitted_at, 1::int AS attempt_count
       FROM attempts a JOIN users u ON u.id=a.student_id
       WHERE a.exam_id=$1 ORDER BY a.score DESC, u.name`,
      [examId]
    );
    return { ...summary.rows[0], students: attempts.rows };
  }

  async count() {
    const { rows } = await pool.query(`SELECT COUNT(*)::int AS count FROM exams`);
    return rows[0].count as number;
  }
}
