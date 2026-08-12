import { useListEmployees } from '@ataqu/api-client';
import { Chart } from '@ataqu/ui';
import { useMemo } from 'react';

export function ReportsView() {
  const { data: employees } = useListEmployees({ limit: 1000 });

  const headcountByDept = useMemo(() => {
    const counts: Record<string, number> = {};
    employees?.forEach((emp) => {
      const dept = emp.department || 'Unassigned';
      counts[dept] = (counts[dept] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [employees]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-deep-night/50 p-6 rounded-lg border border-gray-700/40">
          <h3 className="text-lg font-semibold mb-4">Headcount by Department</h3>
          <Chart
            type="bar"
            data={headcountByDept}
            xAxisKey="name"
            series={[{ key: 'value', name: 'Headcount' }]}
          />
        </div>
        <div className="bg-deep-night/50 p-6 rounded-lg border border-gray-700/40">
          <h3 className="text-lg font-semibold mb-4">Turnover Rate</h3>
          <div className="flex items-center justify-center h-64">
            <span className="text-5xl font-bold text-amber">2.5%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
