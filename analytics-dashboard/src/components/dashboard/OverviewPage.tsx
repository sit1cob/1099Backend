import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
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
import {
  fetchVendorCount,
  fetchVendors,
  fetchCompletedJobs,
  fetchStatusCounts,
  fetchStatusTimeSeries,
  fetchVendorJobs,
} from '../../services/dashboardApi';
import type {
  StatusCounts,
  TimeSeriesPoint,
  CompletedVendor,
  Vendor,
} from '../../services/dashboardApi';

// ─── KPI Card Configs ────────────────────────────────────────────────
type KpiConfig = {
  key: string;
  label: string;
  sub: string;
  bg: string;
  icon: React.ReactNode;
};

const cardIcon = (d: string) => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

// ─── Trend Chart Config ──────────────────────────────────────────────
const LINE_CONFIG = [
  { key: 'UNCLAIMED', label: 'Unclaimed', color: '#ef4444' },
  { key: 'JOB_CLAIMED', label: 'Claimed', color: '#3b82f6' },
  { key: 'JOB_ARRIVED', label: 'Arrived', color: '#f59e0b' },
  { key: 'JOB_COMPLETED', label: 'Completed', color: '#10b981' },
  { key: 'JOB_RESCHEDULED', label: 'Rescheduled', color: '#f97316' },
  { key: 'PART_ORDER_SUBMITTED', label: 'Part Orders', color: '#8b5cf6' },
];

type TrendPeriod = 'week' | 'month' | 'year';

