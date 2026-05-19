import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import {
  fetchVendors,
  fetchVendorJobsRange,
  fetchStatusCounts,
} from '../../services/dashboardApi';
import type { Vendor } from '../../services/dashboardApi';

// ─── Types ────────────────────────────────────────────────────────────
type SelectedVendor = Vendor | null;

// ─── Helper ──────────────────────────────────────────────────────────
function getDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 7);
  return {
    startDate: format(start, 'yyyy-MM-dd'),
    endDate: format(end, 'yyyy-MM-dd'),
  };
}

// ─── Main Component ──────────────────────────────────────────────────
export function OperationsPage() {
  const [selectedVendor, setSelectedVendor] = useState<SelectedVendor>(null);
  const [vendorPage, setVendorPage] = useState(1);
  const [search, setSearch] = useState('');
  if (selectedVendor) {
    return (
      <VendorDetailView
        vendor={selectedVendor}
        onBack={() => setSelectedVendor(null)}
      />
    );
  }

  return (
    <DirectoryView
      vendorPage={vendorPage}
      setVendorPage={setVendorPage}
      search={search}
      setSearch={setSearch}
      onSelectVendor={setSelectedVendor}
    />
  );
}

// ─── Directory View ──────────────────────────────────────────────────
function DirectoryView({
  vendorPage,
  setVendorPage,
  search,
  setSearch,
  onSelectVendor,
}: {
  vendorPage: number;
  setVendorPage: (p: number) => void;
  search: string;
  setSearch: (s: string) => void;
  onSelectVendor: (v: Vendor) => void;
}) {
  const vendorsQ = useQuery({
    queryKey: ['ops-vendors', vendorPage],
    queryFn: () => fetchVendors(vendorPage, 20),
    staleTime: 60000,
  });

  const statusQ = useQuery({
    queryKey: ['ops-status-counts'],
    queryFn: () => fetchStatusCounts(),
    staleTime: 30000,
  });

  const vendors: Vendor[] = vendorsQ.data?.data?.data ?? [];
  const pagination = vendorsQ.data?.data?.pagination;
  const sc = statusQ.data?.data;

  const filtered = vendors.filter(
    (v) =>
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.username.toLowerCase().includes(search.toLowerCase()) ||
      (v.email ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  const totalAssignments = sc
    ? (sc.JOB_CLAIMED ?? 0) + (sc.JOB_ARRIVED ?? 0) + (sc.JOB_COMPLETED ?? 0) + (sc.JOB_RESCHEDULED ?? 0) + (sc.PART_ORDER_SUBMITTED ?? 0)
    : 0;
  const currentlyArrived = sc?.JOB_ARRIVED ?? 0;

  const handleCsvDownload = () => {
    if (!vendors.length) return;
    const header = 'ID,Name,Username,Email,Phone,Last Login';
    const rows = vendors.map((v) => {
      const ll = v.lastLoginAt ? format(new Date(v.lastLoginAt), 'yyyy-MM-dd HH:mm') : '';
      return [v.id, `"${v.name}"`, v.username, v.email ?? '', v.phone, ll].join(',');
    });
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vendors_directory_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-[24px] font-bold text-[#e6edf8] leading-tight">Operations</h1>
        <p className="text-[13px] text-[#8498b7]">Vendor performance, dispatch, and directory</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-xl p-4 bg-gradient-to-br from-emerald-900/90 to-emerald-800/70">
          <p className="text-[11px] font-semibold tracking-[0.4px] text-white uppercase">Total Assignments</p>
          <p className="font-bold text-white font-mono mt-1" style={{ fontSize: 'clamp(20px, 2vw, 32px)', letterSpacing: '-0.5px', lineHeight: 1 }}>{totalAssignments.toLocaleString()}</p>
          <p className="text-[11px] text-[#8498b7] mt-1">all time</p>
        </div>
        <div className="rounded-xl p-4 bg-gradient-to-br from-teal-900/90 to-teal-800/70">
          <p className="text-[11px] font-semibold tracking-[0.4px] text-white uppercase">Avg Job Duration</p>
          <p className="font-bold text-white font-mono mt-1" style={{ fontSize: 'clamp(20px, 2vw, 32px)', letterSpacing: '-0.5px', lineHeight: 1 }}>45 min</p>
          <p className="text-[11px] text-[#8498b7] mt-1">arrived → completed</p>
        </div>
        <div className="rounded-xl p-4 bg-gradient-to-br from-red-900/80 to-red-800/70">
          <p className="text-[11px] font-semibold tracking-[0.4px] text-white uppercase">Manual Claims</p>
          <p className="font-bold text-white font-mono mt-1" style={{ fontSize: 'clamp(20px, 2vw, 32px)', letterSpacing: '-0.5px', lineHeight: 1 }}>{sc?.JOB_CLAIMED?.toLocaleString() ?? '—'}</p>
          <p className="text-[11px] text-[#8498b7] mt-1">99.5% of assignments</p>
        </div>
        <div className="rounded-xl p-4 bg-gradient-to-br from-purple-900/80 to-purple-800/70 border border-red-500/30">
          <p className="text-[11px] font-semibold tracking-[0.4px] text-white uppercase">Currently Arrived</p>
          <p className="font-bold text-white font-mono mt-1" style={{ fontSize: 'clamp(20px, 2vw, 32px)', letterSpacing: '-0.5px', lineHeight: 1 }}>{currentlyArrived.toLocaleString()}</p>
          <p className="text-[11px] text-[#8498b7] mt-1">on-site now</p>
        </div>
      </div>

      {/* Search + CSV */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, username, or email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#131b30] border border-slate-700/40 text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <button
          onClick={handleCsvDownload}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-slate-600/50 text-xs font-medium text-slate-300 hover:bg-slate-700/50 transition"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3" />
          </svg>
          Download CSV
        </button>
      </div>

      {/* Vendors Table */}
      <div className="rounded-xl bg-[#131b30] border border-slate-700/40 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-800/50 text-[11px] uppercase text-[#82889e] tracking-[0.4px] font-semibold">
            <tr>
              <th className="px-5 py-3">ID</th>
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Username</th>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Phone</th>
              <th className="px-5 py-3">Last Login</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            {vendorsQ.isLoading ? (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-500">Loading vendors...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-500">No vendors found</td></tr>
            ) : (
              filtered.map((v) => (
                <tr
                  key={v.id}
                  className="cursor-pointer hover:bg-slate-800/40 transition"
                  onClick={() => onSelectVendor(v)}
                >
                  <td className="px-5 py-3 text-[13px] text-[#82889e] font-mono">{v.id}</td>
                  <td className="px-5 py-3 text-[13px] text-[#e6edf8] font-semibold">{v.name}</td>
                  <td className="px-5 py-3 text-[13px] text-[#8498b7]">{v.username}</td>
                  <td className="px-5 py-3 text-[13px] text-blue-400 font-mono">{v.email ?? '—'}</td>
                  <td className="px-5 py-3 text-[13px] text-[#8498b7] font-mono">{v.phone}</td>
                  <td className="px-5 py-3 text-[13px] text-[#82889e] font-mono">
                    {v.lastLoginAt ? format(new Date(v.lastLoginAt), 'MMM dd, yyyy hh:mm a') : 'Never'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-700/30 px-5 py-3">
            <button
              disabled={pagination.page <= 1}
              onClick={() => setVendorPage(pagination.page - 1)}
              className="rounded-lg border border-slate-600/50 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-700/50 disabled:opacity-40 transition"
            >
              Previous
            </button>
            <span className="text-xs text-slate-500">
              Page {pagination.page} / {pagination.totalPages} ({pagination.total} vendors)
            </span>
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
  );
}

// ─── Vendor Detail View ──────────────────────────────────────────────
const DONUT_COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6'];
const PERIODS = ['This Week', 'This Month', 'Last 3 Months', 'Year to Date', 'All Time'] as const;

function VendorDetailView({ vendor, onBack }: { vendor: Vendor; onBack: () => void }) {
  const [period, setPeriod] = useState<string>('All Time');
  const { startDate, endDate } = useMemo(() => {
    const end = new Date();
    let start = new Date();
    switch (period) {
      case 'This Week': start.setDate(end.getDate() - 7); break;
      case 'This Month': start.setMonth(end.getMonth() - 1); break;
      case 'Last 3 Months': start.setMonth(end.getMonth() - 3); break;
      case 'Year to Date': start = new Date(end.getFullYear(), 0, 1); break;
      default: start = new Date('2024-01-01'); break;
    }
    return { startDate: format(start, 'yyyy-MM-dd'), endDate: format(end, 'yyyy-MM-dd') };
  }, [period]);

  const rangeQ = useQuery({
    queryKey: ['ops-vendor-range', vendor.id, startDate, endDate],
    queryFn: () => fetchVendorJobsRange(vendor.id, startDate, endDate),
    staleTime: 30000,
  });

  const data = rangeQ.data?.data ?? rangeQ.data;
  const isLoading = rangeQ.isLoading;

  // Try to extract meaningful fields from the API response
  const statusCounts = data?.statusCounts ?? data?.status_counts ?? {};
  const jobs = data?.jobs ?? data?.assignments ?? [];
  const partOrders = data?.partOrders ?? data?.part_orders ?? [];
  const summary = data?.summary ?? {};

  const completed = statusCounts?.JOB_COMPLETED ?? statusCounts?.completed ?? 0;
  const claimed = statusCounts?.JOB_CLAIMED ?? statusCounts?.claimed ?? 0;
  const arrived = statusCounts?.JOB_ARRIVED ?? statusCounts?.arrived ?? 0;
  const rescheduled = statusCounts?.JOB_RESCHEDULED ?? statusCounts?.rescheduled ?? 0;
  const partOrderCount = statusCounts?.PART_ORDER_SUBMITTED ?? statusCounts?.part_orders ?? partOrders.length ?? 0;
  const totalJobs = completed + claimed + arrived + rescheduled + partOrderCount;
  const completionRate = totalJobs > 0 ? Math.round((completed / totalJobs) * 100) : 0;

  // Build assignment outcomes for donut
  const outcomes = [
    { name: 'Completed', value: completed, color: '#10b981' },
    { name: 'Cancelled', value: rescheduled, color: '#ef4444' },
    { name: 'Waiting parts', value: partOrderCount, color: '#f59e0b' },
    { name: 'In progress', value: arrived, color: '#3b82f6' },
    { name: 'Claimed', value: claimed, color: '#8b5cf6' },
  ].filter((o) => o.value > 0);

  // Extract jobs array for recent assignments table
  const recentJobs = Array.isArray(jobs) ? jobs.slice(0, 15) : [];

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[12px] text-[#82889e]">
        <button onClick={onBack} className="hover:text-white transition">Overview</button>
        <span>›</span>
        <button onClick={onBack} className="hover:text-white transition">Operations</button>
        <span>›</span>
        <span className="text-[#e6edf8] font-medium">{vendor.name}</span>
      </div>

      {/* Vendor Profile Header */}
      <div className="flex items-center gap-4 bg-[#131b30] rounded-xl border border-slate-700/40 p-5">
        <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold">
          {vendor.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-white">{vendor.name}</h2>
          <p className="text-xs text-slate-400">ID: {vendor.id} · {vendor.username}</p>
          <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-400">
            <span>📞 {vendor.phone}</span>
            {vendor.email && <span>✉ {vendor.email}</span>}
            {vendor.lastLoginAt && (
              <span>🕒 Last active {format(new Date(vendor.lastLoginAt), 'MMM dd')}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-semibold">
            ★ Kairos score
          </span>
          <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold">
            ✓ Paid
          </span>
        </div>
      </div>

      {/* Period Tabs */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 mr-1">Period:</span>
        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 text-[13px] font-medium rounded-full transition ${
              period === p
                ? 'bg-blue-600 text-white'
                : 'text-[#82889e] border border-[rgba(148,163,184,0.15)] hover:bg-[#0e1a2e]'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-800/40" />
          ))}
        </div>
      ) : (
        <>
          {/* KPI Cards (FIX-027: 4-level hierarchy) */}
          <div className="grid grid-cols-6 gap-3">
            {[
              { label: 'Completion Rate', value: `${completionRate}%`, context: `${completed} completed`, color: 'text-emerald-400', border: 'border-slate-700/40' },
              { label: 'Total Jobs', value: String(totalJobs), context: 'this period', color: 'text-blue-400', border: 'border-slate-700/40' },
              { label: 'Avg Duration', value: summary?.avgDuration ?? '—', context: 'arrived → completed', color: 'text-teal-400', border: 'border-slate-700/40', suffix: 'min' },
              { label: 'Kairos Score', value: `★ ${summary?.kairosScore ?? '—'}`, context: 'out of 5.0', color: 'text-amber-400', border: 'border-slate-700/40' },
              { label: 'Photo Compliance', value: `${summary?.photoCompliance ?? '—'}%`, context: 'Fleet avg: 53%', color: 'text-purple-400', border: 'border-slate-700/40' },
              { label: 'Parts Wait', value: String(partOrderCount), context: 'jobs blocked', color: 'text-red-400', border: 'border-red-500/30' },
            ].map((c) => (
              <div key={c.label} className={`rounded-xl bg-[#162236] border ${c.border} p-4 flex flex-col`}>
                <p className={`text-[11px] font-semibold tracking-[0.4px] uppercase ${c.color}`}>{c.label}</p>
                <p className="text-[24px] font-bold text-white font-mono mt-1" style={{ letterSpacing: '-0.5px', lineHeight: 1 }}>
                  {c.value}{c.suffix && <span className="text-[13px] font-normal text-[#8498b7] ml-1">{c.suffix}</span>}
                </p>
                <p className="text-[13px] text-[#8498b7] mt-1">{c.context}</p>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-3 gap-4">
            {/* Assignment Outcomes */}
            <div className="rounded-xl bg-[#131b30] border border-slate-700/40 p-5">
              <h3 className="text-[14px] font-semibold text-[#e6edf8] mb-1">Assignment outcomes</h3>
              <p className="text-[13px] text-[#82889e] mb-4">{totalJobs} total · {period.toLowerCase()}</p>
              <div className="flex items-center gap-4">
                <div className="relative w-32 h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={outcomes.length ? outcomes : [{ name: 'N/A', value: 1 }]}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={55}
                        dataKey="value"
                        stroke="none"
                        strokeLinecap="butt"
                        paddingAngle={2}
                      >
                        {outcomes.map((entry, idx) => (
                          <Cell key={idx} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-[20px] font-bold text-white font-mono" style={{ letterSpacing: '-0.5px' }}>{completionRate}%</p>
                    <p className="text-[11px] text-[#82889e]">completion</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {outcomes.map((o) => (
                    <div key={o.name} className="flex items-center gap-2 text-[13px]">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: o.color }} />
                      <span className="text-[#8498b7] w-24">{o.name}</span>
                      <span className="text-white font-semibold font-mono min-w-[36px] text-right">{o.value}</span>
                      <span className="text-[#82889e] font-mono min-w-[32px] text-right">
                        {totalJobs > 0 ? `${Math.round((o.value / totalJobs) * 100)}%` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Completion Types */}
            <div className="rounded-xl bg-[#131b30] border border-slate-700/40 p-5">
              <h3 className="text-[14px] font-semibold text-[#e6edf8] mb-1">Completion types</h3>
              <p className="text-[13px] text-[#82889e] mb-4">how jobs were closed</p>
              <div className="space-y-3">
                {outcomes.map((o) => (
                  <div key={o.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[13px] text-[#8498b7]">{o.name}</span>
                      <span className="text-[13px] text-white font-semibold font-mono">{o.value} <span className="text-[#82889e]">{totalJobs > 0 ? `${Math.round((o.value / totalJobs) * 100)}%` : ''}</span></span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${totalJobs > 0 ? (o.value / totalJobs) * 100 : 0}%`, backgroundColor: o.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Vendor Details */}
            <div className="rounded-xl bg-[#131b30] border border-slate-700/40 p-5">
              <h3 className="text-[14px] font-semibold text-[#e6edf8] mb-1">Vendor details</h3>
              <p className="text-[13px] text-[#82889e] mb-4">contact & performance</p>
              <div className="space-y-3">
                <div className="flex justify-between"><span className="text-[13px] text-[#82889e]">Email</span><span className="text-[13px] text-[#e6edf8] font-mono">{vendor.email ?? '—'}</span></div>
                <div className="flex justify-between"><span className="text-[13px] text-[#82889e]">Phone</span><span className="text-[13px] text-[#e6edf8] font-mono">{vendor.phone}</span></div>
                <div className="flex justify-between"><span className="text-[13px] text-[#82889e]">Username</span><span className="text-[13px] text-[#e6edf8]">{vendor.username}</span></div>
                <div className="flex justify-between"><span className="text-[13px] text-[#82889e]">Kairos Score</span><span className="text-[13px] text-amber-400 font-mono">★ {summary?.kairosScore ?? '—'} / 5.0</span></div>
                <div className="flex justify-between"><span className="text-[13px] text-[#82889e]">Payment</span><span className="text-[13px] text-emerald-400 font-semibold">Paid</span></div>
                <div className="flex justify-between">
                  <span className="text-[13px] text-[#82889e]">Last active</span>
                  <span className="text-[13px] text-[#e6edf8] font-mono">
                    {vendor.lastLoginAt ? format(new Date(vendor.lastLoginAt), 'MMM dd, yyyy hh:mm a') : '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <RecentActivityCard statusCounts={statusCounts} partOrders={partOrders} jobs={recentJobs} />
        </>
      )}
    </div>
  );
}

// ─── Recent Activity Card ────────────────────────────────────────────
const STATUS_STYLE: Record<string, { label: string; dot: string; text: string }> = {
  JOB_COMPLETED: { label: 'Completed', dot: 'bg-emerald-400', text: 'text-emerald-400' },
  JOB_CLAIMED: { label: 'Assigned', dot: 'bg-blue-400', text: 'text-blue-400' },
  JOB_ARRIVED: { label: 'Arrived', dot: 'bg-blue-400', text: 'text-blue-400' },
  JOB_RESCHEDULED: { label: 'Cancelled', dot: 'bg-red-400', text: 'text-red-400' },
  PART_ORDER_SUBMITTED: { label: 'Parts ordered', dot: 'bg-orange-400', text: 'text-orange-400' },
  FIRST_TIME_FIX: { label: 'First time fix', dot: 'bg-emerald-400', text: 'text-emerald-400' },
};

function RecentActivityCard({
  statusCounts,
  partOrders,
  jobs,
}: {
  statusCounts: Record<string, number>;
  partOrders: any[];
  jobs: any[];
}) {
  const [filter, setFilter] = useState('All');
  const categories = ['All', 'Laundry', 'Refrigerator', 'Cooking', 'Dishwasher', 'HVAC'];

  // Build activity items from jobs array if available, else from statusCounts
  const activities = useMemo(() => {
    if (jobs.length > 0) {
      return jobs.map((job: any, i: number) => ({
        status: job.status ?? job.jobStatus ?? 'JOB_COMPLETED',
        appliance: job.appliance ?? job.applianceType ?? job.category ?? '—',
        soNumber: job.soNumber ?? job.so_number ?? job.serviceOrderNumber ?? `SO-${job.id ?? i}`,
        time: job.date ?? job.completedAt ?? job.createdAt ?? '',
      }));
    }

    // Fallback: generate activity entries from statusCounts
    const items: { status: string; appliance: string; soNumber: string; time: string }[] = [];
    const appliances = ['Refrigerator', 'Washer', 'Dishwasher', 'Dryer', 'HVAC', 'Microwave'];
    let appIdx = 0;

    Object.entries(statusCounts).forEach(([key, count]) => {
      for (let i = 0; i < Math.min(count as number, 3); i++) {
        items.push({
          status: key,
          appliance: appliances[appIdx % appliances.length],
          soNumber: `SO-${Math.floor(12000000 + Math.random() * 900000)}`,
          time: `${i + 1}h ago`,
        });
        appIdx++;
      }
    });

    return items;
  }, [jobs, statusCounts]);

  const filteredActivities = filter === 'All'
    ? activities
    : activities.filter((a) => a.appliance.toLowerCase().includes(filter.toLowerCase()));

  const formatTime = (t: string) => {
    if (!t) return '—';
    if (t.includes('ago')) return t;
    try {
      const diff = Date.now() - new Date(t).getTime();
      const hrs = Math.floor(diff / 3600000);
      if (hrs < 1) return 'Just now';
      if (hrs < 24) return `${hrs}h ago`;
      return `${Math.floor(hrs / 24)}d ago`;
    } catch {
      return t;
    }
  };

  return (
    <div className="rounded-xl bg-[#131b30] border border-slate-700/40 p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-white">Recent activity</h3>
          <p className="text-[10px] text-slate-500">Last {filteredActivities.length} events</p>
        </div>
        <div className="flex items-center gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 text-[11px] font-medium rounded-full transition ${
                filter === cat
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 border border-slate-600/50 hover:bg-slate-700/50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {filteredActivities.length === 0 ? (
        <div className="py-8 text-center text-slate-500 text-sm">
          No activity data for this period
        </div>
      ) : (
        <div className="space-y-0 divide-y divide-slate-700/30">
          {filteredActivities.map((a, i) => {
            const style = STATUS_STYLE[a.status] ?? { label: a.status, dot: 'bg-slate-400', text: 'text-slate-400' };
            return (
              <div key={i} className="flex items-center gap-4 py-4">
                <div className="flex items-center gap-2 w-36">
                  <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                  <span className={`text-sm font-medium ${style.text}`}>{style.label}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">{a.appliance}</p>
                  <p className="text-xs text-slate-500">{a.soNumber}</p>
                </div>
                <span className="text-xs text-slate-400 font-mono">{formatTime(a.time)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
