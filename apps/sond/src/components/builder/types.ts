import type { Form, FormQuestion } from '@ataqu/api-client';

export type FormMode = 'standard' | 'conversational';

export type SondQuestion = FormQuestion & { page: number };

export interface SondBranding {
  primaryColor?: string;
  logoUrl?: string;
  fontFamily?: 'inter' | 'jetbrains';
}

export type SondForm = Omit<Form, 'questions' | 'branding' | 'mode'> & {
  questions: SondQuestion[];
  branding: SondBranding;
  mode: FormMode;
  status?: 'draft' | 'published';
  submissionCount?: number;
};

export type SondUpdateData = {
  title?: string | null;
  description?: string | null;
  questions?: Array<Omit<SondQuestion, 'id'>> | null;
  mode?: FormMode | null;
  branding?: SondBranding | null;
  routing_rules?: unknown;
};
