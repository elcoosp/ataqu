import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ataqu/ui';
import type { SondBranding } from './types';

interface Props {
  branding: SondBranding;
  onUpdate: (updates: Partial<SondBranding>) => void;
}

export function BrandingTab({ branding, onUpdate }: Props) {
  return (
    <div className="space-y-6 p-4">
      <div>
        <label className="mb-2 block text-sm font-medium">Primary Color</label>
        <Input
          type="color"
          value={branding.primaryColor || '#f59e0b'}
          onChange={(e) => onUpdate({ primaryColor: e.target.value })}
          className="h-10 w-20 p-1"
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium">Logo URL</label>
        <Input
          value={branding.logoUrl || ''}
          onChange={(e) => onUpdate({ logoUrl: e.target.value })}
          placeholder="https://example.com/logo.png"
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium">Font Family</label>
        <Select value={branding.fontFamily || 'inter'} onValueChange={(v: 'inter' | 'jetbrains') => onUpdate({ fontFamily: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="inter">Inter</SelectItem>
            <SelectItem value="jetbrains">JetBrains Mono</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
