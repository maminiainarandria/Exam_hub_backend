BEGIN;

INSERT INTO users(name, email, password_hash, role, active)
VALUES
  ('Administrateur Exam Hub', 'admin@examhub.local', crypt('Admin123!', gen_salt('bf', 12)), 'admin', TRUE),
  ('Alice Étudiante', 'alice@examhub.local', crypt('Student123!', gen_salt('bf', 12)), 'student', TRUE),
  ('Bob Étudiant', 'bob@examhub.local', crypt('Student123!', gen_salt('bf', 12)), 'student', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO courses(code, name, description)
VALUES ('WEB2', 'Web 2', 'Développement web moderne : API, React, sécurité et base de données.')
ON CONFLICT (code) DO NOTHING;

INSERT INTO exams(course_id, title, description, starts_at, ends_at)
SELECT id, 'QCM de démonstration', 'Examen de test installé par seed.sql', NOW() - INTERVAL '1 day', NOW() + INTERVAL '30 days'
FROM courses
WHERE code = 'WEB2'
AND NOT EXISTS (SELECT 1 FROM exams WHERE title = 'QCM de démonstration');

WITH target_exam AS (
  SELECT id FROM exams WHERE title = 'QCM de démonstration' ORDER BY id LIMIT 1
), inserted_question AS (
  INSERT INTO questions(exam_id, statement, points, position)
  SELECT id, 'Quel protocole est couramment utilisé par une API web ?', 1, 1
  FROM target_exam
  WHERE NOT EXISTS (
    SELECT 1 FROM questions q WHERE q.exam_id = target_exam.id AND q.position = 1
  )
  RETURNING id
)
INSERT INTO choices(question_id, label, is_correct, position)
SELECT id, x.label, x.is_correct, x.position
FROM inserted_question
CROSS JOIN (VALUES
  ('HTTP', TRUE, 1),
  ('SMTP', FALSE, 2),
  ('IMAP', FALSE, 3)
) AS x(label, is_correct, position);

COMMIT;
