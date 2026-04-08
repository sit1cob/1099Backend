import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FiltersPanel } from './components/FiltersPanel';
import { StatCard } from './components/StatCard';
import { AnalyticsTable } from './components/AnalyticsTable';
import { LatencyTrend } from './components/LatencyTrend';
import { UserActivityList } from './components/UserActivityList';
import { Pagination } from './components/Pagination';
import { FeedbackTable } from './components/FeedbackTable';
import { fetchAnalytics, fetchSummary, fetchFeedback, fetchUsers, fetchLoginUsers } from './services/api';
import { LoginUsersTable } from './components/LoginUsersTable';
import type { AnalyticsFilter } from './types';

const defaultFilters: AnalyticsFilter = {
  success: 'all',
  limit: 50,
  page: 1,
};

type TabType = 'analytics' | 'unique_users' | 'feedback';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('analytics');
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

  const usersQuery = useQuery({
    queryKey: ['analytics-users', filters.userId, filters.from, filters.to],
    queryFn: () => fetchUsers({ userId: filters.userId, from: filters.from, to: filters.to, limit: 200 }),
    refetchInterval: 30000,
    staleTime: 30000,
    enabled: activeTab === 'analytics',
  });

  const feedbackQuery = useQuery({
    queryKey: ['feedback'],
    queryFn: () => fetchFeedback(200),
    refetchInterval: 30000,
    staleTime: 30000,
    enabled: activeTab === 'feedback',
  });

  const loginUsersQuery = useQuery({
    queryKey: ['analytics-login-users'],
    queryFn: () => fetchLoginUsers({ limit: 1000 }),
    refetchInterval: 60000,
    staleTime: 60000,
    enabled: activeTab === 'unique_users',
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
        {activeTab === 'analytics' && (
          <a
            className="rounded-full border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-brand-600 shadow-sm transition hover:bg-brand-50"
            href={exportUrl}
          >
            Export CSV
          </a>
        )}
      </header>

      {/* Tabs */}
      <div className="mb-6 border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`border-b-2 px-1 pb-4 text-sm font-medium transition ${
              activeTab === 'analytics'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('feedback')}
            className={`border-b-2 px-1 pb-4 text-sm font-medium transition ${
              activeTab === 'feedback'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            Feedback
            {feedbackQuery.data?.count ? (
              <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">
                {feedbackQuery.data.count}
              </span>
            ) : null}
          </button>
          <button
            onClick={() => setActiveTab('unique_users')}
            className={`border-b-2 px-1 pb-4 text-sm font-medium transition ${
              activeTab === 'unique_users'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            Unique Users
          </button>
        </nav>
      </div>

      {activeTab === 'analytics' && (
        <>
          <section className="mb-6">
            <FiltersPanel value={filters} onChange={setFilters} />
          </section>

          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-6">
              <LatencyTrend data={analyticsQuery.data?.data || []} />
              <AnalyticsTable data={analyticsQuery.data?.data || []} isLoading={analyticsQuery.isLoading} />
              <Pagination {...paginationData} onPageChange={handlePageChange} onPageSizeChange={handlePageSizeChange} />
            </div>
            <div className="space-y-6">
              <UserActivityList
                users={usersQuery.data?.data || []}
                onSelect={(userId) =>
                  setFilters((prev) => ({
                    ...prev,
                    userId: prev.userId === userId ? undefined : userId,
                    page: 1,
                  }))
                }
                selectedUser={filters.userId}
              />
              <StatCard label="Requests" value={stats.requests.toLocaleString()} />
              <StatCard label="Success rate" value={`${stats.successRate.toFixed(1)}%`} />
              <StatCard label="Avg latency" value={`${stats.avgLatency.toFixed(0)}ms`} />
            </div>
          </div>
        </>
      )}

      {activeTab === 'feedback' && (
        <section className="mb-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-slate-900">User Feedback</h2>
            <p className="text-sm text-slate-500">
              All feedback submissions from mobile app users
            </p>
          </div>
          <FeedbackTable
            data={feedbackQuery.data?.data ?? []}
            isLoading={feedbackQuery.isFetching}
          />
        </section>
      )}

      {activeTab === 'unique_users' && (
        <section className="mb-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-slate-900">Unique Login Users (Lifetime)</h2>
            <p className="text-sm text-slate-500">Source: /api/analytics/login-users</p>
          </div>
          <LoginUsersTable data={loginUsersQuery.data?.data || []} isLoading={loginUsersQuery.isFetching} />
        </section>
      )}
    </div>
  );
}

export default App;

