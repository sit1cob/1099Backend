import axios from 'axios';
import type { AnalyticsFilter, AnalyticsResponse, AnalyticsUserSummary } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://app1099-api.searskairos.ai';

const client = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export async function fetchAnalytics(filter: AnalyticsFilter = {}): Promise<AnalyticsResponse> {
  const params = new URLSearchParams();
  if (filter.method) params.append('method', filter.method);
  if (filter.route) params.append('route', filter.route);
  if (filter.search) params.append('search', filter.search);
  if (filter.userId) params.append('userId', filter.userId);
  if (filter.success && filter.success !== 'all') params.append('success', filter.success);
  if (filter.from) params.append('from', filter.from);
  if (filter.to) params.append('to', filter.to);
  params.append('limit', String(filter.limit ?? 50));
  if (filter.page) params.append('page', String(filter.page));

  const { data } = await client.get<AnalyticsResponse>(`/api/analytics?${params.toString()}`);
  return data;
}

export type SummaryResponse = {
  success: boolean;
  data: {
    totals: {
      requests: number;
      successRate: number;
      avgLatency: number;
    };
    byMethod: Record<string, number>;
    byStatus: Record<string, number>;
  };
};

export async function fetchSummary(filter: Pick<AnalyticsFilter, 'userId' | 'from' | 'to'> = {}): Promise<SummaryResponse> {
  const params = new URLSearchParams();
  if (filter.userId) params.append('userId', filter.userId);
  if (filter.from) params.append('from', filter.from);
  if (filter.to) params.append('to', filter.to);

  const query = params.toString();
  const endpoint = query ? `/api/analytics/summary?${query}` : '/api/analytics/summary';
  const { data} = await client.get<SummaryResponse>(endpoint);
  return data;
}

export type RoutesResponse = {
  success: boolean;
  data: string[];
};

export async function fetchUniqueRoutes(): Promise<RoutesResponse> {
  const { data } = await client.get<RoutesResponse>('/api/analytics/routes');
  return data;
}

export type UsersResponse = {
  success: boolean;
  data: AnalyticsUserSummary[];
};

export async function fetchUsers(filter: Pick<AnalyticsFilter, 'userId' | 'from' | 'to'> & { limit?: number } = {}): Promise<UsersResponse> {
  const params = new URLSearchParams();
  if (filter.userId) params.append('userId', filter.userId);
  if (filter.from) params.append('from', filter.from);
  if (filter.to) params.append('to', filter.to);
  if (filter.limit) params.append('limit', String(filter.limit));

  const query = params.toString();
  const endpoint = query ? `/api/analytics/users?${query}` : '/api/analytics/users';
  const { data } = await client.get<UsersResponse>(endpoint);
  return data;
}

export type FeedbackResponse = {
  success: boolean;
  data: Array<{
    _id: string;
    userId: string;
    metadata: {
      appVersion: string;
      deviceModel: string;
      osVersion: string;
      timestamp: string;
    };
    answers: Array<{
      questionId: string;
      answer: string | number;
    }>;
    submittedAt: string;
    createdAt?: string;
  }>;
  count: number;
};

export async function fetchFeedback(limit: number = 100): Promise<FeedbackResponse> {
  const { data } = await client.get<FeedbackResponse>(`/api/feedback?limit=${limit}`);
  return data;
}
