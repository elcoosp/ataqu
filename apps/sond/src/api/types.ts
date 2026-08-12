export type QuestionType = 'text' | 'email' | 'choice' | 'multiple_choice' | 'date' | 'rating' | 'phone';

export interface Condition {
  questionId: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'contains' | 'not_contains' | 'is_empty' | 'is_not_empty';
  value: string;
}

export interface Question {
  id: string;
  label: string;
  type: QuestionType;
  required: boolean;
  helpText?: string;
  options?: string[];
  conditions?: Condition[];
  page: number;
}

export interface FormBranding {
  primaryColor?: string;
  logoUrl?: string;
  fontFamily?: 'inter' | 'jetbrains';
}

export type FormMode = 'standard' | 'conversational';

export interface Form {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
  branding: FormBranding;
  mode: FormMode;
  status: 'draft' | 'published';
  submissionCount: number;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface Submission {
  id: string;
  formId: string;
  submittedAt: string;
  answers: Record<string, any>;
  status: 'new' | 'viewed';
}
