import { pool } from '../Config/db.js';
import type { QuestionInput } from '../Model/types.js';

export class QuestionRepository {
  async listAdmin(examId: number) {
    const { rows } = await pool.query(
      `SELECT q.id, q.exam_id, q.statement, q.points::float, q.position,
              COALESCE(json_agg(
                json_build_object(
                  'id', c.id,
                  'label', c.label,
                  'isCorrect', c.is_correct,
                  'position', c.position
                ) ORDER BY c.position
              ) FILTER (WHERE c.id IS NOT NULL), '[]'::json) AS choices
       FROM questions q
       LEFT JOIN choices c ON c.question_id=q.id
       WHERE q.exam_id=$1
       GROUP BY q.id
       ORDER BY q.position`,
      [examId]
    );
    return rows;
  }

  async listForStudent(examId: number) {
    const { rows } = await pool.query(
      `SELECT q.id, q.statement, q.points::float, q.position,
              COALESCE(json_agg(
                json_build_object('id', c.id, 'label', c.label, 'position', c.position)
                ORDER BY c.position
              ) FILTER (WHERE c.id IS NOT NULL), '[]'::json) AS choices
       FROM questions q
       LEFT JOIN choices c ON c.question_id=q.id
       WHERE q.exam_id=$1
       GROUP BY q.id
       ORDER BY q.position`,
      [examId]
    );
    return rows;
  }

  async create(examId: number, input: QuestionInput) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const positionResult = await client.query(
        `SELECT COALESCE(MAX(position),0)+1 AS next_position FROM questions WHERE exam_id=$1`,
        [examId]
      );
      const position = Number(positionResult.rows[0].next_position);
      const questionResult = await client.query(
        `INSERT INTO questions(exam_id, statement, points, position)
         VALUES($1,$2,$3,$4) RETURNING id, exam_id, statement, points::float, position`,
        [examId, input.statement, input.points ?? 1, position]
      );
      const question = questionResult.rows[0];
      const choices = [];
      for (let i = 0; i < input.choices.length; i += 1) {
        const choice = input.choices[i]!;
        const result = await client.query(
          `INSERT INTO choices(question_id,label,is_correct,position)
           VALUES($1,$2,$3,$4)
           RETURNING id,label,is_correct AS "isCorrect",position`,
          [question.id, choice.label, choice.isCorrect, i + 1]
        );
        choices.push(result.rows[0]);
      }
      await client.query('COMMIT');
      return { ...question, choices };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async find(id: number) {
    const { rows } = await pool.query(`SELECT id, exam_id, statement, points::float, position FROM questions WHERE id=$1`, [id]);
    return rows[0] ?? null;
  }

  async update(id: number, input: QuestionInput) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const questionResult = await client.query(
        `UPDATE questions SET statement=$2, points=$3 WHERE id=$1
         RETURNING id, exam_id, statement, points::float, position`,
        [id, input.statement, input.points ?? 1]
      );
      const question = questionResult.rows[0];
      if (!question) {
        await client.query('ROLLBACK');
        return null;
      }
      await client.query(`DELETE FROM choices WHERE question_id=$1`, [id]);
      const choices = [];
      for (let i = 0; i < input.choices.length; i += 1) {
        const choice = input.choices[i]!;
        const result = await client.query(
          `INSERT INTO choices(question_id,label,is_correct,position)
           VALUES($1,$2,$3,$4)
           RETURNING id,label,is_correct AS "isCorrect",position`,
          [id, choice.label, choice.isCorrect, i + 1]
        );
        choices.push(result.rows[0]);
      }
      await client.query('COMMIT');
      return { ...question, choices };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async delete(id: number) {
    const result = await pool.query(`DELETE FROM questions WHERE id=$1`, [id]);
    return result.rowCount === 1;
  }
}
