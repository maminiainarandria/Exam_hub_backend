export type Role = 'admin' | 'student';

export interface JwtUser {
  userId: number;
  role: Role;
}
export interface QuestionChoiceInput {
  label: string;
  isCorrect: boolean;
}

export interface QuestionInput {
  statement: string;
  points?: number;
  choices: QuestionChoiceInput[];
}

export interface SubmissionAnswer {
  questionId: number;
  choiceId: number | null;
}
