import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ApiAnalyticsRecord } from '../types';
import { format } from 'date-fns';

type LatencyTrendProps = {
  data: ApiAnalyticsRecord[];
};

export function LatencyTrend({ data }: LatencyTrendProps) {
  const chartData = data
    .slice()
    .reverse()
    .map((record) => ({
      date: format(new Date(record.createdAt), 'HH:mm:ss'),
      latency: record.elapsedMs ?? 0,
    }));

  if (!chartData.length) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white text-sm text-slate-500">
        No samples to chart yet.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Latency trend</p>
          <p className="text-lg font-semibold text-slate-900">Last {chartData.length} requests</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={chartData} margin={{ top: 16, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="latency" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
          <YAxis
            dataKey="latency"
            unit="ms"
            stroke="#94a3b8"
            fontSize={12}
            domain={[0, 'auto']}
            allowDecimals={false}
          />
          <Tooltip formatter={(value) => `${value} ms`} labelStyle={{ color: '#0f172a' }} />
          <Area
            type="monotone"
            dataKey="latency"
            stroke="#4338ca"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#latency)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

