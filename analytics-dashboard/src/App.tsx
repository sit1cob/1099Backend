import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FiltersPanel } from './components/FiltersPanel';
import { StatCard } from './components/StatCard';
import { AnalyticsTable } from './components/AnalyticsTable';
import { LatencyTrend } from './components/LatencyTrend';
import { UserActivityList } from './components/UserActivityList';
import { Pagination } from './components/Pagination';
import { fetchAnalytics, fetchSummary } from './services/api';
import type { AnalyticsFilter } from './types';

const defaultFilters: AnalyticsFilter = {
  success: 'all',
  limit: 50,
  page: 1,
};

function App() {
  const [filters, setFilters] = useState<AnalyticsFilter>(defaultFilters);

  const analyticsQuery = useQuery({
    queryKey: ['analytics', filters],
    queryFn: () => fetchAnalytics(filters),
    refetchInterval: 15000,
    staleTime: 15000,
  });

  const summaryQuery = useQuery({
    queryKey: ['analytics-summary', filters.userId, filters.from, filters.to],
    queryFn: () => fetchSummary({ userId: filters.userId, from: filters.from, to: filters.to }),
    refetchInterval: 30000,
    staleTime: 30000,
  });

  const stats = useMemo(() => {
    if (!summaryQuery.data?.data) {
      return {
        requests: 0,
        successRate: 0,
        avgLatency: 0,
      };
    }
    const { totals } = summaryQuery.data.data;
    return {
      requests: totals.requests,
      successRate: totals.successRate,
      avgLatency: totals.avgLatency,
    };
  }, [summaryQuery.data]);

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const handlePageSizeChange = (limit: number) => {
    setFilters((prev) => ({ ...prev, limit, page: 1 }));
  };

  const paginationData = {
    currentPage: analyticsQuery.data?.page || 1,
    totalPages: analyticsQuery.data?.totalPages || 1,
    totalRecords: analyticsQuery.data?.total || 0,
    pageSize: filters.limit || 50,
  };

  // Build export URL with current filters
  const exportUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.method) params.append('method', filters.method);
    if (filters.route) params.append('route', filters.route);
    if (filters.search) params.append('search', filters.search);
    if (filters.userId) params.append('userId', filters.userId);
    if (filters.success && filters.success !== 'all') params.append('success', filters.success);
    if (filters.from) params.append('from', filters.from);
    if (filters.to) params.append('to', filters.to);
    const query = params.toString();
    return query ? `/api/analytics/export?${query}` : '/api/analytics/export';
  }, [filters]);

  return (
    <div className="min-h-screen bg-slate-50 px-4 pb-10 pt-8 sm:px-6 lg:px-10">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-brand-600">API Insights</p>
          <h1 className="text-3xl font-bold text-slate-900">Realtime Analytics</h1>
          <p className="text-sm text-slate-500">
            Monitor every call to the 1099 Job Board API across vendors, routes, and clients.
          </p>
        </div>
        <a
          className="rounded-full border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-brand-600 shadow-sm transition hover:bg-brand-50"
          href={exportUrl}
        >
          Export CSV
        </a>
      </header>

      <section className="mb-6">
        <FiltersPanel value={filters} onChange={setFilters} />
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <StatCard label="Requests (24h)" value={stats.requests} helper="rolling" accent="blue" />
        <StatCard label="Success rate" value={`${stats.successRate.toFixed(1)}%`} accent="green" />
        <StatCard label="Avg latency" value={`${stats.avgLatency.toFixed(0)} ms`} accent="red" />
      </section>

      <section className="mb-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <AnalyticsTable
            data={analyticsQuery.data?.data ?? []}
            isLoading={analyticsQuery.isFetching}
          />
          <Pagination
            currentPage={paginationData.currentPage}
            totalPages={paginationData.totalPages}
            totalRecords={paginationData.totalRecords}
            pageSize={paginationData.pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
          <LatencyTrend data={analyticsQuery.data?.data ?? []} />
        </div>
        <div className="space-y-6">
          <UserActivityList
            records={analyticsQuery.data?.data ?? []}
            onSelect={(userId) =>
              setFilters((prev) => ({
                ...prev,
                userId: prev.userId === userId ? undefined : userId,
              }))
            }
            selectedUser={filters.userId}
          />
        </div>
      </section>
    </div>
  );
}

export default App;

