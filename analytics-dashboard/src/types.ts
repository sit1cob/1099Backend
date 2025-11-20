export type ApiAnalyticsRecord = {
  _id: string;
  createdAt: string;
  method: string;
  url: string;
  route?: string | null;
  userId?: string | null;
  vendorId?: string | null;
  loginUsername?: string | null;
  loginPassword?: string | null;
  statusCode: number;
  success: boolean;
  elapsedMs?: number | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestBody?: Record<string, unknown>;
  responseBody?: Record<string, unknown>;
  metadata?: {
    query?: Record<string, unknown>;
    params?: Record<string, unknown>;
    loginAttempt?: {
      username: string | null;
      password: string | null;
    };
  };
};

export type AnalyticsFilter = {
  success?: 'all' | 'success' | 'failed';
  method?: string;
  route?: string;
  search?: string;
  userId?: string;
  from?: string;
  to?: string;
  limit?: number;
  page?: number;
};

export type AnalyticsResponse = {
  success: boolean;
  data: ApiAnalyticsRecord[];
  total: number;
  page?: number;
  limit?: number;
  totalPages?: number;
};

