import { ExamRepository } from '../Repositorie/ExamRepository.js';
import { QuestionRepository } from '../Repositorie/QuestionRepository.js';
import { AttemptRepository } from '../Repositorie/AttemptRepository.js';
import { AppError } from '../Utils/AppError.js';
import { requireId } from '../Utils/validation.js';
import type { SubmissionAnswer } from '../Model/types.js';

export class StudentExamService {
  constructor(
    private exams = new ExamRepository(),
    private questions = new QuestionRepository(),
    private attempts = new AttemptRepository()
  ) {}

  listAvailable(studentId: number) {
    return this.exams.listAvailableForStudent(studentId);
  }

  async getAvailable(examId: number, studentId: number) {
    if (!await this.exams.exists(examId)) throw new AppError(404, 'Examen introuvable.');
    const exam = await this.exams.findAvailableForStudent(examId, studentId);
    if (!exam) {
      throw new AppError(403, 'Cet examen est hors de sa fenêtre de disponibilité ou a déjà été passé.');
    }
    return { ...exam, questions: await this.questions.listForStudent(examId) };
  }

  async submit(examId: number, studentId: number, body: unknown) {
    if (!body || typeof body !== 'object') throw new AppError(400, 'Soumission invalide.');
    const raw = (body as Record<string, unknown>).answers;
    if (!Array.isArray(raw)) throw new AppError(400, 'Le champ answers doit être un tableau.');

    const answers: SubmissionAnswer[] = raw.map((item, index) => {
      if (!item || typeof item !== 'object') throw new AppError(400, `Réponse ${index + 1} invalide.`);
      const value = item as Record<string, unknown>;
      return {
        questionId: requireId(value.questionId, `Question ${index + 1}`),
        choiceId: value.choiceId === null || value.choiceId === undefined ? null : requireId(value.choiceId, `Choix ${index + 1}`)
      };
    });

    const uniqueQuestionIds = new Set(answers.map((answer) => answer.questionId));
    if (uniqueQuestionIds.size !== answers.length) throw new AppError(400, 'Une question ne peut apparaître qu’une seule fois dans la soumission.');

    try {
      return await this.attempts.transaction(async (client) => {
        const exam = await this.attempts.lockExam(client, examId);
        if (!exam) throw new AppError(404, 'Examen introuvable.');

        const now = new Date(exam.server_now);
        if (now < new Date(exam.starts_at) || now > new Date(exam.ends_at)) {
          throw new AppError(403, 'La fenêtre de disponibilité de cet examen est fermée.');
        }
        if (await this.attempts.findAttempt(client, examId, studentId)) {
          throw new AppError(409, 'Vous avez déjà soumis cet examen.');
        }

        const rows = await this.attempts.scoringRows(client, examId);
        const questions = new Map<number, {
          statement: string;
          points: number;
          choices: Array<{ id: number; label: string; isCorrect: boolean }>;
        }>();

        for (const row of rows) {
          const qid = Number(row.question_id);
          if (!questions.has(qid)) {
            questions.set(qid, { statement: row.statement, points: Number(row.points), choices: [] });
          }
          questions.get(qid)!.choices.push({
            id: Number(row.choice_id),
            label: row.choice_label,
            isCorrect: row.is_correct === true
          });
        }

        for (const answer of answers) {
          const question = questions.get(answer.questionId);
          if (!question) throw new AppError(400, `La question ${answer.questionId} n'appartient pas à cet examen.`);
          if (answer.choiceId !== null && !question.choices.some((choice) => choice.id === answer.choiceId)) {
            throw new AppError(400, `Le choix ${answer.choiceId} n'appartient pas à la question ${answer.questionId}.`);
          }
        }

        const submitted = new Map(answers.map((answer) => [answer.questionId, answer.choiceId]));
        let score = 0;
        let maxScore = 0;
        const corrections = [];

        for (const [questionId, question] of questions) {
          maxScore += question.points;
          const selectedChoiceId = submitted.get(questionId) ?? null;
          const correctChoice = question.choices.find((choice) => choice.isCorrect)!;
          const isCorrect = selectedChoiceId === correctChoice.id;
          if (isCorrect) score += question.points;
          corrections.push({
            questionId,
            statement: question.statement,
            points: question.points,
            earnedPoints: isCorrect ? question.points : 0,
            selectedChoiceId,
            correctChoiceId: correctChoice.id,
            isCorrect,
            choices: question.choices.map(({ id, label }) => ({ id, label }))
          });
        }

        const attempt = await this.attempts.insertAttempt(client, examId, studentId, score, maxScore);
        for (const questionId of questions.keys()) {
          await this.attempts.insertAnswer(client, Number(attempt.id), questionId, submitted.get(questionId) ?? null);
        }

        return {
          attemptId: Number(attempt.id),
          examId,
          score,
          maxScore,
          percentage: maxScore === 0 ? 0 : Math.round((score / maxScore) * 10000) / 100,
          submittedAt: attempt.submitted_at,
          corrections
        };
      });
    } catch (error) {
      const pgError = error as { code?: string };
      if (pgError.code === '23505') throw new AppError(409, 'Vous avez déjà soumis cet examen.');
      throw error;
    }
  }

  history(studentId: number) {
    return this.attempts.history(studentId);
  }

  async result(studentId: number, examId: number) {
    const result = await this.attempts.detailedResult(studentId, examId);
    if (!result) throw new AppError(404, 'Résultat introuvable.');
    return result;
  }
}
