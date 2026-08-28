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
    if (!await this.exams.exists(examId)) {
      throw new AppError(404, 'Exam not found');
    }

    const exam = await this.exams.findAvailableForStudent(
      examId,
      studentId
    );

    if (!exam) {
      throw new AppError(403, 'Exam is not available');
    }

    return {
      ...exam,
      questions: await this.questions.listForStudent(examId)
    };
  }

  async submit(
    examId: number,
    studentId: number,
    body: unknown
  ) {
    if (!body || typeof body !== 'object') {
      throw new AppError(400, 'Invalid submission');
    }

    const raw = (body as Record<string, unknown>).answers;

    if (!Array.isArray(raw)) {
      throw new AppError(400, 'answers must be an array');
    }

    const answers: SubmissionAnswer[] = raw.map(
      (item, index) => {
        if (!item || typeof item !== 'object') {
          throw new AppError(
            400,
            `Invalid answer at position ${index + 1}`
          );
        }

        const value = item as Record<string, unknown>;

        return {
          questionId: requireId(
            value.question_id,
            `question_id at position ${index + 1}`
          ),
          choiceId: requireId(
            value.choice_id,
            `choice_id at position ${index + 1}`
          )
        };
      }
    );

    const uniqueQuestionIds = new Set(
      answers.map((answer) => answer.questionId)
    );

    if (uniqueQuestionIds.size !== answers.length) {
      throw new AppError(
        400,
        'A question cannot appear more than once'
      );
    }

    try {
      return await this.attempts.transaction(
        async (client) => {
          const exam = await this.attempts.lockExam(
            client,
            examId
          );

          if (!exam) {
            throw new AppError(404, 'Exam not found');
          }

          const now = new Date(exam.server_now);

          if (
            now < new Date(exam.starts_at) ||
            now > new Date(exam.ends_at)
          ) {
            throw new AppError(
              403,
              'Exam is not available'
            );
          }

          if (
            await this.attempts.findAttempt(
              client,
              examId,
              studentId
            )
          ) {
            throw new AppError(
              409,
              'Exam already taken'
            );
          }

          const rows = await this.attempts.scoringRows(
            client,
            examId
          );

          const examQuestions = new Map<
            number,
            {
              statement: string;
              points: number;
              choices: Array<{
                id: number;
                isCorrect: boolean;
              }>;
            }
          >();

          for (const row of rows) {
            const questionId = Number(row.question_id);

            if (!examQuestions.has(questionId)) {
              examQuestions.set(questionId, {
                statement: row.statement,
                points: Number(row.points),
                choices: []
              });
            }

            examQuestions.get(questionId)!.choices.push({
              id: Number(row.choice_id),
              isCorrect: row.is_correct === true
            });
          }

          for (const answer of answers) {
            const question = examQuestions.get(
              answer.questionId
            );

            if (!question) {
              throw new AppError(
                400,
                `Question ${answer.questionId} does not belong to this exam`
              );
            }

            const choiceBelongsToQuestion =
              question.choices.some(
                (choice) =>
                  choice.id === answer.choiceId
              );

            if (!choiceBelongsToQuestion) {
              throw new AppError(
                400,
                `Choice ${answer.choiceId} does not belong to question ${answer.questionId}`
              );
            }
          }

          const submitted = new Map(
            answers.map((answer) => [
              answer.questionId,
              answer.choiceId
            ])
          );

          let score = 0;
          let totalPoints = 0;

          const correction: Array<{
            question_id: number;
            statement: string;
            points: number;
            student_choice_id: number | null;
            correct_choice_id: number;
            is_correct: boolean;
          }> = [];

          for (
            const [questionId, question]
            of examQuestions
          ) {
            totalPoints += question.points;

            const studentChoiceId =
              submitted.get(questionId) ?? null;

            const correctChoice =
              question.choices.find(
                (choice) => choice.isCorrect
              );

            if (!correctChoice) {
              throw new AppError(
                500,
                'Question has no correct choice'
              );
            }

            const isCorrect =
              studentChoiceId === correctChoice.id;

            if (isCorrect) {
              score += question.points;
            }

            correction.push({
              question_id: questionId,
              statement: question.statement,
              points: question.points,
              student_choice_id: studentChoiceId,
              correct_choice_id: correctChoice.id,
              is_correct: isCorrect
            });
          }

          const attempt =
            await this.attempts.insertAttempt(
              client,
              examId,
              studentId,
              score,
              totalPoints
            );

          for (const questionId of examQuestions.keys()) {
            await this.attempts.insertAnswer(
              client,
              Number(attempt.id),
              questionId,
              submitted.get(questionId) ?? null
            );
          }

          return {
            score,
            total_points: totalPoints,
            correction
          };
        }
      );
    } catch (error) {
      const pgError = error as {
        code?: string;
      };

      if (pgError.code === '23505') {
        throw new AppError(
          409,
          'Exam already taken'
        );
      }

      throw error;
    }
  }

  history(studentId: number) {
    return this.attempts.history(studentId);
  }

  async result(
    studentId: number,
    examId: number
  ) {
    const result =
      await this.attempts.detailedResult(
        studentId,
        examId
      );

    if (!result) {
      throw new AppError(
        404,
        'Result not found'
      );
    }

    return result;
  }
}