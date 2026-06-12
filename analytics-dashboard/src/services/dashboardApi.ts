import axios from 'axios';

const PROS_BASE_URL = 'https://pros.shs.com';
const BACKEND_BASE_URL = 'https://1099backend.searskairos.ai';

const prosClient = axios.create({
  baseURL: PROS_BASE_URL,
  timeout: 30000,
});

const backendClient = axios.create({
  baseURL: BACKEND_BASE_URL,
  timeout: 30000,
});

// --- Types ---

export type VendorCountResponse = {
  success: boolean;
  data: { total: number };
  message: string;
};

export type Vendor = {
  id: number;
  name: string;
  phone: string;
  city: string | null;
  state: string | null;
  createdAt: string;
  username: string;
  email: string | null;
  lastLoginAt: string | null;
};

export type VendorsListResponse = {
  success: boolean;
  data: {
    data: Vendor[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  message: string;
};

export type CompletedVendor = {
  vendorId: number;
  vendorName: string;
  completedCount: number;
};

export type CompletedJobsResponse = {
  success: boolean;
  data: {
    overall: number;
    byVendor: CompletedVendor[];
  };
  message: string;
};

export type StatusCounts = {
  JOB_CLAIMED: number;
  JOB_STARTED: number;
  JOB_ARRIVED: number;
  JOB_COMPLETED: number;
  JOB_RESCHEDULED: number;
  PART_ORDER_SUBMITTED: number;
  FIRST_TIME_FIX?: number;
};

export type VendorStatusRow = {
  vendorId: number;
  vendorName: string;
  statusCounts: {
    JOB_CLAIMED: number;
    JOB_COMPLETED: number;
    JOB_RESCHEDULED: number;
    PART_ORDER_SUBMITTED: number;
    FIRST_TIME_FIX: number;
  };
};

export type VendorStatusRangeResponse = {
  success: boolean;
  data: {
    data: VendorStatusRow[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    totals: {
      totalVendors: number;
      JOB_CLAIMED: number;
      JOB_COMPLETED: number;
      JOB_RESCHEDULED: number;
      PART_ORDER_SUBMITTED: number;
      FIRST_TIME_FIX: number;
    };
  };
  message: string;
};

export type StatusCountsResponse = {
  success: boolean;
  data: StatusCounts;
  message: string;
};

export type TimeSeriesPoint = {
  period: string;
  count: number;
};

export type TimeSeriesResponse = {
  success: boolean;
  data: {
    period: string;
    groupBy: string;
    data: Record<string, TimeSeriesPoint[]>;
  };
  message: string;
};

export type VendorJobsResponse = {
  success: boolean;
  data: {
    statusCounts: StatusCounts;
    partOrders: unknown[];
  };
  message: string;
};

// --- API calls ---

export async function fetchVendorCount(): Promise<VendorCountResponse> {
  const { data } = await prosClient.get<VendorCountResponse>('/api/dashboard/vendors/count');
  return data;
}

export async function fetchVendors(page = 1, limit = 20): Promise<VendorsListResponse> {
  const { data } = await prosClient.get<VendorsListResponse>('/api/dashboard/vendors', {
    params: { page, limit },
  });
  return data;
}

export async function fetchCompletedJobs(params?: {
  startDate?: string;
  endDate?: string;
}): Promise<CompletedJobsResponse> {
  const { data } = await prosClient.get<CompletedJobsResponse>('/api/dashboard/jobs/completed', {
    params,
  });
  return data;
}

export async function fetchStatusCounts(params?: {
  startDate?: string;
  endDate?: string;
}): Promise<StatusCountsResponse> {
  const { data } = await prosClient.get<StatusCountsResponse>('/api/dashboard/jobs/status-counts', {
    params,
  });
  return data;
}

export async function fetchStatusTimeSeries(
  period: 'year' | 'month' | 'week',
): Promise<TimeSeriesResponse> {
  const { data } = await prosClient.get<TimeSeriesResponse>('/api/dashboard/jobs/status-counts', {
    params: { period },
  });
  return data;
}

export async function fetchVendorStatusRange(params: {
  startDate: string;
  endDate: string;
  page?: number;
  limit?: number;
}): Promise<VendorStatusRangeResponse> {
  const { data } = await backendClient.get<VendorStatusRangeResponse>('/api/dashboard/vendors/jobs/range', {
    params,
  });
  return data;
}

export async function fetchVendorJobs(vendorId: number): Promise<VendorJobsResponse> {
  const { data } = await prosClient.get<VendorJobsResponse>(
    `/api/dashboard/vendors/${vendorId}/jobs`,
  );
  return data;
}

export async function fetchVendorJobsRange(
  vendorId: number,
  startDate: string,
  endDate: string,
): Promise<any> {
  const { data } = await prosClient.get(
    `/api/dashboard/vendors/${vendorId}/jobs/range`,
    { params: { startDate, endDate } },
  );
  return data;
}
