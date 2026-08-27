import { pool } from '../Config/db.js';

export class UserRepository {
  async findByEmail(email: string) {
    const { rows } = await pool.query(
      `SELECT id, name, email, password_hash, role, active
       FROM users WHERE lower(email) = lower($1) LIMIT 1`,
      [email]
    );
    return rows[0] ?? null;
  }

  async listStudents() {
    const { rows } = await pool.query(
      `SELECT id, name, email, active, created_at, updated_at
       FROM users WHERE role = 'student' ORDER BY name, id`
    );
    return rows;
  }

  async findStudent(id: number) {
    const { rows } = await pool.query(
      `SELECT id, name, email, active, created_at, updated_at
       FROM users WHERE id = $1 AND role = 'student'`,
      [id]
    );
    return rows[0] ?? null;
  }

  async createStudent(name: string, email: string, passwordHash: string) {
    const { rows } = await pool.query(
      `INSERT INTO users(name, email, password_hash, role, active)
       VALUES($1, $2, $3, 'student', TRUE)
       RETURNING id, name, email, active, created_at`,
      [name, email, passwordHash]
    );
    return rows[0];
  }

  async updateStudent(id: number, name: string, email: string, passwordHash?: string) {
    const query = passwordHash
      ? `UPDATE users SET name=$2, email=$3, password_hash=$4
         WHERE id=$1 AND role='student'
         RETURNING id, name, email, active, updated_at`
      : `UPDATE users SET name=$2, email=$3
         WHERE id=$1 AND role='student'
         RETURNING id, name, email, active, updated_at`;
    const params = passwordHash ? [id, name, email, passwordHash] : [id, name, email];
    const { rows } = await pool.query(query, params);
    return rows[0] ?? null;
  }

  async setStudentActive(id: number, active: boolean) {
    const { rows } = await pool.query(
      `UPDATE users SET active=$2 WHERE id=$1 AND role='student'
       RETURNING id, name, email, active, updated_at`,
      [id, active]
    );
    return rows[0] ?? null;
  }

  async countStudents() {
    const { rows } = await pool.query(`SELECT COUNT(*)::int AS count FROM users WHERE role='student'`);
    return rows[0].count as number;
  }
}
