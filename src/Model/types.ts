export type Role = 'admin' | 'student';

export interface JwtUser {
  id: number;
  role: Role;
  email: string;
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
