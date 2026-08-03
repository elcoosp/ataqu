import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  ComposedChart,
  ScatterChart,
  Scatter,
  type TooltipProps,
} from 'recharts';
import { cn } from '../lib/utils';

export type ChartType = 'line' | 'bar' | 'area' | 'pie' | 'composed' | 'scatter';

export interface ChartDataPoint {
  [key: string]: string | number;
}

export interface ChartProps {
  type: ChartType;
  data: ChartDataPoint[];
  xAxisKey: string;
  series: {
    key: string;
    color?: string;
    name?: string;
  }[];
  width?: string | number;
  height?: string | number;
  className?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  fillOpacity?: number;
  pieColors?: string[];
  // Bar-specific
  barSize?: number;
  // Line-specific
  strokeWidth?: number;
  dotSize?: number;
}

const CHART_COLORS = ['#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

export function Chart({
  type,
  data,
  xAxisKey,
  series,
  width = '100%',
  height = 300,
  className,
  showGrid = true,
  showLegend = true,
  showTooltip = true,
  fillOpacity = 0.3,
  pieColors = CHART_COLORS,
  barSize = 20,
  strokeWidth = 2,
  dotSize = 4,
}: ChartProps) {
  const renderChart = () => {
    const TooltipContent = ({ active, payload, label }: TooltipProps<any, any>) => {
      if (!active || !payload || !payload.length) return null;
      return (
        <div className="bg-deep-night/90 backdrop-blur-xl border border-gray-700/40 rounded-lg p-3 shadow-lg text-white">
          <p className="text-sm font-medium mb-1">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-xs" style={{ color: entry.color || '#fff' }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    };

    const commonProps = {
      data,
      margin: { top: 10, right: 30, left: 0, bottom: 0 },
    };

    const seriesElements = series.map((s, idx) => {
      const color = s.color || CHART_COLORS[idx % CHART_COLORS.length];
      const name = s.name || s.key;
      const key = s.key;

      switch (type) {
        case 'line':
          return (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={color}
              strokeWidth={strokeWidth}
              dot={{ r: dotSize }}
              name={name}
            />
          );
        case 'bar':
          return <Bar key={key} dataKey={key} fill={color} name={name} barSize={barSize} />;
        case 'area':
          return (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              stroke={color}
              fill={color}
              fillOpacity={fillOpacity}
              name={name}
            />
          );
        case 'pie':
          // Pie is handled separately below
          return null;
        case 'composed':
          // For composed, we alternate between line and bar
          const isLine = idx % 2 === 0;
          if (isLine) {
            return (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={color}
                strokeWidth={strokeWidth}
                dot={{ r: dotSize }}
                name={name}
              />
            );
          }
          return <Bar key={key} dataKey={key} fill={color} name={name} barSize={barSize} />;
        case 'scatter':
          return <Scatter key={key} dataKey={key} fill={color} name={name} />;
        default:
          return null;
      }
    });

    const renderPie = () => {
      const pieData = data.map((d, idx) => ({
        name: d[xAxisKey] as string,
        value: d[series[0]?.key] as number,
        key: d[xAxisKey] as string,
      }));
      return (
        <PieChart {...commonProps}>
          <Pie
            data={pieData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={80}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          >
            {pieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
            ))}
          </Pie>
          {showTooltip && <Tooltip content={<TooltipContent />} />}
          {showLegend && <Legend wrapperStyle={{ color: '#fff' }} />}
        </PieChart>
      );
    };

    if (type === 'pie') {
      return renderPie();
    }

    let ChartComponent = LineChart;
    if (type === 'bar') ChartComponent = BarChart;
    else if (type === 'area') ChartComponent = AreaChart;
    else if (type === 'composed') ChartComponent = ComposedChart;
    else if (type === 'scatter') ChartComponent = ScatterChart;

    return (
      <ChartComponent {...commonProps}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />}
        <XAxis dataKey={xAxisKey} stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} />
        <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} />
        {showTooltip && <Tooltip content={<TooltipContent />} />}
        {showLegend && <Legend wrapperStyle={{ color: '#fff' }} />}
        {seriesElements}
      </ChartComponent>
    );
  };

  return (
    <div className={cn('w-full', className)} style={{ height: typeof height === 'number' ? height : height }}>
      <ResponsiveContainer width={width} height={height}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
}
