import { useState, useMemo, useRef, useEffect, useCallback, Fragment } from 'react';
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
  fetchVendors,
  fetchCompletedJobs,
  fetchVendorStatusRange,
  fetchAllVendorStatusRange,
  fetchOrderTiming,
  fetchGeoHierarchy,
} from '../../services/dashboardApi';
import type {
  CompletedVendor,
  VendorStatusRow,
  Vendor,
  GeoHierarchyDistrict,
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
  tooltip?: string;
};

// ─── Trend Chart Config ──────────────────────────────────────────────
const LINE_SERIES = [
  { key: 'JOB_COMPLETED', label: 'Completed', color: '#67BD6D' },
  { key: 'JOB_CLAIMED', label: 'Claimed', color: '#5484d1' },
  { key: 'JOB_IN_PROGRESS', label: 'In Progress', color: '#d57033' },
  { key: 'JOB_RESCHEDULED', label: 'Rescheduled', color: '#D95459' },
];

type TrendRange = 'page' | '7d' | '30d' | '12m' | 'custom';
type TrendView = 'chart' | 'table';
type TrendGroupBy = 'day' | 'week' | 'month';
type DatePreset = 'today' | 'wtd' | 'mtd' | 'last-week' | 'last-month' | 'qtd' | 'custom';

const DATE_PRESET_LABELS: Record<DatePreset, string> = {
  today: 'Today',
  wtd: 'Week to Date',
  mtd: 'Month to Date',
  'last-week': 'Last Week',
  'last-month': 'Last Month',
  qtd: 'Quarter to Date',
  custom: 'Custom Range',
};

// ─── Fmt helper ──────────────────────────────────────────────────────
const fmt = (n: number | undefined) => n?.toLocaleString() ?? '—';

