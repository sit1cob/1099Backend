import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { OverviewPage } from './components/dashboard/OverviewPage';
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
    enabled: activePage === 'Feedback',
  });

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex">
      {/* Sidebar */}
      <Sidebar activeItem={activePage} onNavigate={setActivePage} />

      {/* Main content */}
      <div className="flex-1 ml-[220px] flex flex-col">
        <Header activePage={activePage} />
        <main className="flex-1 p-6 overflow-y-auto">
          {activePage === 'Overview' && <OverviewPage />}

          {activePage === 'Unique Users' && (
            <div>
              <div className="mb-5">
                <h2 className="text-xl font-bold text-white">Unique Users</h2>
                <p className="text-sm text-slate-400">All unique login users (lifetime)</p>
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
                <h2 className="text-xl font-bold text-white">User Feedback</h2>
                <p className="text-sm text-slate-400">All feedback submissions from mobile app users</p>
              </div>
              <FeedbackTable
                data={feedbackQuery.data?.data ?? []}
                isLoading={feedbackQuery.isFetching}
              />
            </div>
          )}

          {activePage === 'Live Events' && <LiveEvents />}

          {!['Overview', 'Unique Users', 'Feedback', 'Live Events'].includes(activePage) && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-slate-300">{activePage}</h2>
                <p className="text-sm text-slate-500 mt-1">Coming soon</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;

