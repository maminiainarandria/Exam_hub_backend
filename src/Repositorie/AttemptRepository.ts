import type { PoolClient } from 'pg';
import { pool } from '../Config/db.js';

export class AttemptRepository {
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async lockExam(client: PoolClient, examId: number) {
    const { rows } = await client.query(
      `SELECT id, title, starts_at, ends_at, NOW() AS server_now
       FROM exams WHERE id=$1 FOR UPDATE`,
      [examId]
    );
    return rows[0] ?? null;
  }

  async findAttempt(client: PoolClient, examId: number, studentId: number) {
    const { rows } = await client.query(
      `SELECT id FROM attempts WHERE exam_id=$1 AND student_id=$2`,
      [examId, studentId]
    );
    return rows[0] ?? null;
  }

  async scoringRows(client: PoolClient, examId: number) {
    const { rows } = await client.query(
      `SELECT q.id AS question_id, q.statement, q.points::float,
              c.id AS choice_id, c.label AS choice_label, c.is_correct, c.position AS choice_position,
              q.position AS question_position
       FROM questions q
       JOIN choices c ON c.question_id=q.id
       WHERE q.exam_id=$1
       ORDER BY q.position, c.position`,
      [examId]
    );
    return rows;
  }

  async insertAttempt(client: PoolClient, examId: number, studentId: number, score: number, maxScore: number) {
    const { rows } = await client.query(
      `INSERT INTO attempts(exam_id,student_id,score,max_score)
       VALUES($1,$2,$3,$4)
       RETURNING id, submitted_at, score::float, max_score::float`,
      [examId, studentId, score, maxScore]
    );
    return rows[0];
  }

  async insertAnswer(client: PoolClient, attemptId: number, questionId: number, choiceId: number | null) {
    await client.query(
      `INSERT INTO answers(attempt_id,question_id,choice_id) VALUES($1,$2,$3)`,
      [attemptId, questionId, choiceId]
    );
  }

 async history(studentId: number) {
  const { rows } = await pool.query(
    `SELECT
       a.exam_id,
       e.title,
       c.code AS course_code,
       a.score::int AS score,
       a.max_score::int AS total_points,
       a.submitted_at
     FROM attempts a
     JOIN exams e ON e.id = a.exam_id
     JOIN courses c ON c.id = e.course_id
     WHERE a.student_id = $1
     ORDER BY a.submitted_at DESC`,
    [studentId]
  );

  return rows;
}

  async detailedResult(studentId: number, examId: number) {
    const attemptResult = await pool.query(
      `SELECT a.id AS attempt_id, a.exam_id, e.title, c.code AS course_code, c.name AS course_name,
              a.score::float, a.max_score::float, a.submitted_at
       FROM attempts a
       JOIN exams e ON e.id=a.exam_id
       JOIN courses c ON c.id=e.course_id
       WHERE a.student_id=$1 AND a.exam_id=$2`,
      [studentId, examId]
    );
    const attempt = attemptResult.rows[0];
    if (!attempt) return null;

    const { rows } = await pool.query(
      `SELECT q.id AS question_id, q.statement, q.points::float,
              ans.choice_id AS selected_choice_id,
              correct.id AS correct_choice_id,
              (ans.choice_id = correct.id) AS is_correct
       FROM questions q
       JOIN attempts a ON a.exam_id=q.exam_id AND a.id=$1
       LEFT JOIN answers ans ON ans.attempt_id=a.id AND ans.question_id=q.id
       JOIN choices correct ON correct.question_id=q.id AND correct.is_correct=TRUE
       ORDER BY q.position`,
      [attempt.attempt_id]
    );

    const corrections = [];
    for (const row of rows) {
      const choicesResult = await pool.query(
        `SELECT id, label, position FROM choices WHERE question_id=$1 ORDER BY position`,
        [row.question_id]
      );
      corrections.push({
        questionId: row.question_id,
        statement: row.statement,
        points: row.points,
        selectedChoiceId: row.selected_choice_id,
        correctChoiceId: row.correct_choice_id,
        isCorrect: row.is_correct === true,
        earnedPoints: row.is_correct === true ? row.points : 0,
        choices: choicesResult.rows
      });
    }
    return {
      ...attempt,
      percentage: attempt.max_score === 0 ? 0 : Math.round((attempt.score / attempt.max_score) * 10000) / 100,
      corrections
    };
  }
}