// ─── Main Component ──────────────────────────────────────────────────
export function OverviewPage({ onNavigate, initialStartDate, initialEndDate }: { onNavigate?: (page: string) => void; initialStartDate?: string; initialEndDate?: string }) {
  const [startDate, setStartDate] = useState(() => {
    if (initialStartDate) return initialStartDate;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    if (initialEndDate) return initialEndDate;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [dateMode, setDateMode] = useState<'month' | 'custom'>('month');
  const [datePreset, setDatePreset] = useState<DatePreset>(() => {
    if (initialStartDate || initialEndDate) return 'custom';
    return 'mtd';
  });
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
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [selectedPlanningArea, setSelectedPlanningArea] = useState<string>('');
  const [appliedDistrict, setAppliedDistrict] = useState<string>('');
  const [appliedPlanningArea, setAppliedPlanningArea] = useState<string>('');
  const vendorDropdownRef = useRef<HTMLDivElement>(null);
  const startDateRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);
  const trendFromRef = useRef<HTMLInputElement>(null);
  const trendToRef = useRef<HTMLInputElement>(null);

  // Sync dates from settings
  useEffect(() => {
    if (initialStartDate) setStartDate(initialStartDate);
    if (initialEndDate) setEndDate(initialEndDate);
  }, [initialStartDate, initialEndDate]);

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

  const geoParams = useMemo(() => ({
    ...(appliedDistrict ? { district: appliedDistrict } : {}),
    ...(appliedPlanningArea ? { planningArea: appliedPlanningArea } : {}),
  }), [appliedDistrict, appliedPlanningArea]);

  const dateParams = { startDate, endDate, ...geoParams };
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

  const completedQ = useQuery({
    queryKey: ['dash-completed', startDate, endDate, appliedDistrict, appliedPlanningArea],
    queryFn: () => fetchCompletedJobs(dateParams),
    staleTime: 60000,
  });

  const vendorsQ = useQuery({
    queryKey: ['dash-vendors-all'],
    queryFn: () => fetchVendors(1, 500),
    staleTime: 120000,
  });

  const allVendorsForDropdownQ = useQuery({
    queryKey: ['dash-vbd-all', startDate, endDate, appliedDistrict, appliedPlanningArea],
    queryFn: () => fetchAllVendorStatusRange({ startDate, endDate, ...geoParams }),
    staleTime: 120000,
  });

  const vbdQ = useQuery({
    queryKey: ['dash-vbd', startDate, endDate, vbdPage, vbdSearch, appliedDistrict, appliedPlanningArea],
    queryFn: () => fetchVendorStatusRange({ startDate, endDate, page: vbdPage, limit: 20, search: vbdSearch || undefined, ...geoParams }),
    staleTime: 60000,
  });

  const orderTimingQ = useQuery({
    queryKey: ['dash-order-timing', appliedDistrict, appliedPlanningArea],
    queryFn: () => fetchOrderTiming(geoParams),
    staleTime: 60000,
  });

  const geoQ = useQuery({
    queryKey: ['dash-geo-hierarchy'],
    queryFn: fetchGeoHierarchy,
    staleTime: Infinity,
  });

  // ── Geo hierarchy derived ──
  const geoDistricts: GeoHierarchyDistrict[] = geoQ.data?.data?.districts ?? [];
  const availablePlanningAreas = useMemo(() => {
    if (!selectedDistrict) return geoDistricts.flatMap((d) => d.planningAreas);
    return geoDistricts.find((d) => d.districtName === selectedDistrict)?.planningAreas ?? [];
  }, [geoDistricts, selectedDistrict]);

  const handleApplyFilters = () => {
    setAppliedDistrict(selectedDistrict);
    setAppliedPlanningArea(selectedPlanningArea);
    setVbdPage(1);
  };

  const toDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const applyPreset = useCallback((preset: DatePreset) => {
    const now = new Date();
    const today = toDateStr(now);
    setDatePreset(preset);
    if (preset === 'today') {
      setStartDate(today); setEndDate(today);
    } else if (preset === 'wtd') {
      const dow = now.getDay(); const diff = dow === 0 ? 6 : dow - 1;
      const mon = new Date(now); mon.setDate(now.getDate() - diff);
      setStartDate(toDateStr(mon)); setEndDate(today);
    } else if (preset === 'mtd') {
      setStartDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`);
      setEndDate(today);
    } else if (preset === 'last-week') {
      const dow = now.getDay(); const diff = dow === 0 ? 6 : dow - 1;
      const lastMon = new Date(now); lastMon.setDate(now.getDate() - diff - 7);
      const lastSun = new Date(lastMon); lastSun.setDate(lastMon.getDate() + 6);
      setStartDate(toDateStr(lastMon)); setEndDate(toDateStr(lastSun));
    } else if (preset === 'last-month') {
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lmEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      setStartDate(toDateStr(lm)); setEndDate(toDateStr(lmEnd));
    } else if (preset === 'qtd') {
      const q = Math.floor(now.getMonth() / 3);
      const qStart = new Date(now.getFullYear(), q * 3, 1);
      setStartDate(toDateStr(qStart)); setEndDate(today);
    }
  }, []);

  const handleResetFilters = () => {
    setSelectedDistrict('');
    setSelectedPlanningArea('');
    setAppliedDistrict('');
    setAppliedPlanningArea('');
    setSelectedVendor(null);
    setVbdPage(1);
  };

  const isFiltered = !!(appliedDistrict || appliedPlanningArea);

  // ── Derived ──
  const sc = vbdQ.data?.data?.totals;
  const otData = orderTimingQ.data?.data;
  const vbdTotals = vbdQ.data?.data?.totals;

  // Demand Funnel metrics (mapped to API fields: JOBS_OFFERED, CLAIM_RATE, JOBS_UNCLAIMED, JOBS_CLAIMED, JOBS_COMPLETED)
  const jobsOffered = sc?.JOBS_OFFERED ?? 0;
  const claimRate = sc?.JOBS_OFFERED
    ? Number(((sc.JOBS_CLAIMED ?? 0) / sc.JOBS_OFFERED * 100).toFixed(1))
    : 0;
  const jobsUnclaimed = sc?.JOBS_UNCLAIMED ?? 0;
  const jobsClaimed = sc?.JOBS_CLAIMED ?? sc?.JOB_CLAIMED ?? 0;
  const jobsCompleted = sc?.JOBS_COMPLETED ?? sc?.JOB_COMPLETED ?? 0;

  // Funnel stages with drop-off
  const funnelStages = useMemo(() => {
    const offered = jobsOffered || jobsClaimed + jobsUnclaimed;
    const claimed = jobsClaimed;
    const completed = jobsCompleted;
    return [
      { label: 'OFFERED', value: offered, color: '#5484d1', bg: '#335855' },
      { label: 'CLAIMED', value: claimed, color: '#33bde0', bg: '#3F3B1D', drop: offered > 0 ? -Math.round(((offered - claimed) / offered) * 100) : 0 },
      { label: 'COMPLETED', value: completed, color: '#67bd6d', bg: '#284F35', drop: claimed > 0 ? -Math.round(((claimed - completed) / claimed) * 100) : 0 },
    ];
  }, [jobsOffered, jobsClaimed, jobsUnclaimed, jobsCompleted]);

  // ── Chart data ──
  const rawChartData = useMemo<Record<string, string | number>[]>(() => [], []);

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

  // ── CSV download helper ──
  const downloadCsv = useCallback((filename: string, header: string, rows: string[]) => {
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const exportTrendCsv = useCallback(() => {
    if (!chartData.length) return;
    const header = ['Date', ...LINE_SERIES.map((s) => s.label)].join(',');
    const rows = chartData.map((d) =>
      [formatLabel(d.period as string), ...LINE_SERIES.map((s) => d[s.key])].join(','),
    );
    downloadCsv(`kairos-trend_${format(new Date(), 'yyyy-MM-dd')}.csv`, header, rows);
  }, [chartData, downloadCsv]);

  // ── Vendor tables (from new range API) ──
  const vbdRows: VendorStatusRow[] = vbdQ.data?.data?.data ?? [];
  const vbdPagination = vbdQ.data?.data?.pagination;
  const completedByVendor: CompletedVendor[] = completedQ.data?.data?.byVendor ?? [];
  const allDropdownVendors: VendorStatusRow[] = allVendorsForDropdownQ.data ?? [];

  const exportVbdCsv = useCallback(() => {
    if (!allDropdownVendors.length) return;
    const header = 'Vendor,ID,Completed,Claimed,Rescheduled,Parts Ordered,First Time Fix';
    const rows = allDropdownVendors.map((v) => {
      const s = v.statusCounts;
      return [`"${v.vendorName}"`, v.vendorId, s.JOBS_COMPLETED ?? s.JOB_COMPLETED ?? 0, s.JOBS_CLAIMED ?? s.JOB_CLAIMED ?? 0, s.JOBS_RESCHEDULED ?? s.JOB_RESCHEDULED ?? 0, s.PARTS_ORDERED ?? s.PART_ORDER_SUBMITTED ?? 0, s.FIRST_TIME_FIX ?? 0].join(',');
    });
    downloadCsv(`kairos-vendor-breakdown_${format(new Date(), 'yyyy-MM-dd')}.csv`, header, rows);
  }, [allDropdownVendors, downloadCsv]);

  const exportVendorsCsv = useCallback(() => {
    const v = vendorsQ.data?.data?.data;
    if (!v?.length) return;
    const header = 'ID,Name,Username,Last Login';
    const rows = v.map((vendor) =>
      [vendor.id, `"${vendor.name}"`, vendor.username, vendor.lastLoginAt ? format(new Date(vendor.lastLoginAt), 'MMM dd, yyyy') : ''].join(','),
    );
    downloadCsv(`kairos-vendors_${format(new Date(), 'yyyy-MM-dd')}.csv`, header, rows);
  }, [vendorsQ.data, downloadCsv]);

  const isSearching = !!vbdSearch.trim();
  const filteredByVendor = useMemo(() => {
    // When searching, filter ALL vendors client-side (allDropdownVendors has up to 5000)
    // When not searching, use paginated API response
    let list = isSearching
      ? allDropdownVendors.filter((v) =>
          v.vendorName.toLowerCase().includes(vbdSearch.toLowerCase()) ||
          String(v.vendorId).includes(vbdSearch),
        )
      : [...vbdRows];
    // Pin selected vendor to top
    if (selectedVendor) {
      const idx = list.findIndex((v) => v.vendorId === selectedVendor.id);
      if (idx > 0) { const [sel] = list.splice(idx, 1); list = [sel, ...list]; }
    }
    return list;
  }, [vbdRows, allDropdownVendors, vbdSearch, isSearching, selectedVendor]);

  // Selected vendor stats for VBD summary
  const selectedVendorData = selectedVendor ? vbdRows.find((v) => v.vendorId === selectedVendor.id) : null;
  const svCounts = selectedVendorData?.statusCounts;
  const vendors: Vendor[] = vendorsQ.data?.data?.data ?? [];
  const allVendorsSorted = useMemo(() =>
    [...vendors].sort((a, b) => {
      const dateA = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
      const dateB = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
      return dateB - dateA;
    }),
  [vendors]);
  const allVendorsFiltered = allVendorsSorted.filter((v) =>
    !vendorSearch || v.name.toLowerCase().includes(vendorSearch.toLowerCase()) || v.username.toLowerCase().includes(vendorSearch.toLowerCase()),
  );
  const vendorTotalPages = Math.ceil(allVendorsFiltered.length / 20);
  const vendorsPageSlice = allVendorsFiltered.slice((vendorPage - 1) * 20, vendorPage * 20);
  const lastUpdated = new Date();

  return (
    <div>
      {/* ── Page header ── */}
      <div className="phead">
        <div>
          <div className="phead-title">1099 Job Board — Operations Dashboard</div>
          <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--tx3)', marginTop: '4px', lineHeight: '1.4' }}>Tracks overflow demand offered to contracted 1099 providers, how much of it the network absorbs, and how well it's executed — end to end from offer to completion.</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="freshness">
            <span className="freshness-dot" />
            Updated {format(lastUpdated, 'MMM dd, yyyy')}
          </div>
        </div>
      </div>

      {/* ── Filter Card ── */}
      <div className="card-kairos" style={{ padding: '16px 18px', marginBottom: '16px' }}>

        {/* Row 1: Geo filters + Reset */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          {/* District */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>District</span>
            <select
              value={selectedDistrict}
              onChange={(e) => { setSelectedDistrict(e.target.value); setSelectedPlanningArea(''); }}
              style={{ background: 'var(--card-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '5px 28px 5px 10px', fontSize: 'var(--fs-sm)', color: selectedDistrict ? 'var(--tx1)' : 'var(--tx3)', fontFamily: 'inherit', cursor: 'pointer', minWidth: '180px', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
            >
              <option value="">All Districts</option>
              {geoDistricts.map((d) => (
                <option key={d.districtName} value={d.districtName}>{d.districtName}</option>
              ))}
            </select>
          </div>

          {/* Planning Area */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>Planning Area</span>
            <select
              value={selectedPlanningArea}
              onChange={(e) => setSelectedPlanningArea(e.target.value)}
              disabled={availablePlanningAreas.length === 0}
              style={{ background: 'var(--card-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '5px 28px 5px 10px', fontSize: 'var(--fs-sm)', color: selectedPlanningArea ? 'var(--tx1)' : 'var(--tx3)', fontFamily: 'inherit', cursor: 'pointer', minWidth: '180px', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', opacity: availablePlanningAreas.length === 0 ? 0.4 : 1 }}
            >
              <option value="">All Planning Areas</option>
              {availablePlanningAreas.map((pa) => (
                <option key={pa.planningAreaName} value={pa.planningAreaName}>{pa.planningAreaName}</option>
              ))}
            </select>
          </div>

          {/* Reset */}
          <button
            onClick={handleResetFilters}
            style={{ marginLeft: 'auto', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '6px 16px', fontSize: 'var(--fs-sm)', color: 'var(--tx2)', fontFamily: 'inherit', cursor: 'pointer' }}
          >Reset</button>
        </div>

        {/* Row 2: Apply Filters */}
        <div style={{ marginTop: '12px' }}>
          <button
            onClick={handleApplyFilters}
            style={{ background: '#35d4c7', border: 'none', borderRadius: 'var(--r-sm)', padding: '7px 20px', fontSize: 'var(--fs-sm)', color: '#0d1117', fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}
          >Apply Filters</button>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'var(--border)', margin: '14px 0' }} />

        {/* Row 3: Date Range presets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginRight: '4px' }}>Date Range</span>
          {(['today', 'wtd', 'mtd', 'last-week', 'last-month', 'qtd', 'custom'] as DatePreset[]).map((preset) => (
            <button
              key={preset}
              onClick={() => applyPreset(preset)}
              style={{
                background: datePreset === preset ? 'transparent' : 'transparent',
                border: datePreset === preset ? '1.5px solid #35d4c7' : '1px solid var(--border)',
                borderRadius: '20px',
                padding: '5px 14px',
                fontSize: 'var(--fs-sm)',
                color: datePreset === preset ? '#35d4c7' : 'var(--tx2)',
                fontFamily: 'inherit',
                cursor: 'pointer',
                fontWeight: datePreset === preset ? 600 : 400,
                whiteSpace: 'nowrap',
              }}
            >{DATE_PRESET_LABELS[preset]}</button>
          ))}
        </div>

        {/* Custom date pickers */}
        {datePreset === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--tx3)' }}>From</span>
            <span className="dr-input" onClick={() => startDateRef.current?.showPicker()} style={{ cursor: 'pointer' }}>
              {format(new Date(startDate + 'T00:00:00'), 'MMM dd, yyyy')}
              <input ref={startDateRef} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </span>
            <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--tx3)' }}>To</span>
            <span className="dr-input" onClick={() => endDateRef.current?.showPicker()} style={{ cursor: 'pointer' }}>
              {format(new Date(endDate + 'T00:00:00'), 'MMM dd, yyyy')}
              <input ref={endDateRef} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </span>
          </div>
        )}

        {/* Row 4: Showing label */}
        <div style={{ marginTop: '10px', fontSize: 'var(--fs-xs)', color: 'var(--tx3)' }}>
          Showing <strong style={{ color: 'var(--tx2)' }}>{DATE_PRESET_LABELS[datePreset]}</strong> · {fmtDate(startDate)} – {fmtDate(endDate)}
        </div>
      </div>

      {/* ── 01 Demand Funnel ── */}
      <div style={{ marginBottom: 'var(--sp-4)' }}>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--tx3)', marginBottom: '4px' }}>01</div>
        <div style={{ fontSize: 'var(--fs-md)', fontWeight: 700, color: 'var(--tx1)', marginBottom: '12px' }}>Demand Funnel</div>

        {/* KPI Cards Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '12px' }}>
          {/* Jobs Offered */}
          <div className="card-kairos" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>JOBS OFFERED</div>
              <span style={{ background: 'rgba(84,132,209,0.15)', borderRadius: '6px', padding: '4px', display: 'flex' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5484d1" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
              </span>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--tx1)', marginTop: '8px' }}>{fmt(jobsOffered || (jobsClaimed + jobsUnclaimed) || undefined)}</div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--tx3)', marginTop: '4px' }}>Total service jobs offered to the 1099 network · {dateRangeLabel}</div>
          </div>

          {/* Claim Rate */}
          <div className="card-kairos" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>CLAIM RATE</div>
              <span style={{ background: 'rgba(236,72,153,0.15)', borderRadius: '6px', padding: '4px', display: 'flex' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
              </span>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#ec4899', marginTop: '8px' }}>{claimRate ? `${claimRate}%` : '—'}</div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--tx3)', marginTop: '4px' }}>Percentage of offered jobs claimed by technicians</div>
          </div>

          {/* Unclaimed */}
          <div className="card-kairos" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>UNCLAIMED</div>
              <span style={{ background: 'rgba(99,102,241,0.15)', borderRadius: '6px', padding: '4px', display: 'flex' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="9" x2="15" y2="15" /><line x1="15" y1="9" x2="9" y2="15" /></svg>
              </span>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--tx1)', marginTop: '8px' }}>{fmt(jobsUnclaimed || undefined)}</div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--tx3)', marginTop: '4px' }}>Jobs never claimed by technicians</div>
          </div>

        </div>

        {/* Funnel Visualization — Horizontal Bars */}
        <div className="card-kairos" style={{ padding: '18px 24px' }}>
          <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--tx1)', marginBottom: '4px' }}>Offer → Completion Drop-off</div>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--tx3)', marginBottom: '24px' }}>Where jobs are lost in the pipeline, by stage</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', height: '180px', gap: '0' }}>
            {funnelStages.map((stage, i) => {
              const maxVal = Math.max(...funnelStages.map(s => s.value), 1);
              const heightPct = Math.max(Math.round((stage.value / maxVal) * 100), 20);
              return (
                <Fragment key={stage.label}>
                  {/* Drop-off connector */}
                  {i > 0 && 'drop' in stage && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', minWidth: '52px', padding: '0 2px', paddingBottom: '8px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--tx3)', marginBottom: '2px' }}>→</span>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#f87171' }}>{stage.drop}%</span>
                    </div>
                  )}
                  {/* Bar + label column */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                    {/* Value above bar */}
                    <div style={{ fontSize: '19px', fontWeight: 600, color: 'var(--tx1)', fontFamily: 'var(--font-mono, monospace)', marginBottom: '6px' }}>{stage.value.toLocaleString()}</div>
                    {/* Bar */}
                    <div style={{
                      width: '100%',
                      height: `${heightPct}%`,
                      borderRadius: '8px 8px 0 0',
                      background: stage.bg,
                      border: `1px solid ${stage.color}30`,
                      borderBottom: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.8px', color: stage.color, opacity: 0.85 }}>{stage.label}</div>
                    </div>
                  </div>
                </Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 02 Execution & Quality ── */}
      <div style={{ marginBottom: 'var(--sp-4)' }}>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--tx3)', marginBottom: '4px' }}>02</div>
        <div style={{ fontSize: 'var(--fs-md)', fontWeight: 700, color: 'var(--tx1)', marginBottom: '12px' }}>Execution &amp; Quality</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {/* In Progress */}
          <div className="card-kairos" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>IN PROGRESS</div>
              <span style={{ background: 'rgba(251,191,36,0.12)', borderRadius: '6px', padding: '4px', display: 'flex' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10" /></svg>
              </span>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#fbbf24', marginTop: '8px' }}>{fmt(sc?.JOBS_INPROGRESS ?? sc?.JOB_IN_PROGRESS)}</div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--tx3)', marginTop: '4px' }}>Claimed jobs where work has started but is not yet completed</div>
          </div>

          {/* First Time Fix */}
          <div className="card-kairos" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>FIRST TIME FIX</div>
              <span style={{ background: 'rgba(53,212,199,0.12)', borderRadius: '6px', padding: '4px', display: 'flex' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#35d4c7" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
              </span>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#35d4c7', marginTop: '8px' }}>{fmt(sc?.FIRST_TIME_FIX)}</div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--tx3)', marginTop: '4px' }}>Completed jobs resolved in the first visit without rescheduling</div>
          </div>

          {/* Completed */}
          <div className="card-kairos" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>COMPLETED</div>
              <span style={{ background: 'rgba(74,222,128,0.12)', borderRadius: '6px', padding: '4px', display: 'flex' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" /></svg>
              </span>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#4ade80', marginTop: '8px' }}>{fmt(sc?.JOBS_COMPLETED ?? sc?.JOB_COMPLETED)}</div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--tx3)', marginTop: '4px' }}>Service jobs successfully completed by technicians</div>
          </div>

          {/* Rescheduled */}
          <div className="card-kairos" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>RESCHEDULED</div>
              <span style={{ background: 'rgba(248,113,113,0.12)', borderRadius: '6px', padding: '4px', display: 'flex' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </span>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#f87171', marginTop: '8px' }}>{fmt(sc?.JOBS_RESCHEDULED ?? sc?.JOB_RESCHEDULED)}</div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--tx3)', marginTop: '4px' }}>Jobs moved to a different appointment date after being assigned</div>
          </div>

        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '12px' }}>
          {/* Parts Ordered */}
          <div className="card-kairos" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>PARTS ORDERED</div>
              <span style={{ background: 'rgba(139,92,246,0.12)', borderRadius: '6px', padding: '4px', display: 'flex' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" /><path d="M16 3H8L4 7h16l-4-4z" /></svg>
              </span>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#a78bfa', marginTop: '8px' }}>{fmt(sc?.PARTS_ORDERED)}</div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--tx3)', marginTop: '4px' }}>Across {fmt(jobsCompleted)} completed jobs this window</div>
          </div>

          {/* Avg Age of Open Orders */}
          <div className="card-kairos" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>AVG AGE OF OPEN ORDERS</div>
              <span style={{ background: 'rgba(251,191,36,0.12)', borderRadius: '6px', padding: '4px', display: 'flex' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
              </span>
            </div>
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span style={{ fontSize: '28px', fontWeight: 700, color: '#35d4c7' }}>{otData ? otData.AGE_ON_OPEN_ORDERS.avgAgeDays.toFixed(1) : '—'}</span>
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#35d4c7' }}>days</span>
            </div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--tx3)', marginTop: '4px' }}>Today minus created date, across all open (claimed, not yet completed/cancelled) jobs</div>
          </div>

          {/* Cycle Time */}
          <div className="card-kairos" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>CYCLE TIME</div>
              <span style={{ background: 'rgba(53,212,199,0.12)', borderRadius: '6px', padding: '4px', display: 'flex' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#35d4c7" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
              </span>
            </div>
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span style={{ fontSize: '28px', fontWeight: 700, color: '#35d4c7' }}>{otData ? otData.CYCLE_TIME.avgCycleTimeDays.toFixed(1) : '—'}</span>
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#35d4c7' }}>days</span>
            </div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--tx3)', marginTop: '4px' }}>Completed date minus created date, avg across {fmt(otData?.CYCLE_TIME.numberOfCompletedOrders)} completed jobs this window</div>
          </div>
        </div>
      </div>

      {/* ── Job Status Trend (hidden for now) ── */}
      {false && <div className="card-kairos" style={{ marginBottom: 'var(--sp-4)' }}>
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
              <button className="ch-action" style={{ fontSize: 'var(--fs-sm)' }} onClick={exportTrendCsv}>↓ CSV</button>
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
                      {allDropdownVendors
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
            <button
              onClick={() => { setTrendRange('page'); setTrendGroupBy('day'); setTrendFrom(startDate); setTrendTo(endDate); }}
              style={{ fontSize: 'var(--fs-sm)', color: 'var(--tx3)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
            >Reset</button>
          </div>

          {/* Scope indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 0 2px', fontSize: 'var(--fs-sm)', color: 'var(--tx3)' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--blue)', flexShrink: 0 }} />
            Matching page date · {fmtDate(startDate)} – {fmtDate(endDate)}
          </div>
        </div>

        {/* Chart / Table */}
        <div style={{ padding: '0 18px 16px' }}>
          {!chartData.length ? (
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
      </div>}

      {/* ── 03 Vendor Breakdown ── */}
      <div style={{ marginBottom: 'var(--sp-4)' }}>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--tx3)', marginBottom: '4px' }}>03</div>
        <div style={{ fontSize: 'var(--fs-md)', fontWeight: 700, color: 'var(--tx1)', marginBottom: '12px' }}>Vendor Breakdown</div>

        <div className="card-kairos">
          <div style={{ padding: '16px 18px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 'var(--fs-md)', fontWeight: 600, color: 'var(--tx1)' }}>Per-Vendor Performance</div>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--tx3)', marginTop: '2px' }}>{fmtDate(startDate)} – {fmtDate(endDate)} · {fmt(vbdTotals?.totalVendors)} vendors</div>
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
              <button className="ch-action" style={{ fontSize: 'var(--fs-sm)' }} onClick={exportVbdCsv}>↓ CSV</button>
            </div>
          </div>

          <div className="card-scroll-wrap" style={{ maxHeight: '480px' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: '28px' }}>#</th>
                  <th>Vendor</th>
                  <th style={{ textAlign: 'right', width: '90px' }}>Completed</th>
                  <th style={{ textAlign: 'right', width: '80px' }}>Claimed</th>
                  <th style={{ textAlign: 'right', width: '100px' }}>In Progress</th>
                  <th style={{ textAlign: 'right', width: '100px' }}>Rescheduled</th>
                  <th style={{ textAlign: 'right', width: '110px' }}>Parts Ordered</th>
                  <th style={{ textAlign: 'right', width: '100px' }}>First Time Fix</th>
                </tr>
              </thead>
              <tbody>
                {vbdQ.isLoading ? (
                  <tr><td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: 'var(--tx3)' }}>Loading...</td></tr>
                ) : filteredByVendor.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: '40px 24px', textAlign: 'center' }}>
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--tx3)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 12px', display: 'block', opacity: 0.35 }}>
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                      <p style={{ fontSize: 'var(--fs-md)', color: 'var(--tx2)', fontWeight: 500, marginBottom: '4px' }}>No results found</p>
                      <p style={{ fontSize: 'var(--fs-base)', color: 'var(--tx3)' }}>Try a different search or widen the date window</p>
                    </td></tr>
                ) : (
                  (isSearching ? filteredByVendor.slice((vbdPage - 1) * 20, vbdPage * 20) : filteredByVendor).map((v, i) => {
                    const s = v.statusCounts;
                    const rank = (vbdPage - 1) * 20 + i + 1;
                    return (
                      <tr key={v.vendorId}>
                        <td className="font-mono" style={{ color: 'var(--tx3)', fontSize: 'var(--fs-xs)' }}>{rank}</td>
                        <td>
                          <div style={{ fontSize: 'var(--fs-base)', fontWeight: 600, color: 'var(--tx1)', lineHeight: 'var(--lh-tight)' }}>{v.vendorName}</div>
                          <div className="font-mono" style={{ fontSize: 'var(--fs-xs)', color: 'var(--tx3)', marginTop: '2px' }}>ID: {v.vendorId}</div>
                        </td>
                        <td className="font-mono" style={{ textAlign: 'right', color: 'var(--green)', fontWeight: 600 }}>{(s.JOBS_COMPLETED ?? s.JOB_COMPLETED ?? 0).toLocaleString()}</td>
                        <td className="font-mono" style={{ textAlign: 'right', color: '#5484d1', fontWeight: 600 }}>{(s.JOBS_CLAIMED ?? s.JOB_CLAIMED ?? 0).toLocaleString()}</td>
                        <td className="font-mono" style={{ textAlign: 'right', color: '#fbbf24', fontWeight: 600 }}>{(s.JOBS_INPROGRESS ?? s.JOB_IN_PROGRESS ?? 0).toLocaleString()}</td>
                        <td className="font-mono" style={{ textAlign: 'right', color: '#D95459', fontWeight: 600 }}>{(s.JOBS_RESCHEDULED ?? s.JOB_RESCHEDULED ?? 0).toLocaleString()}</td>
                        <td className="font-mono" style={{ textAlign: 'right', color: '#a78bfa', fontWeight: 600 }}>{(s.PARTS_ORDERED ?? s.PART_ORDER_SUBMITTED ?? 0).toLocaleString()}</td>
                        <td className="font-mono" style={{ textAlign: 'right', color: 'var(--tx1)', fontWeight: 600 }}>{(s.FIRST_TIME_FIX ?? 0).toLocaleString()}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {((isSearching && filteredByVendor.length > 0) || (vbdPagination && vbdPagination.totalPages > 0)) && (() => {
            const total = isSearching ? filteredByVendor.length : (vbdPagination?.total ?? 0);
            const totalPages = isSearching ? Math.ceil(total / 20) : (vbdPagination?.totalPages ?? 0);
            const from = (vbdPage - 1) * 20 + 1;
            const to = Math.min(vbdPage * 20, total);
            const pages: number[] = [];
            [1, 2, vbdPage - 1, vbdPage, vbdPage + 1, totalPages - 1, totalPages].forEach((n) => {
              if (n >= 1 && n <= totalPages && !pages.includes(n)) pages.push(n);
            });
            pages.sort((a, b) => a - b);
            return (
              <div className="pgbar">
                <span style={{ color: 'var(--tx3)', fontSize: 'var(--fs-sm)' }}>
                  Showing <strong style={{ color: 'var(--tx1)' }}>{from}–{to}</strong> of <strong style={{ color: 'var(--tx1)' }}>{total}</strong> vendors
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
      </div>


    </div>
  );
}
