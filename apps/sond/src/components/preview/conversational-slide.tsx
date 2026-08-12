import { useState } from 'react';
import { Button, Input } from '@ataqu/ui';
import { Trans, t } from '@lingui/macro';
import type { SondQuestion } from '../builder/types';

interface Props {
  question: SondQuestion;
  value: unknown;
  onChange: (val: unknown) => void;
  onNext: () => void;
  onSubmit: () => void;
  isLast: boolean;
  total: number;
  current: number;
}

export function ConversationalSlide({ question, value, onChange, onNext, onSubmit, isLast, total, current }: Props) {
  const [error, setError] = useState('');

  const handleNext = () => {
    if (question.required && (value == null || String(value).trim() === '')) {
      setError(t`This field is required`);
      return;
    }
    setError('');
    if (isLast) onSubmit();
    else onNext();
  };

  const renderInput = () => {
    switch (question.type) {
      case 'text':
      case 'email':
      case 'phone':
        return (
          <Input
            type={question.type === 'email' ? 'email' : question.type === 'phone' ? 'tel' : 'text'}
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            className="h-12 text-lg"
            autoFocus
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            value={typeof value === 'number' ? value : ''}
            onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
            className="h-12 text-lg"
            autoFocus
          />
        );
      case 'date':
        return (
          <Input
            type="date"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            className="h-12 text-lg"
            autoFocus
          />
        );
      case 'choice':
        return (
          <div className="space-y-3">
            {(question.options || []).map((opt) => (
              <label key={opt} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 hover:bg-accent">
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={opt}
                  checked={value === opt}
                  onChange={() => onChange(opt)}
                  className="h-4 w-4"
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        );
      case 'multiple_choice': {
        const arr = Array.isArray(value) ? (value as string[]) : [];
        return (
          <div className="space-y-3">
            {(question.options || []).map((opt) => (
              <label key={opt} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 hover:bg-accent">
                <input
                  type="checkbox"
                  checked={arr.includes(opt)}
                  onChange={(e) => {
                    const next = e.target.checked ? [...arr, opt] : arr.filter((v) => v !== opt);
                    onChange(next);
                  }}
                  className="h-4 w-4"
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        );
      }
      case 'rating': {
        const min = question.min ?? 1;
        const max = question.max ?? 5;
        const ratingValue = typeof value === 'number' ? value : 0;
        return (
          <div className="flex gap-2">
            {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onChange(n)}
                className={`h-12 w-12 rounded-lg border text-lg font-medium transition-colors ${
                  ratingValue === n ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-accent'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center animate-in fade-in slide-in-from-right-4 duration-150 ease-out">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-8 shadow-lg">
        <div className="mb-2 text-sm text-muted-foreground">
          <Trans>Question {current} of {total}</Trans>
        </div>
        <div className="mb-8 h-1.5 w-full rounded-full bg-muted">
          <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${(current / total) * 100}%` }} />
        </div>
        <h2 className="mb-6 text-2xl font-bold">{question.label}</h2>
        {renderInput()}
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        <Button onClick={handleNext} className="mt-8 h-12 w-full bg-primary text-lg text-primary-foreground hover:bg-primary/90">
          {isLast ? <Trans>Submit</Trans> : <Trans>Next</Trans>}
        </Button>
      </div>
    </div>
  );
}
