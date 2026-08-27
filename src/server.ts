import { app } from './app.js';
import { env } from './Config/env.js';
import { pool } from './Config/db.js';

async function start() {
  await pool.query('SELECT 1');
  app.listen(env.port, () => {
    console.log(`Exam Hub API démarrée sur http://localhost:${env.port}`);
  });
}

start().catch((error) => {
  console.error('Démarrage impossible', error);
  process.exit(1);
});
