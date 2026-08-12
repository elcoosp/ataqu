import { Button } from '@ataqu/ui';
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
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Add Widget</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="widget-type" className="text-right text-sm">
              Type
            </label>
            <select
              id="widget-type"
              value={widgetType}
              onChange={(e) => setWidgetType(e.target.value)}
              className="col-span-3 bg-deep-night/50 p-2 rounded border border-gray-700/40"
            >
              <option value="kpi">KPI Card</option>
              <option value="bar">Bar Chart</option>
              <option value="line">Line Chart</option>
              <option value="pie">Pie Chart</option>
              <option value="table">Table</option>
            </select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="data-source" className="text-right text-sm">
              Data Source
            </label>
            <select
              id="data-source"
              value={dataSource}
              onChange={(e) => setDataSource(e.target.value)}
              className="col-span-3 bg-deep-night/50 p-2 rounded border border-gray-700/40"
            >
              <option value="revenue">Revenue</option>
              <option value="pipeline">Pipeline</option>
              <option value="stock">Stock Levels</option>
              <option value="bookings">Bookings</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onAdd(widgetType, dataSource);
              onClose();
            }}
          >
            Add Widget
          </Button>
        </div>
      </div>
    </div>
  );
};
