import { api, useGetDashboard, useUpdateDashboard } from '@ataqu/api-client';
import { Button, OnboardTour, Shell, Skeleton } from '@ataqu/ui';
import { t } from '@lingui/macro';
import { Trans } from '@lingui/react/macro';
import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useParams } from '@tanstack/react-router';
import { ArrowLeft, Combine, Plus } from 'lucide-react';
import React from 'react';
import type { Layout } from 'react-grid-layout';
import { toast } from 'sonner';
import { DrillDownPanel } from '../components/dashboard/drill-down-panel';
import { DashboardGrid, type Widget } from '../components/dashboard-grid';
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
  const updateDashboardMutation = useUpdateDashboard();
  const queryClient = useQueryClient();

  const [isWidgetPickerOpen, setWidgetPickerOpen] = React.useState(false);
  const [isCombineOpen, setIsCombineOpen] = React.useState(false);
  const { isConnected } = useVistaSSE(`/api/vista/kpis/${id}/stream`);

  const config = (dashboard?.config || {}) as { widgets?: Widget[] };
  const widgets = config.widgets || [
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
      content: t`No ETL pipelines. This data is live from CINQ, right now.`,
    },
    {
      target: '[data-tour="sse-indicator"]',
      content: t`When a deal closes, this updates in milliseconds. No refresh button needed.`,
    },
  ];

  const handleAddWidget = async (type: string, dataSource: string) => {
    const newWidget = { i: `w${Date.now()}`, type, dataSource, data: [] };
    const newWidgets = [...widgets, newWidget];
    try {
      await updateDashboardMutation.mutateAsync({
        id,
        data: { config: { ...config, widgets: newWidgets } },
      });
      queryClient.invalidateQueries({ queryKey: ['vista', 'dashboard', id] });
      toast.success(t`Widget added.`);
    } catch {
      toast.error(t`Failed to add widget.`);
    }
  };

  const handleLayoutChange = async (newLayout: Layout[]) => {
    const updatedWidgets = widgets.map((w) => {
      const layoutItem = newLayout.find((l) => l.i === w.i);
      return { ...w, layout: layoutItem };
    });
    try {
      await updateDashboardMutation.mutateAsync({
        id,
        data: { config: { ...config, widgets: updatedWidgets } },
      });
    } catch {
      // Silent fail for layout saves
    }
  };

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
              <h1 className="text-xl font-heading text-white">
                {dashboard?.name || <Trans>Dashboard</Trans>}
              </h1>
              <SseIndicator isConnected={isConnected} />
            </div>
            <div className="flex items-center gap-4">
              <ExportButtons dashboardId={id} />
              <Button size="sm" variant="outline" onClick={() => setIsCombineOpen(true)}>
                <Combine className="h-4 w-4 mr-2" />
                <Trans>Combine Data</Trans>
              </Button>
              <Button size="sm" onClick={() => setWidgetPickerOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                <Trans>Add Widget</Trans>
              </Button>
            </div>
          </div>

          <FilterBar onRefresh={() => queryClient.invalidateQueries({ queryKey: ['vista'] })} />

          <div className="flex-1 overflow-auto p-8">
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <DashboardGrid widgets={widgets} onLayoutChange={handleLayoutChange} />
            )}
          </div>
        </div>
      </OnboardTour>
      <WidgetPicker
        isOpen={isWidgetPickerOpen}
        onClose={() => setWidgetPickerOpen(false)}
        onAdd={handleAddWidget}
      />

      {isCombineOpen && (
        <CombineDataModal onClose={() => setIsCombineOpen(false)} dashboardId={id} />
      )}
    </Shell>
  );
}

const CombineDataModal: React.FC<{ onClose: () => void; dashboardId: string }> = ({
  onClose,
  dashboardId,
}) => {
  const [primary, setPrimary] = React.useState('revenue');
  const [secondary, setSecondary] = React.useState('inventory');
  const [isLoading, setIsLoading] = React.useState(false);
  const queryClient = useQueryClient();

  const handleCombine = async () => {
    setIsLoading(true);
    try {
      await api.post('/vista/combine', {
        primary,
        secondary,
        from_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        to_date: new Date().toISOString(),
      });
      toast.success(t`Data combined successfully.`);
      queryClient.invalidateQueries({ queryKey: ['vista', 'dashboard', dashboardId] });
      onClose();
    } catch {
      toast.error(t`Failed to combine data.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: modal overlay
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: stop propagation */}
      <div
        className="w-[425px] bg-card border border-gray-700/40 rounded-lg p-6 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">
          <Trans>Combine Data</Trans>
        </h2>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="primary-source" className="text-right text-sm">
              <Trans>Primary</Trans>
            </label>
            <select
              id="primary-source"
              value={primary}
              onChange={(e) => setPrimary(e.target.value)}
              className="col-span-3 bg-deep-night/50 p-2 rounded border border-gray-700/40"
            >
              <option value="revenue">{t`Revenue`}</option>
              <option value="support">{t`Support`}</option>
            </select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="secondary-source" className="text-right text-sm">
              <Trans>Secondary</Trans>
            </label>
            <select
              id="secondary-source"
              value={secondary}
              onChange={(e) => setSecondary(e.target.value)}
              className="col-span-3 bg-deep-night/50 p-2 rounded border border-gray-700/40"
            >
              <option value="inventory">{t`Inventory`}</option>
              <option value="sales">{t`Sales`}</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            <Trans>Cancel</Trans>
          </Button>
          <Button onClick={handleCombine} disabled={isLoading}>
            <Trans>Combine</Trans>
          </Button>
        </div>
      </div>
    </div>
  );
};
