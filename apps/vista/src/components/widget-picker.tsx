import { Button } from '@ataqu/ui';
import { t } from '@lingui/macro';
import { Trans } from '@lingui/react/macro';
import { X } from 'lucide-react';
import React from 'react';

interface WidgetPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (type: string, dataSource: string) => void;
}

export const WidgetPicker: React.FC<WidgetPickerProps> = ({ isOpen, onClose, onAdd }) => {
  const [widgetType, setWidgetType] = React.useState('kpi');
  const [dataSource, setDataSource] = React.useState('revenue');

  if (!isOpen) return null;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: modal overlay
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: stop propagation */}
      <div
        className="w-[425px] bg-card border border-gray-700/40 rounded-lg p-6 flex flex-col gap-4"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        onKeyDown={(e: React.KeyboardEvent) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">
            <Trans>Add Widget</Trans>
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="widget-type" className="text-right text-sm">
              <Trans>Type</Trans>
            </label>
            <select
              id="widget-type"
              value={widgetType}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWidgetType(e.target.value)}
              className="col-span-3 bg-deep-night/50 p-2 rounded border border-gray-700/40"
            >
              <option value="kpi">{t`KPI Card`}</option>
              <option value="bar">{t`Bar Chart`}</option>
              <option value="line">{t`Line Chart`}</option>
              <option value="pie">{t`Pie Chart`}</option>
              <option value="table">{t`Table`}</option>
            </select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="data-source" className="text-right text-sm">
              <Trans>Data Source</Trans>
            </label>
            <select
              id="data-source"
              value={dataSource}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDataSource(e.target.value)}
              className="col-span-3 bg-deep-night/50 p-2 rounded border border-gray-700/40"
            >
              <option value="revenue">{t`Revenue`}</option>
              <option value="pipeline">{t`Pipeline`}</option>
              <option value="stock">{t`Stock Levels`}</option>
              <option value="bookings">{t`Bookings`}</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            <Trans>Cancel</Trans>
          </Button>
          <Button
            onClick={() => {
              onAdd(widgetType, dataSource);
              onClose();
            }}
          >
            <Trans>Add Widget</Trans>
          </Button>
        </div>
      </div>
    </div>
  );
};
