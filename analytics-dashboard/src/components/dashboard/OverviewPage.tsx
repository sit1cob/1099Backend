import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  fetchVendorCount,
  fetchVendors,
  fetchCompletedJobs,
  fetchStatusCounts,
  fetchStatusTimeSeries,
  fetchVendorStatusRange,
} from '../../services/dashboardApi';
import type {
  TimeSeriesPoint,
  CompletedVendor,
  VendorStatusRow,
  Vendor,
} from '../../services/dashboardApi';

// ─── KPI Card Config ─────────────────────────────────────────────────
type KpiConfig = {
  key: string;
  label: string;
  sub: string;
  iconPath: string;
  kc: string;
  kcRgb: string;
  delta?: string;
  deltaUp?: boolean;
  useDateRange?: boolean;
};

// ─── Trend Chart Config ──────────────────────────────────────────────
const LINE_SERIES = [
  { key: 'JOB_CLAIMED', label: 'Claimed', color: '#5484d1' },
  { key: 'JOB_ARRIVED', label: 'Arrived', color: '#d57033' },
  { key: 'JOB_COMPLETED', label: 'Completed', color: '#67BD6D' },
  { key: 'JOB_RESCHEDULED', label: 'Rescheduled', color: '#D95459' },
  { key: 'PART_ORDER_SUBMITTED', label: 'Part Orders', color: '#8b61ae' },
];

type TrendRange = 'page' | '7d' | '30d' | '12m' | 'custom';
type TrendView = 'chart' | 'table';
type TrendGroupBy = 'day' | 'week' | 'month';

// ─── Fmt helper ──────────────────────────────────────────────────────
const fmt = (n: number | undefined) => n?.toLocaleString() ?? '—';

