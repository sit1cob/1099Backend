import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { OverviewPage } from './components/dashboard/OverviewPage';
import { OperationsPage } from './components/dashboard/OperationsPage';
import { LoginUsersTable } from './components/LoginUsersTable';
import { FeedbackTable } from './components/FeedbackTable';
import { LiveEvents } from './components/LiveEvents';
import { SettingsModal, type DashboardSettings } from './components/layout/SettingsModal';
import { ThemeProvider } from './context/ThemeContext';
import { fetchFeedback, fetchLoginUsers } from './services/api';
import { fetchVendors, fetchCompletedJobs } from './services/dashboardApi';
import { format } from 'date-fns';

const DEFAULT_SETTINGS: DashboardSettings = {
  theme: 'dark',
  startDate: '2026-05-16',
  endDate: '2026-06-12',
  exportFormat: 'CSV',
  refreshInterval: '1 minute',
  showLastLogin: true,
  showUsername: true,
  showVendorId: true,
};

function App() {
  const [activePage, setActivePage] = useState('Overview');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<DashboardSettings>(DEFAULT_SETTINGS);

  const loginUsersQuery = useQuery({
    queryKey: ['analytics-login-users'],
    queryFn: () => fetchLoginUsers({ limit: 1000 }),
    refetchInterval: 60000,
    staleTime: 60000,
    enabled: activePage === 'Unique Users',
  });

  const feedbackQuery = useQuery({
    queryKey: ['feedback'],
    queryFn: () => fetchFeedback(200),
    refetchInterval: 30000,
    staleTime: 30000,
  });

  const feedbackCount = feedbackQuery.data?.data?.length ?? 0;

  const handleExport = useCallback(async () => {
    try {
      // Fetch all vendors
      const firstPage = await fetchVendors(1, 100);
      const totalPages = firstPage.data.pagination.totalPages;
      let allVendors = [...firstPage.data.data];
      for (let page = 2; page <= totalPages; page++) {
        const res = await fetchVendors(page, 100);
        allVendors = allVendors.concat(res.data.data);
      }

      // Fetch completed jobs for share/rate calculation
      const completedRes = await fetchCompletedJobs({
        startDate: settings.startDate,
        endDate: settings.endDate,
      });
      const byVendor = completedRes.data?.byVendor ?? [];

      // Build ranked data
      const enriched = allVendors.map((v) => {
        const stats = byVendor.find((bv) => bv.vendorId === v.id);
        const completed = stats?.completedCount ?? 0;
        return { ...v, completed };
      });

      // Sort by completed desc to get rank
      enriched.sort((a, b) => b.completed - a.completed);

      const totalCompleted = enriched.reduce((s, v) => s + v.completed, 0);

      // CSV columns: rank, id, name, completed, share, jobs, cancelled, wop, rate, username, email, phone, lastLogin
      const header = 'rank,id,name,completed,share,jobs,cancelled,wop,rate,username,email,phone,lastLogin';
      const rows = enriched.map((v, i) => {
        const rank = i + 1;
        const share = totalCompleted > 0 ? ((v.completed / totalCompleted) * 100).toFixed(1) : '0';
        const jobs = v.completed; // total jobs = completed (best available data)
        const cancelled = 0;
        const wop = 0;
        const rate = jobs > 0 ? Math.round((v.completed / jobs) * 100) : 0;
        const lastLogin = v.lastLoginAt ? format(new Date(v.lastLoginAt), 'MMM dd, yyyy hh:mm a') : 'Never';
        return [
          rank, v.id, `"${v.name}"`, v.completed, share, jobs, cancelled, wop, rate,
          v.username, v.email ?? '', v.phone, lastLogin,
        ].join(',');
      });

      const csv = [header, ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kairos-overview_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed. Please try again.');
    }
  }, [settings.startDate, settings.endDate]);

  return (
    <ThemeProvider>
    <div className="min-h-screen flex" style={{ background: 'var(--app-bg)', color: 'var(--tx1)' }}>
      {/* Sidebar */}
      <Sidebar activeItem={activePage} onNavigate={setActivePage} feedbackCount={feedbackCount} />

      {/* Main content */}
      <div className="flex-1 ml-[236px] flex flex-col" style={{ minHeight: '100vh' }}>
        <Header activePage={activePage} onSettingsClick={() => setSettingsOpen(true)} onExportClick={handleExport} onNavigate={setActivePage} />
        <main className="flex-1 p-6 overflow-y-auto" style={{ background: 'var(--app-bg)' }}>
          {activePage === 'Overview' && <OverviewPage onNavigate={setActivePage} />}

          {activePage === 'Unique Users' && (
            <div>
              <div className="mb-5">
                <h2 className="text-[24px] font-bold leading-tight" style={{ color: 'var(--tx1)' }}>Unique Users</h2>
                <p className="text-[13px]" style={{ color: 'var(--tx3)' }}>All unique login users (lifetime)</p>
              </div>
              <LoginUsersTable
                data={loginUsersQuery.data?.data || []}
                isLoading={loginUsersQuery.isFetching}
              />
            </div>
          )}

          {activePage === 'Feedback' && (
            <div>
              <div className="mb-5">
                <h2 className="text-[24px] font-bold leading-tight" style={{ color: 'var(--tx1)' }}>User Feedback</h2>
                <p className="text-[13px]" style={{ color: 'var(--tx3)' }}>All feedback submissions from mobile app users</p>
              </div>
              <FeedbackTable
                data={feedbackQuery.data?.data ?? []}
                isLoading={feedbackQuery.isFetching}
              />
            </div>
          )}

          {activePage === 'Operations' && <OperationsPage />}

          {activePage === 'Live Events' && <LiveEvents />}

          {(activePage === 'Quality' || activePage === 'Parts') && (
            <div className="flex flex-col items-center justify-center h-[60vh]">
              <svg className="w-12 h-12 mb-4" style={{ color: 'var(--tx3)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <h2 className="text-[20px] font-semibold" style={{ color: 'var(--tx1)' }}>{activePage}</h2>
              <p className="text-[13px] mt-1" style={{ color: 'var(--tx3)' }}>Coming soon</p>
            </div>
          )}

          {!['Overview', 'Operations', 'Unique Users', 'Feedback', 'Live Events', 'System Health', 'Quality', 'Parts'].includes(activePage) && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <svg className="mx-auto w-10 h-10 mb-3" style={{ color: 'var(--tx3)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <h2 className="text-[16px] font-semibold" style={{ color: 'var(--tx1)' }}>{activePage}</h2>
                <p className="text-[13px] mt-1" style={{ color: 'var(--tx3)' }}>Coming soon</p>
              </div>
            </div>
          )}

          {activePage === 'System Health' && (
            <div>
              <div className="mb-5">
                <h2 className="text-[24px] font-bold leading-tight" style={{ color: 'var(--tx1)' }}>System Health</h2>
                <p className="text-[13px]" style={{ color: 'var(--tx3)' }}>System health monitoring</p>
              </div>
              <div className="flex flex-col items-center justify-center h-48 rounded-xl border border-dashed" style={{ borderColor: 'var(--border-2)', background: 'var(--card)' }}>
                <svg className="w-10 h-10 mb-3" style={{ color: 'var(--tx3)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p className="text-[14px] font-semibold" style={{ color: 'var(--tx1)' }}>No data available yet</p>
                <p className="text-[13px] mt-1" style={{ color: 'var(--tx3)' }}>This section will be populated once the data pipeline is connected</p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSave={setSettings}
      />
    </div>
    </ThemeProvider>
  );
}

export default App;

