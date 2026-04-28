import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { TimeSeriesPoint } from '../../services/dashboardApi';

type Props = {
  data: Record<string, TimeSeriesPoint[]> | undefined;
  isLoading: boolean;
  groupBy?: string;
};

const LINE_CONFIG: { key: string; label: string; color: string }[] = [
  { key: 'JOB_CLAIMED', label: 'Claimed', color: '#3b82f6' },
  { key: 'JOB_ARRIVED', label: 'Arrived', color: '#f59e0b' },
  { key: 'JOB_COMPLETED', label: 'Completed', color: '#10b981' },
  { key: 'JOB_RESCHEDULED', label: 'Rescheduled', color: '#f97316' },
  { key: 'PART_ORDER_SUBMITTED', label: 'Part Orders', color: '#8b5cf6' },
];

export function JobTrendChart({ data, isLoading, groupBy }: Props) {
  const chartData = useMemo(() => {
    if (!data) return [];

    const periodsSet = new Set<string>();
    Object.values(data).forEach((points) => {
      points.forEach((p) => periodsSet.add(p.period));
    });

    const periods = Array.from(periodsSet).sort();

    return periods.map((period) => {
      const row: Record<string, string | number> = { period };
      LINE_CONFIG.forEach(({ key }) => {
        const point = data[key]?.find((p) => p.period === period);
        row[key] = point?.count ?? 0;
      });
      return row;
    });
  }, [data]);

  if (isLoading) {
    return (
      <div className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-white" />
    );
  }

  if (!chartData.length) {
    return (
      <div className="flex h-80 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400">
        No trend data available
      </div>
    );
  }

  const formatLabel = (value: string) => {
    if (groupBy === 'day') {
      const d = new Date(value + 'T00:00:00');
      return `${d.getMonth() + 1}/${d.getDate()}`;
    }
    if (groupBy === 'month') {
      const [y, m] = value.split('-');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[Number(m) - 1]} ${y.slice(2)}`;
    }
    return value;
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-slate-700">Job Status Trend</h3>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="period"
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickFormatter={formatLabel}
          />
          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              fontSize: 12,
            }}
            labelFormatter={formatLabel}
          />
          <Legend
            wrapperStyle={{ fontSize: 12 }}
            iconType="circle"
          />
          {LINE_CONFIG.map(({ key, label, color }) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              name={label}
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