// ─── Main Component ──────────────────────────────────────────────────
export function OverviewPage({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [startDate, setStartDate] = useState('2026-05-16');
  const [endDate, setEndDate] = useState('2026-06-12');
  const [trendRange, setTrendRange] = useState<TrendRange>('page');
  const [trendView, setTrendView] = useState<TrendView>('chart');
  const [trendGroupBy, setTrendGroupBy] = useState<TrendGroupBy>('day');
  const [vendorPage, setVendorPage] = useState(1);
  const [vendorSearch, setVendorSearch] = useState('');
  const [vbdSearch, setVbdSearch] = useState('');
  const [vbdPage, setVbdPage] = useState(1);
  const [selectedVendor, setSelectedVendor] = useState<{ id: number; name?: string } | null>(null);
  const [vendorDropdownOpen, setVendorDropdownOpen] = useState(false);
  const [vendorDropdownSearch, setVendorDropdownSearch] = useState('');
  const [trendFrom, setTrendFrom] = useState('2026-05-16');
  const [trendTo, setTrendTo] = useState('2026-06-12');
  const vendorDropdownRef = useRef<HTMLDivElement>(null);
  const startDateRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);
  const trendFromRef = useRef<HTMLInputElement>(null);
  const trendToRef = useRef<HTMLInputElement>(null);

  // Close vendor dropdown on click outside
  useEffect(() => {
    if (!vendorDropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (vendorDropdownRef.current && !vendorDropdownRef.current.contains(e.target as Node)) {
        setVendorDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [vendorDropdownOpen]);

  const dateParams = { startDate, endDate };
  const trendPeriod = trendRange === '7d' ? 'week' as const : trendRange === '12m' ? 'year' as const : 'month' as const;

  // Which granularities are valid for the active range
  const validGrains = useMemo((): TrendGroupBy[] => {
    if (trendRange === '12m') return ['month'];
    if (trendRange === '7d') return ['day'];
    if (trendRange === '30d') return ['day', 'week'];
    if (trendRange === 'custom') {
      const from = new Date(trendFrom + 'T00:00:00');
      const to = new Date(trendTo + 'T00:00:00');
      const span = Math.round((to.getTime() - from.getTime()) / 864e5) + 1;
      return span >= 14 ? ['day', 'week'] : ['day'];
    }
    // 'page'
    const from = new Date(startDate + 'T00:00:00');
    const to = new Date(endDate + 'T00:00:00');
    const span = Math.round((to.getTime() - from.getTime()) / 864e5) + 1;
    return span >= 14 ? ['day', 'week'] : ['day'];
  }, [trendRange, trendFrom, trendTo, startDate, endDate]);

  // Auto-snap grain to a valid option when range changes
  const handleRangeChange = (r: TrendRange) => {
    setTrendRange(r);
    // Pre-compute valid grains for the new range
    let valid: TrendGroupBy[];
    if (r === '12m') valid = ['month'];
    else if (r === '7d') valid = ['day'];
    else if (r === '30d') valid = ['day', 'week'];
    else valid = ['day', 'week'];
    if (!valid.includes(trendGroupBy)) setTrendGroupBy(valid[0]);
  };

  // Formatted date range for display
  const fmtDate = (iso: string) => {
    const d = new Date(iso + 'T00:00:00');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()}`;
  };
  const dateRangeLabel = `${fmtDate(startDate)} – ${fmtDate(endDate)}`;

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

  const vbdQ = useQuery({
    queryKey: ['dash-vbd', startDate, endDate],
    queryFn: () => fetchVendorStatusRange({ startDate, endDate, page: 1, limit: 1000 }),
    staleTime: 60000,
  });

  // ── Derived ──
  const sc = statusQ.data?.data;
  const vendorCount = vendorCountQ.data?.data?.total;
  const completedOverall = completedQ.data?.data?.overall;
  const vbdTotals = vbdQ.data?.data?.totals;
  const totalJobs = sc ? (sc.JOB_CLAIMED + sc.JOB_ARRIVED + sc.JOB_COMPLETED + sc.JOB_RESCHEDULED + sc.PART_ORDER_SUBMITTED) : undefined;
  const unclaimed = totalJobs && sc ? totalJobs - sc.JOB_CLAIMED : undefined;

  // ── KPI Cards (7 columns) ──
  const kpiCards: (KpiConfig & { value: number | string })[] = [
    {
      key: 'completed',
      label: 'COMPLETED',
      sub: 'this period',
      iconPath: 'M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z',
      kc: '#67bd6d',
      kcRgb: '103,189,109',
      delta: '+15%',
      deltaUp: true,
      value: fmt(vbdTotals?.JOB_COMPLETED ?? completedOverall ?? sc?.JOB_COMPLETED),
    },
    {
      key: 'claimed',
      label: 'CLAIMED',
      sub: 'this period',
      iconPath: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
      kc: '#5484d1',
      kcRgb: '84,132,209',
      delta: '+12%',
      deltaUp: true,
      value: fmt(vbdTotals?.JOB_CLAIMED ?? sc?.JOB_CLAIMED),
    },
    {
      key: 'inProgress',
      label: 'IN PROGRESS',
      sub: 'on-site now',
      iconPath: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10',
      kc: '#d57033',
      kcRgb: '213,112,51',
      delta: '+8%',
      deltaUp: true,
      value: fmt(vbdTotals?.JOB_IN_PROGRESS ?? sc?.JOB_IN_PROGRESS ?? sc?.JOB_ARRIVED),
    },
    {
      key: 'rescheduled',
      label: 'RESCHEDULED',
      sub: 'this period',
      iconPath: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
      kc: '#d95459',
      kcRgb: '217,84,89',
      delta: '+8%',
      deltaUp: false,
      value: fmt(vbdTotals?.JOB_RESCHEDULED ?? sc?.JOB_RESCHEDULED),
    },
    {
      key: 'partOrders',
      label: 'PART ORDERS',
      sub: 'this period',
      iconPath: 'M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z',
      kc: '#8b61ae',
      kcRgb: '139,97,174',
      delta: '-1',
      deltaUp: false,
      value: fmt(vbdTotals?.PART_ORDER_SUBMITTED ?? sc?.PART_ORDER_SUBMITTED),
    },
    {
      key: 'vendors',
      label: 'ACTIVE VENDORS',
      sub: 'total registered',
      useDateRange: false,
      iconPath: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 7a4 4 0 100-8 4 4 0 000 8z M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75',
      kc: '#33bde0',
      kcRgb: '51,189,224',
      value: fmt(vbdTotals?.totalVendors ?? vendorCount),
    },
  ];

  // ── Chart data ──
  const rawChartData = useMemo(() => {
    const raw = trendQ.data?.data?.data;
    if (!raw) return [];
    const periodsSet = new Set<string>();
    Object.values(raw).forEach((pts) => pts.forEach((p) => periodsSet.add(p.period)));
    return Array.from(periodsSet).sort().map((period) => {
      const row: Record<string, string | number> = { period };
      LINE_SERIES.forEach(({ key }) => {
        const pt = raw[key]?.find((p: TimeSeriesPoint) => p.period === period);
        row[key] = pt?.count ?? 0;
      });
      return row;
    });
  }, [trendQ.data]);

  // Filter data by custom/page date range, then aggregate into weekly/monthly buckets
  const chartData = useMemo(() => {
    if (!rawChartData.length) return [];

    // Apply date range filter for custom and page ranges
    let filtered = rawChartData;
    if (trendRange === 'custom' && trendFrom && trendTo) {
      const from = new Date(trendFrom + 'T00:00:00').getTime();
      const to = new Date(trendTo + 'T00:00:00').getTime();
      filtered = rawChartData.filter((d) => {
        const dt = new Date(String(d.period) + 'T00:00:00').getTime();
        return !isNaN(dt) && dt >= from && dt <= to;
      });
    } else if (trendRange === 'page') {
      const from = new Date(startDate + 'T00:00:00').getTime();
      const to = new Date(endDate + 'T00:00:00').getTime();
      filtered = rawChartData.filter((d) => {
        const dt = new Date(String(d.period) + 'T00:00:00').getTime();
        return !isNaN(dt) && dt >= from && dt <= to;
      });
    } else if (trendRange === '7d') {
      filtered = rawChartData.slice(-7);
    }

    if (!filtered.length) return [];
    if (trendGroupBy === 'day') return filtered;

    const keys = LINE_SERIES.map((s) => s.key);

    // Detect if data is already monthly (period like "2026-05" with no day part)
    const firstPeriod = String(filtered[0]?.period ?? '');
    const isAlreadyMonthly = /^\d{4}-\d{2}$/.test(firstPeriod);

    if (trendGroupBy === 'week') {
      if (isAlreadyMonthly) return filtered; // can't split monthly into weeks
      const out: Record<string, string | number>[] = [];
      for (let i = 0; i < filtered.length; i += 7) {
        const chunk = filtered.slice(i, i + 7);
        if (!chunk.length) break;
        const dt = new Date(String(chunk[0].period) + 'T00:00:00');
        const label = `wk ${dt.getMonth() + 1}/${dt.getDate()}`;
        const row: Record<string, string | number> = { period: label };
        keys.forEach((k) => {
          row[k] = chunk.reduce((sum, d) => sum + (Number(d[k]) || 0), 0);
        });
        out.push(row);
      }
      return out;
    }

    if (trendGroupBy === 'month') {
      if (isAlreadyMonthly) return filtered; // already monthly
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const groups: Record<string, Record<string, string | number>> = {};
      const orderedKeys: string[] = [];
      filtered.forEach((d) => {
        const dt = new Date(String(d.period) + 'T00:00:00');
        const key = `${monthNames[dt.getMonth()]} ${dt.getFullYear()}`;
        if (!groups[key]) {
          groups[key] = { period: key };
          keys.forEach((k) => { groups[key][k] = 0; });
          orderedKeys.push(key);
        }
        keys.forEach((k) => {
          (groups[key][k] as number) += Number(d[k]) || 0;
        });
      });
      return orderedKeys.map((k) => groups[k]);
    }

    return filtered;
  }, [rawChartData, trendGroupBy, trendRange, trendFrom, trendTo, startDate, endDate]);

  const formatLabel = (v: string) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    // Weekly buckets created client-side are already formatted (e.g. "wk 3/30")
    if (trendGroupBy === 'week') return String(v);
    // Monthly: format "2025-07" → "Jul" or client-side "Mar 2026" → "Mar"
    if (trendGroupBy === 'month') {
      const ym = v.match(/^(\d{4})-(\d{2})$/);
      if (ym) return months[Number(ym[2]) - 1];
      const named = v.match(/^([A-Za-z]+)/);
      if (named) return named[1];
      return String(v);
    }
    // Daily: format "2026-05-12" → "5/12"
    const d = new Date(v + 'T00:00:00');
    if (!isNaN(d.getTime())) return `${d.getMonth() + 1}/${d.getDate()}`;
    return v;
  };

  // ── Vendor tables (from new range API) ──
  const vbdRows: VendorStatusRow[] = vbdQ.data?.data?.data ?? [];
  const completedByVendor: CompletedVendor[] = completedQ.data?.data?.byVendor ?? [];

  const filteredByVendor = useMemo(() => {
    let list = vbdRows.filter((v) =>
      !vbdSearch || v.vendorName.toLowerCase().includes(vbdSearch.toLowerCase()) || String(v.vendorId).includes(vbdSearch),
    );
    // Sort by completed desc
    list.sort((a, b) => b.statusCounts.JOB_COMPLETED - a.statusCounts.JOB_COMPLETED);
    // Pin selected vendor to top
    if (selectedVendor) {
      const idx = list.findIndex((v) => v.vendorId === selectedVendor.id);
      if (idx > 0) { const [sel] = list.splice(idx, 1); list = [sel, ...list]; }
    }
    return list;
  }, [vbdRows, vbdSearch, selectedVendor]);

  // Selected vendor stats for VBD summary
  const selectedVendorData = selectedVendor ? vbdRows.find((v) => v.vendorId === selectedVendor.id) : null;
  const svCounts = selectedVendorData?.statusCounts;
  const vendors: Vendor[] = vendorsQ.data?.data?.data ?? [];
  const allVendorsFiltered = vendors.filter((v) =>
    !vendorSearch || v.name.toLowerCase().includes(vendorSearch.toLowerCase()) || v.username.toLowerCase().includes(vendorSearch.toLowerCase()),
  );
  const pagination = vendorsQ.data?.data?.pagination;
  const lastUpdated = new Date();

  return (
    <div>
      {/* ── Page header ── */}
      <div className="phead">
        <div>
          <div className="phead-title">Job Board Dashboard</div>
          <div className="phead-sub" style={{ color: 'var(--tx2)' }}>
            Live data from <span style={{ color: 'var(--tx1)', fontWeight: 700 }}>pros.shs.com</span> — vendor counts, job statuses, completion metrics
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="daterange">
            <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--tx2)', marginRight: '4px' }}>Page</span>
            <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--tx3)' }}>From</span>
            <span className="dr-input" onClick={() => startDateRef.current?.showPicker()} style={{ cursor: 'pointer' }}>
              {format(new Date(startDate + 'T00:00:00'), 'MMM dd, yyyy')}
              <input ref={startDateRef} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </span>
            <svg onClick={() => startDateRef.current?.showPicker()} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--tx3)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, cursor: 'pointer' }}>
              <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--tx3)' }}>To</span>
            <span className="dr-input" onClick={() => endDateRef.current?.showPicker()} style={{ cursor: 'pointer' }}>
              {format(new Date(endDate + 'T00:00:00'), 'MMM dd, yyyy')}
              <input ref={endDateRef} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </span>
            <svg onClick={() => endDateRef.current?.showPicker()} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--tx3)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, cursor: 'pointer' }}>
              <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div className="freshness">
            <span className="freshness-dot" />
            Updated {format(lastUpdated, 'MMM dd, yyyy')} · Snowflake
          </div>
        </div>
      </div>

      {/* ── KPI Strip (7 cards) ── */}
      <div className="kstrip">
        {kpiCards.map((card) => (
          <div
            key={card.key}
            className="kcard"
            style={{ '--kc': card.kc, '--kc-rgb': card.kcRgb } as React.CSSProperties}
          >
            <div className="kcard-bg" />
            <div className="kcard-block" />
            <div className="kcard-body">
              <div className="kcard-top">
                <div className="kcard-label">
                  {card.label}
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '4px', opacity: 0.5, verticalAlign: '-1px' }}>
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                </div>
                <span className="kcard-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={card.kc} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d={card.iconPath} />
                  </svg>
                </span>
              </div>
              <div className="kcard-val" style={{ marginTop: '8px' }}>{card.value}</div>
              <div className="kcard-delta-row">
                {card.delta && (
                  <span className={`kpi-delta ${card.deltaUp ? '' : 'down'}`}>
                    {card.deltaUp ? '↑' : '↓'} {card.delta}
                  </span>
                )}
              </div>
              <div className="kcard-sub">{card.useDateRange === false ? card.sub : dateRangeLabel}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Job Status Trend ── */}
      <div className="card-kairos" style={{ marginBottom: 'var(--sp-4)' }}>
        <div style={{ padding: '0 18px', paddingTop: '16px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 'var(--fs-md)', fontWeight: 600, color: 'var(--tx1)' }}>Job Status Trend</div>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--tx3)', marginTop: '1px' }}>
                {selectedVendor?.name ?? 'All vendors'} · {trendGroupBy}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div className="viewtoggle">
                <button className={`pbtn ${trendView === 'chart' ? 'on' : ''}`} onClick={() => setTrendView('chart')}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width="13" height="13" style={{ verticalAlign: '-2px', marginRight: '3px' }}><polyline points="3 17 9 11 13 15 21 6" /></svg>Trend
                </button>
                <button className={`pbtn ${trendView === 'table' ? 'on' : ''}`} onClick={() => setTrendView('table')}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width="13" height="13" style={{ verticalAlign: '-2px', marginRight: '3px' }}><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" /></svg>Table
                </button>
              </div>
              <button className="ch-action" style={{ fontSize: 'var(--fs-sm)' }}>↓ CSV</button>
            </div>
          </div>

          {/* Filter bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '14px', paddingBottom: '14px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
            {/* Vendor selector — searchable dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="tf-label">VENDOR</span>
              <div ref={vendorDropdownRef} style={{ position: 'relative' }}>
                <button
                  onClick={() => { setVendorDropdownOpen(!vendorDropdownOpen); setVendorDropdownSearch(''); }}
                  style={{ background: 'var(--card-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '5px 28px 5px 10px', fontSize: 'var(--fs-sm)', color: 'var(--tx1)', fontFamily: 'inherit', cursor: 'pointer', minWidth: '160px', textAlign: 'left', position: 'relative', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                >
                  {selectedVendor?.name ?? 'All vendors'}
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)' }}><path d="M1 1l4 4 4-4" stroke="#82889e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                {vendorDropdownOpen && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', boxShadow: 'var(--sh-dropdown)', zIndex: 100, minWidth: '240px', maxHeight: '280px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--app-bg)', borderRadius: 'var(--r-sm)', padding: '4px 8px', border: '1px solid var(--border)' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--tx3)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                        <input
                          autoFocus
                          placeholder="Search vendor..."
                          value={vendorDropdownSearch}
                          onChange={(e) => setVendorDropdownSearch(e.target.value)}
                          style={{ border: 'none', background: 'transparent', outline: 'none', color: 'var(--tx1)', fontSize: 'var(--fs-sm)', fontFamily: 'inherit', width: '100%' }}
                        />
                      </div>
                    </div>
                    <div style={{ overflowY: 'auto', flex: 1 }}>
                      <div
                        style={{ padding: '7px 12px', cursor: 'pointer', fontSize: 'var(--fs-sm)', color: 'var(--tx1)', fontWeight: !selectedVendor ? 600 : 400 }}
                        onMouseDown={() => { setSelectedVendor(null); setVendorDropdownOpen(false); }}
                      >
                        All vendors
                      </div>
                      {vbdRows
                        .filter((v) => !vendorDropdownSearch || v.vendorName.toLowerCase().includes(vendorDropdownSearch.toLowerCase()))
                        .map((v) => (
                          <div
                            key={v.vendorId}
                            style={{
                              padding: '7px 12px',
                              cursor: 'pointer',
                              fontSize: 'var(--fs-sm)',
                              color: 'var(--tx1)',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              background: selectedVendor?.id === v.vendorId ? 'var(--blue-l-bg)' : 'transparent',
                              fontWeight: selectedVendor?.id === v.vendorId ? 600 : 400,
                            }}
                            onMouseDown={() => { setSelectedVendor({ id: v.vendorId, name: v.vendorName }); setVendorDropdownOpen(false); }}
                          >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '8px' }}>{v.vendorName}</span>
                            <span className="font-mono" style={{ fontSize: 'var(--fs-xs)', color: 'var(--tx3)', flexShrink: 0 }}>ID {v.vendorId}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Range */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="tf-label">RANGE</span>
              <div className="ptoggle">
                {(['page', '7d', '30d', '12m', 'custom'] as TrendRange[]).map((r) => (
                  <button key={r} className={`pbtn ${trendRange === r ? 'on' : ''}`} onClick={() => handleRangeChange(r)}>
                    {r === 'page' ? 'Page' : r === '7d' ? '7D' : r === '30d' ? '30D' : r === '12m' ? '12M' : 'Custom'}
                  </button>
                ))}
              </div>
              {trendRange === 'custom' && (
                <div className="daterange" style={{ marginLeft: '4px' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--tx3)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <span className="dr-input" onClick={() => trendFromRef.current?.showPicker()} style={{ cursor: 'pointer' }}>
                    {format(new Date(trendFrom + 'T00:00:00'), 'MMM dd, yyyy')}
                    <input ref={trendFromRef} type="date" value={trendFrom} onChange={(e) => setTrendFrom(e.target.value)} />
                  </span>
                  <span style={{ color: 'var(--tx3)', fontSize: 'var(--fs-sm)' }}>–</span>
                  <span className="dr-input" onClick={() => trendToRef.current?.showPicker()} style={{ cursor: 'pointer' }}>
                    {format(new Date(trendTo + 'T00:00:00'), 'MMM dd, yyyy')}
                    <input ref={trendToRef} type="date" value={trendTo} onChange={(e) => setTrendTo(e.target.value)} />
                  </span>
                </div>
              )}
            </div>

            {/* Group By */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="tf-label">GROUP BY</span>
              <div className="ptoggle">
                {(['day', 'week', 'month'] as TrendGroupBy[]).map((g) => {
                  const enabled = validGrains.includes(g);
                  return (
                    <button
                      key={g}
                      className={`pbtn ${trendGroupBy === g ? 'on' : ''} ${!enabled ? 'is-disabled' : ''}`}
                      disabled={!enabled}
                      title={!enabled ? `Not available for ${trendRange === 'page' ? 'Page' : trendRange === '7d' ? '7D' : trendRange === '30d' ? '30D' : trendRange === '12m' ? '12M' : 'Custom'}` : ''}
                      onClick={() => enabled && setTrendGroupBy(g)}
                    >
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Reset */}
            <button style={{ fontSize: 'var(--fs-sm)', color: 'var(--tx3)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}>Reset</button>
          </div>

          {/* Scope indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 0 2px', fontSize: 'var(--fs-sm)', color: 'var(--tx3)' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--blue)', flexShrink: 0 }} />
            Matching page date · {fmtDate(startDate)} – {fmtDate(endDate)}
          </div>
        </div>

        {/* Chart / Table */}
        <div style={{ padding: '0 18px 16px' }}>
          {trendQ.isLoading ? (
            <div className="h-56 animate-pulse rounded-lg" style={{ background: 'var(--app-bg)' }} />
          ) : !chartData.length ? (
            <div className="flex h-56 items-center justify-center" style={{ color: 'var(--tx3)' }}>No trend data</div>
          ) : trendView === 'chart' ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData} margin={{ top: 14, right: 16, left: 0, bottom: 5 }}>
                  <XAxis dataKey="period" tick={{ fontSize: 10, fill: 'var(--chart-axis)' }} tickFormatter={formatLabel} stroke="transparent" interval={chartData.length > 14 ? Math.floor(chartData.length / 12) : 0} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--chart-axis)' }} stroke="transparent" />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--card)',
                      color: 'var(--tx1)',
                      fontSize: 12,
                      boxShadow: 'var(--sh-dropdown)',
                    }}
                    labelFormatter={formatLabel}
                  />
                  {LINE_SERIES.map(({ key, label, color }) => (
                    <Line key={key} type="monotone" dataKey={key} name={label} stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
              <div className="clegend">
                {LINE_SERIES.map(({ label, color }) => (
                  <span key={label} className="cl-item">
                    <span className="cl-dot" style={{ background: color }} />{label}
                  </span>
                ))}
              </div>
            </>
          ) : (
            /* Table view */
            <div className="card-scroll-wrap" style={{ maxHeight: '360px', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Date</th>
                    {LINE_SERIES.map((s) => (
                      <th key={s.key} style={{ textAlign: 'right' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', justifyContent: 'flex-end' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color, flexShrink: 0 }} />{s.label}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((d) => (
                    <tr key={d.period as string}>
                      <td className="font-mono" style={{ fontWeight: 600 }}>{formatLabel(d.period as string)}</td>
                      {LINE_SERIES.map((s) => (
                        <td key={s.key} className="font-mono" style={{ textAlign: 'right', color: s.color, fontWeight: 600 }}>
                          {(d[s.key] as number).toLocaleString()}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Vendor Job Breakdown ── */}
      <div className="card-kairos" style={{ marginBottom: 'var(--sp-4)' }}>
        <div style={{ padding: '16px 18px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 'var(--fs-md)', fontWeight: 600, color: 'var(--tx1)' }}>Vendor Job Breakdown</div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--tx3)', marginTop: '2px' }}>
              {selectedVendor?.name ? `Highlighting ${selectedVendor.name} · ` : ''}{fmtDate(startDate)} – {fmtDate(endDate)}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="card-search">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--tx3)' }}>
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                placeholder="Search vendor…"
                value={vbdSearch}
                onChange={(e) => { setVbdSearch(e.target.value); setVbdPage(1); }}
                style={{ border: 'none', background: 'transparent', outline: 'none', color: 'var(--tx1)', fontSize: 'var(--fs-sm)', fontFamily: 'inherit', width: '120px' }}
              />
            </div>
            <button className="ch-action" style={{ fontSize: 'var(--fs-sm)' }}>↓ CSV</button>
          </div>
        </div>

        {/* Summary bar */}
        {filteredByVendor.length > 0 && (
          <div className="vbd-summary">
            <div className="vbd-stat">
              <div className="vbd-stat-l">Vendors</div>
              <div className="vbd-stat-v">{selectedVendor ? 1 : fmt(vbdTotals?.totalVendors)}</div>
            </div>
            <div className="vbd-stat">
              <div className="vbd-stat-l">Claimed</div>
              <div className="vbd-stat-v" style={{ color: '#5484d1' }}>{fmt(svCounts ? svCounts.JOB_CLAIMED : vbdTotals?.JOB_CLAIMED)}</div>
            </div>
            <div className="vbd-stat">
              <div className="vbd-stat-l">Completed</div>
              <div className="vbd-stat-v" style={{ color: 'var(--green)' }}>{fmt(svCounts ? svCounts.JOB_COMPLETED : vbdTotals?.JOB_COMPLETED)}</div>
            </div>
            <div className="vbd-stat">
              <div className="vbd-stat-l">Rescheduled</div>
              <div className="vbd-stat-v" style={{ color: '#D95459' }}>{fmt(svCounts ? svCounts.JOB_RESCHEDULED : vbdTotals?.JOB_RESCHEDULED)}</div>
            </div>
            <div className="vbd-stat">
              <div className="vbd-stat-l">Part Orders</div>
              <div className="vbd-stat-v" style={{ color: '#8b61ae' }}>{fmt(svCounts ? svCounts.PART_ORDER_SUBMITTED : vbdTotals?.PART_ORDER_SUBMITTED)}</div>
            </div>
            <div className="vbd-stat">
              <div className="vbd-stat-l">First Time Fix</div>
              <div className="vbd-stat-v">{fmt(svCounts ? svCounts.FIRST_TIME_FIX : vbdTotals?.FIRST_TIME_FIX)}</div>
            </div>
          </div>
        )}

        <div className="card-scroll-wrap" style={{ maxHeight: '420px' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: '28px' }}>#</th>
                <th>Vendor</th>
                <th style={{ textAlign: 'right', width: '90px' }}>Claimed</th>
                <th style={{ textAlign: 'right', width: '100px' }}>Completed</th>
                <th style={{ textAlign: 'right', width: '108px' }}>Rescheduled</th>
                <th style={{ textAlign: 'right', width: '108px' }}>Part Orders</th>
                <th style={{ textAlign: 'right', width: '112px' }}>First Time Fix</th>
              </tr>
            </thead>
            <tbody>
              {vbdQ.isLoading ? (
                <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--tx3)' }}>Loading...</td></tr>
              ) : filteredByVendor.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '40px 24px', textAlign: 'center' }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--tx3)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 12px', display: 'block', opacity: 0.35 }}>
                      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <p style={{ fontSize: 'var(--fs-md)', color: 'var(--tx2)', fontWeight: 500, marginBottom: '4px' }}>No results found</p>
                    <p style={{ fontSize: 'var(--fs-base)', color: 'var(--tx3)' }}>Try a different search or widen the date window</p>
                  </td></tr>
              ) : (
                filteredByVendor.slice((vbdPage - 1) * 20, vbdPage * 20).map((v, i) => {
                  const s = v.statusCounts;
                  const isHighlighted = selectedVendor?.id === v.vendorId;
                  const selTdStyle = isHighlighted ? { background: 'var(--blue-l-bg)', boxShadow: 'inset 3px 0 0 var(--blue)' } : {};
                  const rank = (vbdPage - 1) * 20 + i + 1;
                  return (
                    <tr
                      key={v.vendorId}
                      onClick={() => setSelectedVendor({ id: v.vendorId, name: v.vendorName })}
                      style={{ cursor: 'pointer' }}
                    >
                      <td className="font-mono" style={{ ...selTdStyle, color: isHighlighted ? 'var(--blue)' : 'var(--tx3)', fontSize: 'var(--fs-xs)', fontWeight: isHighlighted ? 700 : undefined }}>{isHighlighted ? '▸' : rank}</td>
                      <td style={selTdStyle}>
                        <div style={{ fontSize: 'var(--fs-base)', fontWeight: isHighlighted ? 600 : 500, color: isHighlighted ? 'var(--blue)' : 'var(--tx1)', lineHeight: 'var(--lh-tight)' }}>{v.vendorName}</div>
                        <div className="font-mono" style={{ fontSize: 'var(--fs-xs)', color: 'var(--tx3)', marginTop: '2px' }}>ID: {v.vendorId}</div>
                      </td>
                      <td className="font-mono" style={{ ...selTdStyle, textAlign: 'right', color: '#5484d1', fontWeight: 600 }}>{s.JOB_CLAIMED.toLocaleString()}</td>
                      <td className="font-mono" style={{ ...selTdStyle, textAlign: 'right', color: 'var(--green)', fontWeight: 600 }}>{s.JOB_COMPLETED.toLocaleString()}</td>
                      <td className="font-mono" style={{ ...selTdStyle, textAlign: 'right', color: '#D95459', fontWeight: 600 }}>{s.JOB_RESCHEDULED.toLocaleString()}</td>
                      <td className="font-mono" style={{ ...selTdStyle, textAlign: 'right', color: '#8b61ae', fontWeight: 600 }}>{s.PART_ORDER_SUBMITTED.toLocaleString()}</td>
                      <td className="font-mono" style={{ ...selTdStyle, textAlign: 'right', color: 'var(--tx1)', fontWeight: 600 }}>{s.FIRST_TIME_FIX.toLocaleString()}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredByVendor.length > 0 && (() => {
          const totalPages = Math.ceil(filteredByVendor.length / 20);
          const from = (vbdPage - 1) * 20 + 1;
          const to = Math.min(vbdPage * 20, filteredByVendor.length);
          const pages: number[] = [];
          [1, 2, vbdPage - 1, vbdPage, vbdPage + 1, totalPages - 1, totalPages].forEach((n) => {
            if (n >= 1 && n <= totalPages && !pages.includes(n)) pages.push(n);
          });
          pages.sort((a, b) => a - b);
          return (
            <div className="pgbar">
              <span style={{ color: 'var(--tx3)', fontSize: 'var(--fs-sm)' }}>
                Showing <strong style={{ color: 'var(--tx1)' }}>{from}–{to}</strong> of <strong style={{ color: 'var(--tx1)' }}>{filteredByVendor.length}</strong> vendors
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button className="pgbtn" disabled={vbdPage <= 1} onClick={() => setVbdPage(vbdPage - 1)}>‹ Prev</button>
                {pages.map((n, idx) => (
                  <span key={n}>
                    {idx > 0 && n - pages[idx - 1] > 1 && <span style={{ color: 'var(--tx3)', padding: '0 2px' }}>…</span>}
                    <button className={`pgbtn ${n === vbdPage ? 'on' : ''}`} onClick={() => setVbdPage(n)}>{n}</button>
                  </span>
                ))}
                <button className="pgbtn" disabled={vbdPage >= totalPages} onClick={() => setVbdPage(vbdPage + 1)}>Next ›</button>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ── Vendors section label ── */}
      <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 'var(--ls-wider)', color: 'var(--tx3)', marginBottom: '8px' }}>Vendors</div>

      {/* ── All Vendors ── */}
      <div className="card-kairos" style={{ marginBottom: 'var(--sp-4)' }}>
        <div style={{ padding: '16px 18px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize: 'var(--fs-md)', fontWeight: 600, color: 'var(--tx1)' }}>All Vendors</div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--tx3)', marginTop: '2px' }}>{pagination ? `${pagination.total.toLocaleString()} total` : '—'}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="card-search">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--tx3)' }}>
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                placeholder="Search…"
                value={vendorSearch}
                onChange={(e) => setVendorSearch(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', color: 'var(--tx1)', fontSize: 'var(--fs-sm)', fontFamily: 'inherit', width: '120px' }}
              />
            </div>
            <button className="ch-action" style={{ fontSize: 'var(--fs-sm)' }}>↓ CSV</button>
          </div>
        </div>
        <div className="card-scroll-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: '36px' }}>ID</th>
                <th>Name</th>
                <th>Username</th>
                <th>Last Login</th>
              </tr>
            </thead>
            <tbody>
              {vendorsQ.isLoading ? (
                <tr><td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: 'var(--tx3)' }}>Loading...</td></tr>
              ) : allVendorsFiltered.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: '40px 24px', textAlign: 'center' }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--tx3)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 12px', display: 'block', opacity: 0.35 }}>
                      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <p style={{ fontSize: 'var(--fs-md)', color: 'var(--tx2)', fontWeight: 500, marginBottom: '4px' }}>No results found</p>
                    <p style={{ fontSize: 'var(--fs-base)', color: 'var(--tx3)' }}>Try a different search</p>
                  </td></tr>
              ) : (
                allVendorsFiltered.map((v) => (
                  <tr key={v.id} onClick={() => setSelectedVendor({ id: v.id, name: v.name })}>
                    <td className="font-mono" style={{ color: 'var(--tx3)' }}>{v.id}</td>
                    <td style={{ fontSize: 'var(--fs-base)', fontWeight: 500, color: 'var(--tx1)' }}>{v.name.length > 28 ? v.name.slice(0, 28) + '…' : v.name}</td>
                    <td className="font-mono" style={{ fontSize: 'var(--fs-sm)', color: 'var(--tx2)' }}>{v.username}</td>
                    <td style={{ fontSize: 'var(--fs-sm)', color: v.lastLoginAt ? 'var(--tx1)' : 'var(--tx3)' }}>
                      {v.lastLoginAt ? format(new Date(v.lastLoginAt), 'MMM dd, yyyy') : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {pagination && pagination.totalPages > 1 && (
          <div className="pgbar">
            <span style={{ color: 'var(--tx3)' }}>
              Showing <strong style={{ color: 'var(--tx1)' }}>1–{vendors.length}</strong> of <strong style={{ color: 'var(--tx1)' }}>{pagination.total.toLocaleString()}</strong> vendors
            </span>
            <div style={{ flex: 1 }} />
            <button className="pgbtn" disabled={pagination.page <= 1} onClick={() => setVendorPage(pagination.page - 1)}>‹ Prev</button>
            <button className="pgbtn on">{pagination.page}</button>
            {pagination.page + 1 <= pagination.totalPages && <button className="pgbtn" onClick={() => setVendorPage(pagination.page + 1)}>{pagination.page + 1}</button>}
            {pagination.page + 2 <= pagination.totalPages && <button className="pgbtn" onClick={() => setVendorPage(pagination.page + 2)}>{pagination.page + 2}</button>}
            {pagination.totalPages > pagination.page + 2 && <span style={{ padding: '0 6px', color: 'var(--tx3)' }}>…</span>}
            {pagination.totalPages > pagination.page + 2 && <button className="pgbtn" onClick={() => setVendorPage(pagination.totalPages)}>{pagination.totalPages}</button>}
            <button className="pgbtn" disabled={pagination.page >= pagination.totalPages} onClick={() => setVendorPage(pagination.page + 1)}>Next ›</button>
          </div>
        )}
      </div>

      {/* ── Critical Alert ── */}
      {sc && (
        <div className="alert-banner red">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <div>
            <div style={{ fontSize: 'var(--fs-base)', fontWeight: 600, color: 'var(--tx1)' }}>
              {fmt(unclaimed)} jobs unclaimed · {fmt(sc.PART_ORDER_SUBMITTED)} blocked on parts
            </div>
            <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--tx3)', marginTop: '2px' }}>
              Review vendor assignments and part order pipeline
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
