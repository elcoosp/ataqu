import { useListEmployees, useSearchEmployees } from '@ataqu/api-client';
import { useDebounce } from '@ataqu/shared-hooks';
import { Button, Card, Input, Skeleton } from '@ataqu/ui';
import { useNavigate } from '@tanstack/react-router';
import { Search, UserPlus, Users } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from './empty-state';

export function EmployeeDirectory({ onAddEmployee }: { onAddEmployee: () => void }) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const navigate = useNavigate();

  const isSearching = debouncedSearch.trim().length > 0;

  const { data: employees, isLoading } = useListEmployees(
    { limit: 100, offset: 0 },
    { queryKey: ['pause', 'employees', 'list', { limit: 100, offset: 0 }], enabled: !isSearching }
  );
  const { data: searchResults, isLoading: isSearchLoading } = useSearchEmployees(
    { q: debouncedSearch },
    { queryKey: ['pause', 'employees', 'search', debouncedSearch], enabled: isSearching }
  );

  const list = isSearching ? searchResults : employees;

  if (isLoading || isSearchLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <Skeleton key={n} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (!list || list.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No employees"
        description="Add your first employee to get started."
        ctaLabel="Add Employee"
        onCtaClick={onAddEmployee}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-deep-night/50"
          />
        </div>
        <Button onClick={onAddEmployee}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Employee
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {list.map((emp) => (
          <Card
            key={emp.id}
            className="p-4 cursor-pointer hover:bg-accent/10 transition-colors"
            onClick={() => navigate({ to: '/employees/$id', params: { id: emp.id } })}
          >
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 rounded-full bg-amber/20 flex items-center justify-center text-amber font-bold">
                {emp.full_name.charAt(0)}
              </div>
              <div>
                <h3 className="font-semibold text-white">{emp.full_name}</h3>
                <p className="text-sm text-gray-400">{emp.job_title}</p>
                <p className="text-xs text-gray-500">{emp.email}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
