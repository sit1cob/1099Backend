import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fetchVendorCount,
  fetchVendors,
  fetchCompletedJobs,
  fetchStatusCounts,
  fetchStatusTimeSeries,
  fetchVendorJobs,
} from '../../services/dashboardApi';
import { StatusCountCards } from './StatusCountCards';
import { JobTrendChart } from './JobTrendChart';
import { CompletedByVendorTable } from './CompletedByVendorTable';
import { VendorsTable } from './VendorsTable';
import { VendorDetailModal } from './VendorDetailModal';

type TrendPeriod = 'month' | 'year' | 'week';

export function DashboardTab() {
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>('month');
  const [vendorPage, setVendorPage] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<{
    id: number;
    name?: string;
  } | null>(null);

  const dateParams =
    startDate && endDate ? { startDate, endDate } : undefined;

  const vendorCountQuery = useQuery({
    queryKey: ['dashboard-vendor-count'],
    queryFn: fetchVendorCount,
    staleTime: 60000,
  });

  const statusCountsQuery = useQuery({
    queryKey: ['dashboard-status-counts', startDate, endDate],
    queryFn: () => fetchStatusCounts(dateParams),
    staleTime: 30000,
    refetchInterval: 30000,
  });

  const completedQuery = useQuery({
    queryKey: ['dashboard-completed', startDate, endDate],
    queryFn: () => fetchCompletedJobs(dateParams),
    staleTime: 60000,
  });

  const trendQuery = useQuery({
    queryKey: ['dashboard-trend', trendPeriod],
    queryFn: () => fetchStatusTimeSeries(trendPeriod),
    staleTime: 60000,
  });

  const vendorsQuery = useQuery({
    queryKey: ['dashboard-vendors', vendorPage],
    queryFn: () => fetchVendors(vendorPage, 20),
    staleTime: 60000,
  });

  const vendorDetailQuery = useQuery({
    queryKey: ['dashboard-vendor-detail', selectedVendor?.id],
    queryFn: () => fetchVendorJobs(selectedVendor!.id),
    enabled: !!selectedVendor,
    staleTime: 30000,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Job Board Dashboard</h2>
        <p className="text-sm text-slate-500">
          Live data from pros.shs.com — vendor counts, job statuses, and completion metrics
        </p>
      </div>

      {/* Date Range Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-medium text-slate-500">Date Range:</span>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <span className="text-xs text-slate-400">to</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        {(startDate || endDate) && (
          <button
            onClick={() => { setStartDate(''); setEndDate(''); }}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-50"
          >
            Clear
          </button>
        )}
        {startDate && endDate && (
          <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
            Filtered
          </span>
        )}
      </div>

      {/* Stat Cards */}
      <StatusCountCards
        data={statusCountsQuery.data?.data}
        isLoading={statusCountsQuery.isLoading}
        vendorCount={vendorCountQuery.data?.data?.total}
        completedOverall={completedQuery.data?.data?.overall}
      />

      {/* Trend Chart with period toggle */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Period:</span>
          {(['week', 'month', 'year'] as TrendPeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setTrendPeriod(p)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                trendPeriod === p
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
        <JobTrendChart
          data={trendQuery.data?.data?.data}
          isLoading={trendQuery.isLoading}
          groupBy={trendQuery.data?.data?.groupBy}
        />
      </div>

      {/* Two-column: Completed by vendor + All vendors */}
      <div className="grid gap-6 lg:grid-cols-2">
        <CompletedByVendorTable
          data={completedQuery.data?.data?.byVendor}
          overall={completedQuery.data?.data?.overall}
          isLoading={completedQuery.isLoading}
          onVendorClick={(vendorId) => {
            const vendor = completedQuery.data?.data?.byVendor.find((v) => v.vendorId === vendorId);
            setSelectedVendor({ id: vendorId, name: vendor?.vendorName });
          }}
        />
        <VendorsTable
          data={vendorsQuery.data?.data}
          isLoading={vendorsQuery.isLoading}
          onPageChange={setVendorPage}
        />
      </div>

      {/* Vendor detail modal */}
      {selectedVendor && (
        <VendorDetailModal
          vendorId={selectedVendor.id}
          vendorName={selectedVendor.name}
          data={vendorDetailQuery.data?.data}
          isLoading={vendorDetailQuery.isLoading}
          onClose={() => setSelectedVendor(null)}
        />
      )}
    </div>
  );
}
