import { useMemo } from 'react';

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
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
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
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-600 border-r-transparent"></div>
        <p className="mt-4 text-sm text-slate-600">Loading feedback...</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-slate-600">No feedback submissions found.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 font-semibold text-slate-700">Submitted</th>
              <th className="px-4 py-3 font-semibold text-slate-700">User ID</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Device</th>
              <th className="px-4 py-3 font-semibold text-slate-700">App Version</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Feedback</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((feedback) => (
              <tr
                key={feedback._id}
                className="border-b border-slate-100 transition hover:bg-slate-50"
              >
                <td className="px-4 py-3 text-slate-600">
                  <div className="text-xs">{formatDate(feedback.submittedAt)}</div>
                </td>
                <td className="px-4 py-3">
                  {feedback.user ? (
                    <div className="text-xs">
                      <div className="font-medium text-slate-900">{feedback.user.username}</div>
                      {feedback.user.email && (
                        <div className="text-slate-500">{feedback.user.email}</div>
                      )}
                      {feedback.user.vendorId && (
                        <div className="text-slate-400">Vendor: {feedback.user.vendorId}</div>
                      )}
                    </div>
                  ) : (
                    <code className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
                      {feedback.userId}
                    </code>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  <div className="text-xs">
                    <div className="font-medium">{feedback.metadata.deviceModel}</div>
                    <div className="text-slate-500">{feedback.metadata.osVersion}</div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                    v{feedback.metadata.appVersion}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="space-y-1">
                    {feedback.answers.map((answer, idx) => (
                      <div key={idx} className="text-xs">
                        <span className="font-medium text-slate-700">Q{idx + 1}:</span>{' '}
                        <span className="text-slate-600">{getAnswerText(answer)}</span>
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
