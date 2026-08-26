CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL CHECK (char_length(trim(name)) >= 2),
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'student')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX ux_users_email_lower ON users (lower(email));

CREATE TABLE courses (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(30) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE exams (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
  title VARCHAR(180) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_exam_window CHECK (ends_at > starts_at)
);
CREATE INDEX ix_exams_course_id ON exams(course_id);
CREATE INDEX ix_exams_window ON exams(starts_at, ends_at);

CREATE TABLE questions (
  id BIGSERIAL PRIMARY KEY,
  exam_id BIGINT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  statement TEXT NOT NULL CHECK (char_length(trim(statement)) > 0),
  points NUMERIC(8,2) NOT NULL DEFAULT 1 CHECK (points > 0),
  position INTEGER NOT NULL DEFAULT 1 CHECK (position > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(exam_id, position)
);
CREATE INDEX ix_questions_exam_id ON questions(exam_id);

CREATE TABLE choices (
  id BIGSERIAL PRIMARY KEY,
  question_id BIGINT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  label TEXT NOT NULL CHECK (char_length(trim(label)) > 0),
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  position INTEGER NOT NULL DEFAULT 1 CHECK (position > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(question_id, position),
  UNIQUE(id, question_id)
);
CREATE INDEX ix_choices_question_id ON choices(question_id);
CREATE UNIQUE INDEX ux_choices_one_correct_max ON choices(question_id) WHERE is_correct = TRUE;

CREATE TABLE attempts (
  id BIGSERIAL PRIMARY KEY,
  exam_id BIGINT NOT NULL REFERENCES exams(id) ON DELETE RESTRICT,
  student_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  score NUMERIC(10,2) NOT NULL CHECK (score >= 0),
  max_score NUMERIC(10,2) NOT NULL CHECK (max_score >= 0),
  CONSTRAINT ck_attempt_score CHECK (score <= max_score),
  CONSTRAINT uq_attempt_exam_student UNIQUE(exam_id, student_id)
);
CREATE INDEX ix_attempts_exam_id ON attempts(exam_id);
CREATE INDEX ix_attempts_student_id ON attempts(student_id);

CREATE TABLE answers (
  attempt_id BIGINT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  question_id BIGINT NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  choice_id BIGINT NULL,
  PRIMARY KEY (attempt_id, question_id),
  CONSTRAINT fk_answer_choice_same_question
    FOREIGN KEY (choice_id, question_id)
    REFERENCES choices(id, question_id)
    ON DELETE RESTRICT
);
CREATE INDEX ix_answers_question_id ON answers(question_id);

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_touch BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_courses_touch BEFORE UPDATE ON courses
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_exams_touch BEFORE UPDATE ON exams
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_questions_touch BEFORE UPDATE ON questions
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE OR REPLACE FUNCTION validate_question_choices(p_question_id BIGINT)
RETURNS VOID AS $$
DECLARE
  total_choices INTEGER;
  correct_choices INTEGER;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM questions WHERE id = p_question_id) THEN
    RETURN;
  END IF;

  SELECT COUNT(*), COUNT(*) FILTER (WHERE is_correct)
    INTO total_choices, correct_choices
  FROM choices
  WHERE question_id = p_question_id;

  IF total_choices < 2 OR total_choices > 6 THEN
    RAISE EXCEPTION 'Une question doit avoir entre 2 et 6 choix.' USING ERRCODE = '23514';
  END IF;

  IF correct_choices <> 1 THEN
    RAISE EXCEPTION 'Une question doit avoir exactement un choix correct.' USING ERRCODE = '23514';
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_validate_question_row()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM validate_question_choices(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_validate_choice_row()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM validate_question_choices(OLD.question_id);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM validate_question_choices(OLD.question_id);
    IF NEW.question_id <> OLD.question_id THEN
      PERFORM validate_question_choices(NEW.question_id);
    END IF;
    RETURN NEW;
  ELSE
    PERFORM validate_question_choices(NEW.question_id);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER ctrg_questions_choices_valid
AFTER INSERT OR UPDATE ON questions
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION trg_validate_question_row();

CREATE CONSTRAINT TRIGGER ctrg_choices_valid
AFTER INSERT OR UPDATE OR DELETE ON choices
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION trg_validate_choice_row();

CREATE OR REPLACE FUNCTION prevent_question_change_after_attempt()
RETURNS TRIGGER AS $$
DECLARE
  exam_to_check BIGINT;
BEGIN
  exam_to_check := CASE WHEN TG_OP = 'INSERT' THEN NEW.exam_id ELSE OLD.exam_id END;

  IF EXISTS (SELECT 1 FROM attempts WHERE exam_id = exam_to_check) THEN
    RAISE EXCEPTION 'Questions verrouillées : cet examen possède déjà une tentative.' USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.exam_id <> OLD.exam_id
     AND EXISTS (SELECT 1 FROM attempts WHERE exam_id = NEW.exam_id) THEN
    RAISE EXCEPTION 'Questions verrouillées : examen cible déjà tenté.' USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lock_questions
BEFORE INSERT OR UPDATE OR DELETE ON questions
FOR EACH ROW EXECUTE FUNCTION prevent_question_change_after_attempt();

CREATE OR REPLACE FUNCTION prevent_choice_change_after_attempt()
RETURNS TRIGGER AS $$
DECLARE
  qid BIGINT;
  eid BIGINT;
BEGIN
  qid := CASE WHEN TG_OP = 'DELETE' THEN OLD.question_id ELSE NEW.question_id END;
  SELECT exam_id INTO eid FROM questions WHERE id = qid;

  IF eid IS NOT NULL AND EXISTS (SELECT 1 FROM attempts WHERE exam_id = eid) THEN
    RAISE EXCEPTION 'Choix verrouillés : cet examen possède déjà une tentative.' USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lock_choices
BEFORE INSERT OR UPDATE OR DELETE ON choices
FOR EACH ROW EXECUTE FUNCTION prevent_choice_change_after_attempt();
