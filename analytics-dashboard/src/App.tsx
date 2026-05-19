import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { OverviewPage } from './components/dashboard/OverviewPage';
import { OperationsPage } from './components/dashboard/OperationsPage';
import { LoginUsersTable } from './components/LoginUsersTable';
import { FeedbackTable } from './components/FeedbackTable';
import { LiveEvents } from './components/LiveEvents';
import { fetchFeedback, fetchLoginUsers } from './services/api';

function App() {
  const [activePage, setActivePage] = useState('Overview');

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

  return (
    <div className="min-h-screen bg-[#0e1a2e] flex">
      {/* Sidebar */}
      <Sidebar activeItem={activePage} onNavigate={setActivePage} feedbackCount={feedbackCount} />

      {/* Main content */}
      <div className="flex-1 ml-[220px] flex flex-col">
        <Header activePage={activePage} />
        <main className="flex-1 p-6 overflow-y-auto">
          {activePage === 'Overview' && <OverviewPage onNavigate={setActivePage} />}

          {activePage === 'Unique Users' && (
            <div>
              <div className="mb-5">
                <h2 className="text-[24px] font-bold text-[#e6edf8] leading-tight">Unique Users</h2>
                <p className="text-[13px] text-[#8498b7]">All unique login users (lifetime)</p>
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
                <h2 className="text-[24px] font-bold text-[#e6edf8] leading-tight">User Feedback</h2>
                <p className="text-[13px] text-[#8498b7]">All feedback submissions from mobile app users</p>
              </div>
              <FeedbackTable
                data={feedbackQuery.data?.data ?? []}
                isLoading={feedbackQuery.isFetching}
              />
            </div>
          )}

          {activePage === 'Operations' && <OperationsPage />}

          {activePage === 'Live Events' && <LiveEvents />}

          {!['Overview', 'Operations', 'Unique Users', 'Feedback', 'Live Events', 'System Health'].includes(activePage) && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <svg className="mx-auto w-10 h-10 text-[#82889e] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <h2 className="text-[16px] font-semibold text-[#e6edf8]">{activePage}</h2>
                <p className="text-[13px] text-[#82889e] mt-1">Coming soon</p>
              </div>
            </div>
          )}

          {activePage === 'System Health' && (
            <div>
              <div className="mb-5">
                <h2 className="text-[24px] font-bold text-[#e6edf8] leading-tight">System Health</h2>
                <p className="text-[13px] text-[#8498b7]">System health monitoring</p>
              </div>
              <div className="flex flex-col items-center justify-center h-48 rounded-xl border border-dashed border-slate-700/40 bg-[#162236]">
                <svg className="w-10 h-10 text-[#82889e] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <p className="text-[14px] font-semibold text-[#e6edf8]">No data available yet</p>
                <p className="text-[13px] text-[#82889e] mt-1">This section will be populated once the data pipeline is connected</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;

