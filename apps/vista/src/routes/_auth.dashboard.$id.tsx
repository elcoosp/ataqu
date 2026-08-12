import { useGetDashboard } from '@ataqu/api-client';
import { Button, OnboardTour, Shell, Skeleton } from '@ataqu/ui';
import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useParams } from '@tanstack/react-router';
import { ArrowLeft, Plus } from 'lucide-react';
import React from 'react';
import { DrillDownPanel } from '../components/dashboard/drill-down-panel';
import { DashboardGrid } from '../components/dashboard-grid';
import { ExportButtons } from '../components/export-buttons';
import { FilterBar } from '../components/filter-bar';
import { SseIndicator } from '../components/sse-indicator';
import { WidgetPicker } from '../components/widget-picker';
import { useVistaSSE } from '../hooks/use-sse';

export const Route = createFileRoute('/_auth/dashboard/$id')({
  component: DashboardDetailPage,
});

function DashboardDetailPage() {
  const { id } = useParams({ from: '/_auth/dashboard/$id' });
  const { data: dashboard, isLoading } = useGetDashboard(id);
  const queryClient = useQueryClient();

  const [isWidgetPickerOpen, setWidgetPickerOpen] = React.useState(false);
  const { isConnected } = useVistaSSE(`/api/vista/kpis/${id}/stream`);

  const widgets = [
    { i: 'w1', type: 'kpi', dataSource: 'Revenue', data: [] },
    {
      i: 'w2',
      type: 'bar',
      dataSource: 'Pipeline',
      data: [
        { name: 'Jan', value: 4000 },
        { name: 'Feb', value: 3000 },
      ],
    },
    {
      i: 'w3',
      type: 'line',
      dataSource: 'Stock',
      data: [
        { name: 'Jan', value: 200 },
        { name: 'Feb', value: 150 },
      ],
    },
  ];

  const tourSteps = [
    {
      target: '[data-tour="kpi-card"]',
      content: 'No ETL pipelines. This data is live from CINQ, right now.',
    },
    {
      target: '[data-tour="sse-indicator"]',
      content: 'When a deal closes, this updates in milliseconds. No refresh button needed.',
    },
  ];

  return (
    <Shell activeApp="vista">
      <DrillDownPanel />
      <OnboardTour tourId="vista-dashboard-tour" steps={tourSteps}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-gray-700/40">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-xl font-heading text-white">{dashboard?.name || 'Dashboard'}</h1>
              <SseIndicator isConnected={isConnected} />
            </div>
            <div className="flex items-center gap-4">
              <ExportButtons dashboardId={id} />
              <Button size="sm" onClick={() => setWidgetPickerOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Widget
              </Button>
            </div>
          </div>

          <FilterBar onRefresh={() => queryClient.invalidateQueries({ queryKey: ['vista'] })} />

          <div className="flex-1 overflow-auto p-8">
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <DashboardGrid widgets={widgets} onLayoutChange={() => {}} />
            )}
          </div>
        </div>
      </OnboardTour>
      <WidgetPicker
        isOpen={isWidgetPickerOpen}
        onClose={() => setWidgetPickerOpen(false)}
        onAdd={() => {}}
      />
    </Shell>
  );
}
