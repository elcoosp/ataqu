import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@ataqu/ui';
import { Switch } from '../ui/switch';
import { Trans, t } from '@lingui/macro';
import type { FormMode } from './types';

interface Props {
  mode: FormMode;
  onChange: (mode: FormMode) => void;
}

export function ConversationalToggle({ mode, onChange }: Props) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
      <div>
        <div className="font-medium"><Trans>Display mode</Trans></div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="cursor-help text-sm text-muted-foreground">
                {mode === 'conversational' ? t`Conversational (One per slide)` : t`Standard (All on one page)`}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <Trans>Conversational mode shows one question at a time — higher completion rates.</Trans>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <Switch
        checked={mode === 'conversational'}
        onCheckedChange={(checked: boolean) => onChange(checked ? 'conversational' : 'standard')}
      />
    </div>
  );
}
