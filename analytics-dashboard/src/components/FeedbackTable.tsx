import { useMemo } from 'react';
import { format } from 'date-fns';

interface FeedbackAnswer {
  questionId: string;
  answer: string | number;
}

interface FeedbackMetadata {
  appVersion: string;
  deviceModel: string;
  osVersion: string;
  timestamp: string;
}

interface Feedback {
  _id: string;
  userId: string;
  user?: {
    id: string;
    username: string;
    email?: string;
    vendorId?: string;
    role: string;
  } | null;
  metadata: FeedbackMetadata;
  answers: FeedbackAnswer[];
  submittedAt: string;
  createdAt?: string;
}

interface FeedbackTableProps {
  data: Feedback[];
  isLoading: boolean;
}

export function FeedbackTable({ data, isLoading }: FeedbackTableProps) {
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy hh:mm a');
  };

  const getAnswerText = (answer: FeedbackAnswer) => {
    if (typeof answer.answer === 'number') {
      return `${answer.answer}/5 ⭐`;
    }
    return answer.answer;
  };

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => 
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
  }, [data]);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-700/40 bg-[#131b30] p-8 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
        <p className="mt-4 text-[13px] text-[#82889e]">Loading feedback...</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-700/40 bg-[#131b30] p-8 text-center">
        <p className="text-[13px] text-[#82889e]">No feedback submissions found.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-700/40 bg-[#131b30] shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-700/30 bg-slate-800/50">
              <th className="px-4 py-3 text-[11px] font-semibold text-[#82889e] uppercase tracking-[0.4px]">Submitted</th>
              <th className="px-4 py-3 text-[11px] font-semibold text-[#82889e] uppercase tracking-[0.4px]">User ID</th>
              <th className="px-4 py-3 text-[11px] font-semibold text-[#82889e] uppercase tracking-[0.4px]">Logged In User</th>
              <th className="px-4 py-3 text-[11px] font-semibold text-[#82889e] uppercase tracking-[0.4px]">Device</th>
              <th className="px-4 py-3 text-[11px] font-semibold text-[#82889e] uppercase tracking-[0.4px]">App Version</th>
              <th className="px-4 py-3 text-[11px] font-semibold text-[#82889e] uppercase tracking-[0.4px]">Feedback</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((feedback) => (
              <tr
                key={feedback._id}
                className="border-b border-slate-700/30 transition hover:bg-slate-800/40"
              >
                <td className="px-4 py-3 text-[13px] text-[#8498b7] font-mono">
                  {formatDate(feedback.submittedAt)}
                </td>
                <td className="px-4 py-3">
                  {feedback.userId ? (
                    <code className="rounded bg-slate-800/60 px-2 py-1 text-[13px] text-[#8498b7] font-mono">
                      {feedback.userId}
                    </code>
                  ) : (
                    <span className="text-[13px] text-[#82889e]">null</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {feedback.user ? (
                    <div>
                      <div className="text-[13px] font-semibold text-[#e6edf8]">{feedback.user.username}</div>
                      {feedback.user.email && (
                        <div className="text-[11px] text-[#82889e] font-mono">{feedback.user.email}</div>
                      )}
                      {feedback.user.vendorId && (
                        <div className="text-[11px] text-[#82889e] font-mono">Vendor: {feedback.user.vendorId}</div>
                      )}
                    </div>
                  ) : (
                    <span className="text-[13px] text-[#82889e]">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div>
                    <div className="text-[13px] font-medium text-[#e6edf8]">{feedback.metadata.deviceModel}</div>
                    <div className="text-[11px] text-[#82889e]">{feedback.metadata.osVersion}</div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-blue-500/20 px-2 py-1 text-[11px] font-semibold text-blue-400">
                    v{feedback.metadata.appVersion}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="space-y-1">
                    {feedback.answers.map((answer, idx) => (
                      <div key={idx} className="text-[13px]">
                        <span className="font-medium text-[#e6edf8]">Q{idx + 1}:</span>{' '}
                        <span className="text-[#8498b7]">{getAnswerText(answer)}</span>
                      </div>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
