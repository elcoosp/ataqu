import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ataqu/ui';
import type { SondQuestion } from './types';
import type { FormQuestion } from '@ataqu/api-client';

type ConditionOperator = NonNullable<FormQuestion['conditions']>[number]['operator'];

interface Props {
  open: boolean;
  question: SondQuestion | null;
  questions: SondQuestion[];
  onSave: (condition: NonNullable<SondQuestion['conditions']>[number]) => void;
  onClose: () => void;
}

export function ConditionalLogicModal({ open, question, questions, onSave, onClose }: Props) {
  const [conditionQuestionId, setConditionQuestionId] = useState('');
  const [operator, setOperator] = useState<ConditionOperator>('equals');
  const [value, setValue] = useState('');

  useEffect(() => {
    if (open && question?.conditions?.length) {
      const c = question.conditions[0];
      setConditionQuestionId(c.question_id);
      setOperator(c.operator);
      setValue(String(c.value ?? ''));
    } else {
      setConditionQuestionId('');
      setOperator('equals');
      setValue('');
    }
  }, [open, question]);

  const availableQuestions = questions.filter((q) => q.id !== question?.id);
  const disableValue = operator === 'is_empty' || operator === 'is_not_empty';

  const handleSave = () => {
    if (!conditionQuestionId) return;
    onSave({
      question_id: conditionQuestionId,
      operator,
      value,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="ataqu-glass">
        <DialogHeader>
          <DialogTitle>Add Conditional Logic</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">If</span>
            <Select value={conditionQuestionId} onValueChange={setConditionQuestionId}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Question" />
              </SelectTrigger>
              <SelectContent>
                {availableQuestions.map((q) => (
                  <SelectItem key={q.id} value={q.id}>
                    {q.label || 'Untitled'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={operator} onValueChange={(v) => setOperator(v as ConditionOperator)}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Operator" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equals">equals</SelectItem>
                <SelectItem value="not_equals">not equals</SelectItem>
                <SelectItem value="contains">contains</SelectItem>
                <SelectItem value="not_contains">not contains</SelectItem>
                <SelectItem value="is_empty">is empty</SelectItem>
                <SelectItem value="is_not_empty">is not empty</SelectItem>
              </SelectContent>
            </Select>
            {!disableValue && (
              <Input value={value} onChange={(e) => setValue(e.target.value)} className="w-40" placeholder="Value" />
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            This question will be shown only when the condition above is met.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Logic</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
