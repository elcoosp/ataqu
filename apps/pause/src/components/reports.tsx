import { useListEmployees, useListLeaveRequests } from '@ataqu/api-client';
import { Chart } from '@ataqu/ui';
import { useMemo } from 'react';

export function ReportsView() {
  const { data: employees } = useListEmployees({ limit: 1000 });
  const { data: leaveRequests } = useListLeaveRequests();

  const headcountByDept = useMemo(() => {
    const counts: Record<string, number> = {};
    employees?.forEach((emp) => {
      const dept = emp.department || 'Unassigned';
      counts[dept] = (counts[dept] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [employees]);

  const leaveUsage = useMemo(() => {
    const counts: Record<string, number> = { annual: 0, sick: 0, personal: 0, unpaid: 0 };
    leaveRequests?.forEach((req) => {
      if (req.status === 'approved') {
        counts[req.leave_type] = (counts[req.leave_type] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [leaveRequests]);

  const turnoverRate = useMemo(() => {
    if (!employees || employees.length === 0) return 0;
    const inactive = employees.filter((e) => !e.is_active).length;
    return (inactive / employees.length) * 100;
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
            <span className="text-5xl font-bold text-amber">{turnoverRate.toFixed(1)}%</span>
          </div>
        </div>
        <div className="bg-deep-night/50 p-6 rounded-lg border border-gray-700/40 md:col-span-2">
          <h3 className="text-lg font-semibold mb-4">Leave Usage Summary</h3>
          <Chart
            type="pie"
            data={leaveUsage}
            xAxisKey="name"
            series={[{ key: 'value', name: 'Leave Days' }]}
          />
        </div>
      </div>
    </div>
  );
}
