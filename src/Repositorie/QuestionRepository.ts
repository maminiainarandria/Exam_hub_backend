import { pool } from '../Config/db.js';
import type { QuestionInput } from '../Model/types.js';

export class QuestionRepository {
  async listAdmin(examId: number) {
    const { rows } = await pool.query(
      `SELECT q.id,
              q.exam_id,
              q.statement,
              q.points::int AS points,
              q.position,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', c.id,
                    'text', c.label,
                    'is_correct', c.is_correct
                  )
                  ORDER BY c.position
                ) FILTER (WHERE c.id IS NOT NULL),
                '[]'::json
              ) AS choices
       FROM questions q
       LEFT JOIN choices c ON c.question_id = q.id
       WHERE q.exam_id = $1
       GROUP BY q.id
       ORDER BY q.position`,
      [examId]
    );

    return rows;
  }

  async listForStudent(examId: number) {
    const { rows } = await pool.query(
      `SELECT q.id,
              q.statement,
              q.points::int AS points,
              q.position,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', c.id,
                    'text', c.label
                  )
                  ORDER BY c.position
                ) FILTER (WHERE c.id IS NOT NULL),
                '[]'::json
              ) AS choices
       FROM questions q
       LEFT JOIN choices c ON c.question_id = q.id
       WHERE q.exam_id = $1
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

      const position = input.position ?? 1;

      const questionResult = await client.query(
        `INSERT INTO questions(
          exam_id,
          statement,
          points,
          position
        )
        VALUES($1, $2, $3, $4)
        RETURNING
          id,
          exam_id,
          statement,
          points::int AS points,
          position`,
        [
          examId,
          input.statement,
          input.points ?? 1,
          position
        ]
      );

      const question = questionResult.rows[0];
      const choices = [];

      for (let i = 0; i < input.choices.length; i += 1) {
        const choice = input.choices[i]!;

        const result = await client.query(
          `INSERT INTO choices(
            question_id,
            label,
            is_correct,
            position
          )
          VALUES($1, $2, $3, $4)
          RETURNING
            id,
            label AS text,
            is_correct`,
          [
            question.id,
            choice.label,
            choice.isCorrect,
            i + 1
          ]
        );

        choices.push(result.rows[0]);
      }

      await client.query('COMMIT');

      return {
        ...question,
        choices
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async find(id: number) {
    const { rows } = await pool.query(
      `SELECT
        id,
        exam_id,
        statement,
        points::int AS points,
        position
       FROM questions
       WHERE id = $1`,
      [id]
    );

    return rows[0] ?? null;
  }

  async update(id: number, input: QuestionInput) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const currentResult = await client.query(
        `SELECT position
         FROM questions
         WHERE id = $1`,
        [id]
      );

      if (!currentResult.rows[0]) {
        await client.query('ROLLBACK');
        return null;
      }

      const position =
        input.position ?? Number(currentResult.rows[0].position);

      const questionResult = await client.query(
        `UPDATE questions
         SET statement = $2,
             points = $3,
             position = $4
         WHERE id = $1
         RETURNING
           id,
           exam_id,
           statement,
           points::int AS points,
           position`,
        [
          id,
          input.statement,
          input.points ?? 1,
          position
        ]
      );

      const question = questionResult.rows[0];

      await client.query(
        `DELETE FROM choices
         WHERE question_id = $1`,
        [id]
      );

      const choices = [];

      for (let i = 0; i < input.choices.length; i += 1) {
        const choice = input.choices[i]!;

        const result = await client.query(
          `INSERT INTO choices(
            question_id,
            label,
            is_correct,
            position
          )
          VALUES($1, $2, $3, $4)
          RETURNING
            id,
            label AS text,
            is_correct`,
          [
            id,
            choice.label,
            choice.isCorrect,
            i + 1
          ]
        );

        choices.push(result.rows[0]);
      }

      await client.query('COMMIT');

      return {
        ...question,
        choices
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async delete(id: number) {
    const result = await pool.query(
      `DELETE FROM questions
       WHERE id = $1`,
      [id]
    );

    return result.rowCount === 1;
  }
}