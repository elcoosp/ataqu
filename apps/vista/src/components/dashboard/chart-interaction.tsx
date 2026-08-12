import { useDrillDown } from '@ataqu/api-client';
import React from 'react';
import { useDrillDownStore } from '../../hooks/use-drill-down-store';

// biome-ignore lint/suspicious/noExplicitAny: WrappedChart props are dynamic
export const withChartInteraction = (WrappedChart: React.FC<any>) => {
  // biome-ignore lint/suspicious/noExplicitAny: props are dynamic
  return ({ widgetId, ...props }: any) => {
    const setDrillDown = useDrillDownStore((s) => s.setDrillDown);
    const setOpen = useDrillDownStore((s) => s.setOpen);
    const { mutateAsync } = useDrillDown();

    const handleDataPointClick = async () => {
      const dimension = props.xAxisKey || 'category';
      const value = 'Clicked'; // Simplified for mock interaction

      setOpen(true);
      setDrillDown({ loading: true, widgetId, dimension, value, data: [] });

      try {
        const result = await mutateAsync({ metric: props.series[0].key, dimension, value });
        setDrillDown({ loading: false, data: result });
      } catch {
        setDrillDown({ loading: false, data: [] });
      }
    };

    return (
      <button
        type="button"
        className="block w-full h-full bg-transparent border-0 p-0 cursor-pointer text-left"
        onClick={handleDataPointClick}
      >
        <WrappedChart {...props} />
      </button>
    );
  };
};
