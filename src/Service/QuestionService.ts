import { QuestionRepository } from '../Repositorie/QuestionRepository.js';
import { ExamRepository } from '../Repositorie/ExamRepository.js';
import { AppError } from '../Utils/AppError.js';
import { validateQuestionInput } from '../Utils/validation.js';

export class QuestionService {
  constructor(private questions = new QuestionRepository(), private exams = new ExamRepository()) {}

  async listAdmin(examId: number) {
    if (!await this.exams.exists(examId)) throw new AppError(404, 'Examen introuvable.');
    return {
      locked: await this.exams.hasAttempts(examId),
      questions: await this.questions.listAdmin(examId)
    };
  }

  async create(examId: number, body: unknown) {
    if (!await this.exams.exists(examId)) throw new AppError(404, 'Examen introuvable.');
    if (await this.exams.hasAttempts(examId)) throw new AppError(409, 'Questions verrouillées : cet examen possède déjà une tentative.');
    return this.questions.create(examId, validateQuestionInput(body));
  }

  async update(questionId: number, body: unknown) {
    const question = await this.questions.find(questionId);
    if (!question) throw new AppError(404, 'Question introuvable.');
    if (await this.exams.hasAttempts(Number(question.exam_id))) throw new AppError(409, 'Questions verrouillées : cet examen possède déjà une tentative.');
    return this.questions.update(questionId, validateQuestionInput(body));
  }

  async delete(questionId: number) {
    const question = await this.questions.find(questionId);
    if (!question) throw new AppError(404, 'Question introuvable.');
    if (await this.exams.hasAttempts(Number(question.exam_id))) throw new AppError(409, 'Questions verrouillées : cet examen possède déjà une tentative.');
    await this.questions.delete(questionId);
    return { message: 'Question supprimée.' };
  }
}