// ─── Main Component ──────────────────────────────────────────────────
export function OverviewPage({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [startDate, setStartDate] = useState('2026-03-30');
  const [endDate, setEndDate] = useState('2026-04-29');
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>('month');
  const [vendorPage, setVendorPage] = useState(1);
  const [vendorSearch, setVendorSearch] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<{ id: number; name?: string } | null>(null);

  const dateParams = startDate && endDate ? { startDate, endDate } : undefined;

  // ── Data queries ──
  const vendorCountQ = useQuery({
    queryKey: ['dash-vendor-count'],
    queryFn: fetchVendorCount,
    staleTime: 60000,
  });

  const statusQ = useQuery({
    queryKey: ['dash-status', startDate, endDate],
    queryFn: () => fetchStatusCounts(dateParams),
    staleTime: 30000,
    refetchInterval: 30000,
  });

  const completedQ = useQuery({
    queryKey: ['dash-completed', startDate, endDate],
    queryFn: () => fetchCompletedJobs(dateParams),
    staleTime: 60000,
  });

  const trendQ = useQuery({
    queryKey: ['dash-trend', trendPeriod],
    queryFn: () => fetchStatusTimeSeries(trendPeriod),
    staleTime: 60000,
  });

  const vendorsQ = useQuery({
    queryKey: ['dash-vendors', vendorPage],
    queryFn: () => fetchVendors(vendorPage, 20),
    staleTime: 60000,
  });

  const vendorDetailQ = useQuery({
    queryKey: ['dash-vendor-detail', selectedVendor?.id],
    queryFn: () => fetchVendorJobs(selectedVendor!.id),
    enabled: !!selectedVendor,
    staleTime: 30000,
  });

  // ── Derived ──
  const sc = statusQ.data?.data;
  const vendorCount = vendorCountQ.data?.data?.total;
  const completedOverall = completedQ.data?.data?.overall;

  const kpiCards: (KpiConfig & { value: number | string })[] = [
    {
      key: 'completed',
      label: 'COMPLETED',
      sub: 'this month',
      bg: 'bg-gradient-to-br from-emerald-900/90 to-emerald-800/80',
      icon: cardIcon('M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'),
      value: completedOverall?.toLocaleString() ?? sc?.JOB_COMPLETED?.toLocaleString() ?? '—',
    },
    {
      key: 'claimed',
      label: 'CLAIMED',
      sub: 'this month',
      bg: 'bg-gradient-to-br from-teal-900/90 to-teal-800/80',
      icon: cardIcon('M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'),
      value: sc?.JOB_CLAIMED?.toLocaleString() ?? '—',
    },
    {
      key: 'arrived',
      label: 'ARRIVED ON-SITE',
      sub: 'this month',
      bg: 'bg-gradient-to-br from-amber-900/80 to-yellow-900/70',
      icon: cardIcon('M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z'),
      value: sc?.JOB_ARRIVED?.toLocaleString() ?? '—',
    },
    {
      key: 'rescheduled',
      label: 'RESCHEDULED',
      sub: 'this month',
      bg: 'bg-gradient-to-br from-purple-900/90 to-purple-800/80',
      icon: cardIcon('M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'),
      value: sc?.JOB_RESCHEDULED?.toLocaleString() ?? '—',
    },
    {
      key: 'partOrders',
      label: 'PART ORDERS',
      sub: 'this month',
      bg: 'bg-gradient-to-br from-slate-800/90 to-slate-700/80',
      icon: cardIcon('M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'),
      value: sc?.PART_ORDER_SUBMITTED?.toLocaleString() ?? '—',
    },
    {
      key: 'vendors',
      label: 'ACTIVE VENDORS',
      sub: 'total registered',
      bg: 'bg-gradient-to-br from-blue-900/90 to-cyan-900/80',
      icon: cardIcon('M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z'),
      value: vendorCount?.toLocaleString() ?? '—',
    },
  ];

  // ── Chart data ──
  const chartData = useMemo(() => {
    const raw = trendQ.data?.data?.data;
    if (!raw) return [];
    const periodsSet = new Set<string>();
    Object.values(raw).forEach((pts) => pts.forEach((p) => periodsSet.add(p.period)));
    return Array.from(periodsSet).sort().map((period) => {
      const row: Record<string, string | number> = { period };
      LINE_CONFIG.forEach(({ key }) => {
        if (key === 'UNCLAIMED') return;
        const pt = raw[key]?.find((p: TimeSeriesPoint) => p.period === period);
        row[key] = pt?.count ?? 0;
      });
      return row;
    });
  }, [trendQ.data]);

  const groupBy = trendQ.data?.data?.groupBy;
  const formatLabel = (v: string) => {
    if (groupBy === 'day') {
      const d = new Date(v + 'T00:00:00');
      return `${d.getMonth() + 1}/${d.getDate()}`;
    }
    if (groupBy === 'month') {
      const [y, m] = v.split('-');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[Number(m) - 1]} ${y.slice(2)}`;
    }
    return v;
  };

  // ── Recommended actions ──
  const actions = useMemo(() => {
    const items: { icon: string; color: string; text: string; detail: string; btn: string }[] = [];
    const completed = sc?.JOB_COMPLETED ?? 0;
    const rescheduled = sc?.JOB_RESCHEDULED ?? 0;
    const partOrders = sc?.PART_ORDER_SUBMITTED ?? 0;
    const total = (sc?.JOB_CLAIMED ?? 0) + (sc?.JOB_ARRIVED ?? 0) + completed + rescheduled + partOrders;
    const lowVendors = 0;
    items.push({
      icon: 'warn',
      color: 'bg-amber-500/20 text-amber-400',
      text: `${lowVendors} vendors below 20% completion`,
      detail: '— review assignments and consider reassignment',
      btn: 'Review →',
    });
    return items;
  }, [sc]);

  // ── Vendor tables ──
  const completedByVendor: CompletedVendor[] = completedQ.data?.data?.byVendor ?? [];
  const filteredByVendor = completedByVendor.filter((v) =>
    v.vendorName.toLowerCase().includes(vendorSearch.toLowerCase()),
  );
  const vendors: Vendor[] = vendorsQ.data?.data?.data ?? [];
  const pagination = vendorsQ.data?.data?.pagination;

  const lastUpdated = new Date();

  return (
    <div className="space-y-6">
      {/* Title + Date Range */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[24px] font-bold text-[#e6edf8] leading-tight">Job Board Dashboard</h1>
          <p className="text-[13px] text-[#8498b7]">
            Live data from <span className="text-blue-400">pros.shs.com</span> — vendor counts, job statuses, completion metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">From</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-lg border border-slate-600/50 bg-slate-800/60 px-3 py-1.5 text-xs text-slate-300 focus:border-blue-500 focus:outline-none"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-lg border border-slate-600/50 bg-slate-800/60 px-3 py-1.5 text-xs text-slate-300 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-[11px] text-slate-400">
              Updated {format(lastUpdated, 'MMM dd, yyyy')}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-6 gap-3">
        {kpiCards.map((card) => (
          <div key={card.key} className={`rounded-xl p-4 ${card.bg} relative overflow-hidden`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold tracking-[0.4px] text-white uppercase">{card.label}</p>
              <span className="text-white/40">{card.icon}</span>
            </div>
            <p className="font-bold text-white font-mono" style={{ fontSize: 'clamp(20px, 2vw, 32px)', letterSpacing: '-0.5px', lineHeight: 1 }}>{card.value}</p>
            <p className="text-[11px] text-[#8498b7] mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Recommended Actions */}
      <div>
        <p className="text-[11px] font-semibold tracking-[0.6px] text-[#82889e] uppercase mb-3">Recommended Actions</p>
        <div className="space-y-2">
          {actions.map((a, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl bg-[#131b30] border border-slate-700/40 px-5 py-3">
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${a.color}`}>
                {a.icon === 'warn' && (
                  <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M5.07 19h13.86c1.13 0 1.85-1.22 1.28-2.18L13.28 3.18c-.56-.95-1.99-.95-2.56 0L3.79 16.82c-.57.96.14 2.18 1.28 2.18z" />
                  </svg>
                )}
                {a.icon === 'parts' && (
                  <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                )}
                {a.icon === 'resched' && (
                  <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9" />
                  </svg>
                )}
              </span>
              <div className="flex-1">
                <span className="text-[13px] font-bold text-[#e6edf8]">{a.text}</span>
                <span className="text-[13px] font-normal text-[#8498b7]">{a.detail}</span>
              </div>
              <button
                onClick={() => onNavigate?.('Operations')}
                className="text-xs font-medium text-slate-400 hover:text-white border border-slate-600/50 rounded-lg px-3 py-1.5 transition hover:bg-slate-700/50"
              >
                {a.btn}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Job Status Trend */}
      <div className="rounded-xl bg-[#131b30] border border-slate-700/40 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[14px] font-semibold text-[#e6edf8]">Job Status Trend</h3>
            <p className="text-[13px] text-[#82889e]">Job count &middot; {trendPeriod} view</p>
          </div>
          <div className="flex items-center gap-1 bg-slate-800/60 rounded-lg p-0.5">
            <button className="px-2.5 py-1 text-[11px] text-slate-400 rounded">◆ Data</button>
            {(['week', 'month', 'year'] as TrendPeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setTrendPeriod(p)}
                className={`px-3 py-1 text-[11px] font-medium rounded transition ${
                  trendPeriod === p
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {trendQ.isLoading ? (
          <div className="h-80 animate-pulse rounded-xl bg-slate-800/40" />
        ) : !chartData.length ? (
          <div className="flex h-80 items-center justify-center text-slate-500">No trend data</div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickFormatter={formatLabel}
                stroke="#334155"
              />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} stroke="#334155" label={{ value: 'Job count', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11, dx: -5 }} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid #334155',
                  backgroundColor: '#1e293b',
                  color: '#e2e8f0',
                  fontSize: 12,
                }}
                labelFormatter={formatLabel}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} iconType="circle" />
              {LINE_CONFIG.filter((c) => c.key !== 'UNCLAIMED').map(({ key, label, color }) => (
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
        )}
      </div>

      {/* Bottom tables */}
      <div className="grid grid-cols-2 gap-5">
        {/* Completed by Vendor */}
        <div className="rounded-xl bg-[#131b30] border border-slate-700/40 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/30">
            <div>
              <h3 className="text-[14px] font-semibold text-[#e6edf8]">Completed by Vendor</h3>
              {completedOverall !== undefined && (
                <p className="text-[13px] text-[#82889e]">
                  Total: <span className="text-emerald-400 font-semibold font-mono">{completedOverall.toLocaleString()}</span>
                </p>
              )}
            </div>
            <input
              type="text"
              placeholder="Search vendor..."
              value={vendorSearch}
              onChange={(e) => setVendorSearch(e.target.value)}
              className="w-40 rounded-lg border border-slate-600/50 bg-slate-800/60 px-3 py-1.5 text-xs text-slate-300 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="max-h-[380px] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-800/80 text-[11px] uppercase text-[#82889e] tracking-[0.4px] font-semibold">
                <tr>
                  <th className="px-5 py-2">#</th>
                  <th className="px-5 py-2">Vendor</th>
                  <th className="px-5 py-2 text-right">Done</th>
                  <th className="px-5 py-2 text-right">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {completedQ.isLoading ? (
                  <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-500">Loading...</td></tr>
                ) : filteredByVendor.length === 0 ? (
                  <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-500">No vendors found</td></tr>
                ) : (
                  filteredByVendor.map((v, i) => (
                    <tr
                      key={v.vendorId}
                      className="cursor-pointer hover:bg-slate-800/40 transition"
                      onClick={() => setSelectedVendor({ id: v.vendorId, name: v.vendorName })}
                    >
                      <td className="px-5 py-2.5 text-[13px] text-[#82889e] font-mono">{i + 1}</td>
                      <td className="px-5 py-2.5">
                        <span className="text-[13px] text-[#e6edf8] font-semibold">{v.vendorName}</span>
                        <span className="block text-[11px] text-[#82889e] font-mono">ID: {v.vendorId}</span>
                      </td>
                      <td className="px-5 py-2.5 text-right text-[13px] text-emerald-400 font-semibold font-mono">
                        {v.completedCount.toLocaleString()}
                      </td>
                      <td className="px-5 py-2.5 text-right text-[13px] text-[#8498b7] font-mono">
                        {completedOverall ? `${((v.completedCount / completedOverall) * 100).toFixed(1)}%` : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* All Vendors */}
        <div className="rounded-xl bg-[#131b30] border border-slate-700/40 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/30">
            <div>
              <h3 className="text-[14px] font-semibold text-[#e6edf8]">All Vendors</h3>
              {pagination && (
                <p className="text-[13px] text-[#82889e]">
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search..."
                className="w-28 rounded-lg border border-slate-600/50 bg-slate-800/60 px-3 py-1.5 text-xs text-slate-300 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
              <button className="flex items-center gap-1 text-xs text-slate-400 border border-slate-600/50 rounded-lg px-2.5 py-1.5 hover:bg-slate-700/50 transition">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3" />
                </svg>
                CSV
              </button>
            </div>
          </div>
          <div className="max-h-[380px] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-800/80 text-[11px] uppercase text-[#82889e] tracking-[0.4px] font-semibold">
                <tr>
                  <th className="px-4 py-2">ID</th>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Username</th>
                  <th className="px-4 py-2">Phone</th>
                  <th className="px-4 py-2">Last Login</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {vendorsQ.isLoading ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Loading...</td></tr>
                ) : vendors.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No vendors found</td></tr>
                ) : (
                  vendors.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-4 py-2.5 text-[13px] text-[#82889e] font-mono">{v.id}</td>
                      <td className="px-4 py-2.5 text-[13px] text-[#e6edf8] font-semibold">{v.name}</td>
                      <td className="px-4 py-2.5 text-[13px] text-[#8498b7]">{v.username}</td>
                      <td className="px-4 py-2.5 text-[13px] text-[#8498b7] font-mono">{v.phone}</td>
                      <td className="px-4 py-2.5 text-[13px] text-[#82889e] font-mono">
                        {v.lastLoginAt
                          ? format(new Date(v.lastLoginAt), 'MMM d, yyyy h:mm a')
                          : 'Never'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-700/30 px-5 py-3">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setVendorPage(pagination.page - 1)}
                className="rounded-lg border border-slate-600/50 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-700/50 disabled:opacity-40 transition"
              >
                Previous
              </button>
              <span className="text-xs text-slate-500">Page {pagination.page} / {pagination.totalPages}</span>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setVendorPage(pagination.page + 1)}
                className="rounded-lg border border-slate-600/50 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-700/50 disabled:opacity-40 transition"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Vendor Detail Modal */}
      {selectedVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setSelectedVendor(null)}>
          <div className="w-full max-w-md rounded-2xl bg-[#131b30] border border-slate-700/50 p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">{selectedVendor.name ?? `Vendor #${selectedVendor.id}`}</h3>
                <p className="text-xs text-slate-500">ID: {selectedVendor.id}</p>
              </div>
              <button onClick={() => setSelectedVendor(null)} className="p-1 text-slate-400 hover:text-white transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {vendorDetailQ.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-8 animate-pulse rounded bg-slate-800/60" />
                ))}
              </div>
            ) : vendorDetailQ.data?.data ? (
              <div className="space-y-2">
                {Object.entries(vendorDetailQ.data.data.statusCounts).map(([key, count]) => {
                  const labels: Record<string, string> = {
                    JOB_CLAIMED: 'Claimed', JOB_STARTED: 'Started', JOB_ARRIVED: 'Arrived',
                    JOB_COMPLETED: 'Completed', JOB_RESCHEDULED: 'Rescheduled', PART_ORDER_SUBMITTED: 'Part Orders',
                  };
                  if (!labels[key]) return null;
                  return (
                    <div key={key} className="flex items-center justify-between rounded-lg bg-slate-800/50 px-4 py-2.5">
                      <span className="text-sm text-slate-300">{labels[key]}</span>
                      <span className="text-sm font-bold text-white">{(count as number).toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No data available</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
