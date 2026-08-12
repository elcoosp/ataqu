import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ataqu/ui';
import { t } from '@lingui/macro';
import { Trans } from '@lingui/react/macro';
import { RefreshCw } from 'lucide-react';
import React from 'react';

interface FilterBarProps {
  onRefresh: () => void;
  onFilterChange?: (filters: Record<string, string>) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({ onRefresh, onFilterChange }) => {
  const [team, setTeam] = React.useState('');
  const [product, setProduct] = React.useState('');

  React.useEffect(() => {
    if (onFilterChange) {
      onFilterChange({ team, product });
    }
  }, [team, product, onFilterChange]);

  return (
    <div className="flex items-center gap-4 p-4 bg-card border-b border-gray-700/40 flex-wrap">
      <Input type="date" className="w-auto bg-deep-night/50" />
      <Input type="date" className="w-auto bg-deep-night/50" />

      <Select value={team} onValueChange={setTeam}>
        <SelectTrigger className="w-[180px] bg-deep-night/50">
          <SelectValue placeholder={t`Filter by Team`} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="team-a">{t`Team A`}</SelectItem>
          <SelectItem value="team-b">{t`Team B`}</SelectItem>
        </SelectContent>
      </Select>

      <Select value={product} onValueChange={setProduct}>
        <SelectTrigger className="w-[180px] bg-deep-night/50">
          <SelectValue placeholder={t`Filter by Product`} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="prod-1">{t`Product 1`}</SelectItem>
          <SelectItem value="prod-2">{t`Product 2`}</SelectItem>
        </SelectContent>
      </Select>

      <Button variant="outline" size="sm" onClick={onRefresh} className="ml-auto">
        <RefreshCw className="h-4 w-4 mr-2" />
        <Trans>Refresh Dashboard</Trans>
      </Button>
    </div>
  );
};
