import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ataqu/ui';
import { RefreshCw } from 'lucide-react';
import React from 'react';

interface FilterBarProps {
  onRefresh: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({ onRefresh }) => {
  return (
    <div className="flex items-center gap-4 p-4 bg-card border-b border-gray-700/40 flex-wrap">
      <Input type="date" className="w-auto bg-deep-night/50" />
      <Input type="date" className="w-auto bg-deep-night/50" />

      <Select>
        <SelectTrigger className="w-[180px] bg-deep-night/50">
          <SelectValue placeholder="Filter by Team" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="team-a">Team A</SelectItem>
          <SelectItem value="team-b">Team B</SelectItem>
        </SelectContent>
      </Select>

      <Button variant="outline" size="sm" onClick={onRefresh} className="ml-auto">
        <RefreshCw className="h-4 w-4 mr-2" />
        Refresh Dashboard
      </Button>
    </div>
  );
};
