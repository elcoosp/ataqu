import { Input, Button } from '@ataqu/ui';
import { Switch } from '../ui/switch';
import type { SondQuestion } from './types';

interface Props {
  question: SondQuestion | null;
  onUpdate: (updates: Partial<SondQuestion>) => void;
  onAddCondition: () => void;
}

export function QuestionConfigPanel({ question, onUpdate, onAddCondition }: Props) {
  if (!question) {
    return (
      <div className="flex w-80 items-center justify-center border-l border-border bg-background p-6 text-muted-foreground">
        Select a question to configure
      </div>
    );
  }

  const isChoiceType = question.type === 'choice' || question.type === 'multiple_choice';

  return (
    <div className="w-80 space-y-6 overflow-y-auto border-l border-border bg-background p-6">
      <div>
        <label className="mb-2 block text-sm font-medium">Question Text</label>
        <Input
          value={question.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          placeholder="e.g., What is your name?"
        />
      </div>

      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Required</label>
        <Switch checked={question.required} onCheckedChange={(checked) => onUpdate({ required: checked })} />
      </div>

      {isChoiceType && (
        <div>
          <label className="mb-2 block text-sm font-medium">Options</label>
          <div className="space-y-2">
            {(question.options || []).map((opt, i) => (
              <Input
                key={i}
                value={opt}
                onChange={(e) => {
                  const newOpts = [...(question.options || [])];
                  newOpts[i] = e.target.value;
                  onUpdate({ options: newOpts });
                }}
              />
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onUpdate({ options: [...(question.options || []), `Option ${(question.options || []).length + 1}`] })}
            >
              Add Option
            </Button>
          </div>
        </div>
      )}

      {question.type === 'rating' && (
        <div className="space-y-2">
          <label className="block text-sm font-medium">Rating Scale</label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={question.min ?? 1}
              onChange={(e) => onUpdate({ min: Number(e.target.value) })}
              className="w-20"
            />
            <span>to</span>
            <Input
              type="number"
              value={question.max ?? 5}
              onChange={(e) => onUpdate({ max: Number(e.target.value) })}
              className="w-20"
            />
          </div>
        </div>
      )}

      <div>
        <label className="mb-2 block text-sm font-medium">Page</label>
        <Input
          type="number"
          value={question.page}
          min={1}
          onChange={(e) => onUpdate({ page: Math.max(1, Number(e.target.value)) })}
        />
      </div>

      <div>
        <Button variant="outline" className="w-full" onClick={onAddCondition}>
          Add Conditional Logic
        </Button>
      </div>
    </div>
  );
}
