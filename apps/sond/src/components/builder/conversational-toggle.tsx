import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@ataqu/ui';
import { Switch } from '../ui/switch';
import type { FormMode } from './types';

interface Props {
  mode: FormMode;
  onChange: (mode: FormMode) => void;
}

export function ConversationalToggle({ mode, onChange }: Props) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
      <div>
        <div className="font-medium">Display mode</div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="cursor-help text-sm text-muted-foreground">
                {mode === 'conversational' ? 'Conversational (One per slide)' : 'Standard (All on one page)'}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              Conversational mode shows one question at a time — higher completion rates.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <Switch
        checked={mode === 'conversational'}
        onCheckedChange={(checked) => onChange(checked ? 'conversational' : 'standard')}
      />
    </div>
  );
}
