import { pool } from '../Config/db.js';

export class ExamRepository {
  async listAdmin() {
    const { rows } = await pool.query(
      `SELECT
         e.id,
         e.title,
         e.description,
         e.starts_at,
         e.ends_at,
         json_build_object(
           'id', c.id,
           'code', c.code,
           'name', c.name
         ) AS course,
         (
           SELECT COUNT(*)::int
           FROM questions q
           WHERE q.exam_id = e.id
         ) AS question_count,
         (
           SELECT COUNT(*)::int
           FROM attempts a
           WHERE a.exam_id = e.id
         ) AS attempt_count
       FROM exams e
       JOIN courses c ON c.id = e.course_id
       ORDER BY e.starts_at DESC, e.id DESC`
    );

    return rows;
  }

  async findAdmin(id: number) {
    const { rows } = await pool.query(
      `SELECT
         e.id,
         e.course_id,
         e.title,
         e.description,
         e.starts_at,
         e.ends_at,
         json_build_object(
           'id', c.id,
           'code', c.code,
           'name', c.name
         ) AS course,
         (
           SELECT COUNT(*)::int
           FROM questions q
           WHERE q.exam_id = e.id
         ) AS question_count,
         (
           SELECT COUNT(*)::int
           FROM attempts a
           WHERE a.exam_id = e.id
         ) AS attempt_count
       FROM exams e
       JOIN courses c ON c.id = e.course_id
       WHERE e.id = $1`,
      [id]
    );

    return rows[0] ?? null;
  }

  async create(
    courseId: number,
    title: string,
    description: string,
    startsAt: string,
    endsAt: string
  ) {
    const { rows } = await pool.query(
      `INSERT INTO exams(
         course_id,
         title,
         description,
         starts_at,
         ends_at
       )
       VALUES($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        courseId,
        title,
        description,
        startsAt,
        endsAt
      ]
    );

    return this.findAdmin(Number(rows[0].id));
  }

  async update(
    id: number,
    courseId: number,
    title: string,
    description: string,
    startsAt: string,
    endsAt: string
  ) {
    const { rows } = await pool.query(
      `UPDATE exams
       SET course_id = $2,
           title = $3,
           description = $4,
           starts_at = $5,
           ends_at = $6
       WHERE id = $1
       RETURNING id`,
      [
        id,
        courseId,
        title,
        description,
        startsAt,
        endsAt
      ]
    );

    if (!rows[0]) {
      return null;
    }

    return this.findAdmin(Number(rows[0].id));
  }

  async hasAttempts(id: number) {
    const { rows } = await pool.query(
      `SELECT EXISTS(
         SELECT 1
         FROM attempts
         WHERE exam_id = $1
       ) AS exists`,
      [id]
    );

    return rows[0].exists as boolean;
  }

  async delete(id: number) {
    const result = await pool.query(
      `DELETE FROM exams
       WHERE id = $1`,
      [id]
    );

    return result.rowCount === 1;
  }

  async listAvailableForStudent(studentId: number) {
    const { rows } = await pool.query(
      `SELECT
         e.id,
         e.title,
         json_build_object(
           'code', c.code,
           'name', c.name
         ) AS course,
         e.description,
         e.ends_at,
         COUNT(q.id)::int AS question_count,
         COALESCE(SUM(q.points), 0)::int AS total_points
       FROM exams e
       JOIN courses c ON c.id = e.course_id
       LEFT JOIN questions q ON q.exam_id = e.id
       WHERE NOW() BETWEEN e.starts_at AND e.ends_at
         AND NOT EXISTS (
           SELECT 1
           FROM attempts a
           WHERE a.exam_id = e.id
             AND a.student_id = $1
         )
       GROUP BY e.id, c.id
       ORDER BY e.ends_at ASC`,
      [studentId]
    );

    return rows;
  }

  async findAvailableForStudent(
    examId: number,
    studentId: number
  ) {
    const { rows } = await pool.query(
      `SELECT
         e.id,
         e.title,
         json_build_object(
           'code', c.code,
           'name', c.name
         ) AS course,
         e.description,
         e.ends_at,
         COUNT(q.id)::int AS question_count,
         COALESCE(SUM(q.points), 0)::int AS total_points
       FROM exams e
       JOIN courses c ON c.id = e.course_id
       LEFT JOIN questions q ON q.exam_id = e.id
       WHERE e.id = $1
         AND NOW() BETWEEN e.starts_at AND e.ends_at
         AND NOT EXISTS (
           SELECT 1
           FROM attempts a
           WHERE a.exam_id = e.id
             AND a.student_id = $2
         )
       GROUP BY e.id, c.id`,
      [examId, studentId]
    );

    return rows[0] ?? null;
  }
async hasStudentAttempt(
  examId: number,
  studentId: number
) {
  const { rows } = await pool.query(
    `SELECT EXISTS(
       SELECT 1
       FROM attempts
       WHERE exam_id = $1
         AND student_id = $2
     ) AS exists`,
    [examId, studentId]
  );

  return rows[0].exists as boolean;
}





  async exists(id: number) {
    const { rows } = await pool.query(
      `SELECT EXISTS(
         SELECT 1
         FROM exams
         WHERE id = $1
       ) AS exists`,
      [id]
    );

    return rows[0].exists as boolean;
  }

  async results(examId: number) {
    const summary = await pool.query(
      `SELECT
         e.id,
         e.title,
         COALESCE(
           (
             SELECT SUM(q.points)
             FROM questions q
             WHERE q.exam_id = e.id
           ),
           0
         )::int AS total_points,
         CASE
           WHEN COUNT(a.id) = 0 THEN NULL
           ELSE ROUND(AVG(a.score), 2)::float
         END AS average,
         COUNT(a.id)::int AS attempt_count
       FROM exams e
       LEFT JOIN attempts a ON a.exam_id = e.id
       WHERE e.id = $1
       GROUP BY e.id`,
      [examId]
    );

    const exam = summary.rows[0];

    if (!exam) {
      return null;
    }

    const attempts = await pool.query(
      `SELECT
         u.id AS student_id,
         u.name,
         a.score::int AS score,
         a.submitted_at
       FROM attempts a
       JOIN users u ON u.id = a.student_id
       WHERE a.exam_id = $1
       ORDER BY a.score DESC, u.name ASC`,
      [examId]
    );

    return {
      exam: {
        id: Number(exam.id),
        title: exam.title
      },
      total_points: Number(exam.total_points),
      average:
        exam.average === null
          ? null
          : Number(exam.average),
      attempt_count: Number(exam.attempt_count),
      results: attempts.rows
    };
  }

  async count() {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM exams`
    );

    return rows[0].count as number;
  }
}