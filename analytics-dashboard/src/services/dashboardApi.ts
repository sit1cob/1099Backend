import axios from 'axios';

const BASE_URL = 'https://1099backend.searskairos.ai';

const apiClient = axios.create({
  baseURL: BASE_URL,
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
  JOB_IN_PROGRESS: number;
  JOB_COMPLETED: number;
  JOB_RESCHEDULED: number;
  PART_ORDER_SUBMITTED: number;
  FIRST_TIME_FIX?: number;
  JOBS_OFFERED?: number;
  CLAIM_RATE?: number;
  JOBS_UNCLAIMED?: number;
  JOBS_CLAIMED?: number;
  JOBS_COMPLETED?: number;
  JOBS_INPROGRESS?: number;
  JOBS_RESCHEDULED?: number;
  PARTS_ORDERED?: number;
};

export type VendorStatusRow = {
  vendorId: number;
  vendorName: string;
  statusCounts: {
    JOB_CLAIMED?: number;
    JOB_IN_PROGRESS?: number;
    JOB_COMPLETED?: number;
    JOB_RESCHEDULED?: number;
    PART_ORDER_SUBMITTED?: number;
    PARTS_ORDERED?: number;
    FIRST_TIME_FIX?: number;
    JOBS_CLAIMED?: number;
    JOBS_COMPLETED?: number;
    JOBS_INPROGRESS?: number;
    JOBS_RESCHEDULED?: number;
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
      JOBS_OFFERED?: number;
      JOBS_UNCLAIMED?: number;
      JOBS_CLAIMED?: number;
      JOBS_COMPLETED?: number;
      JOBS_INPROGRESS?: number;
      FIRST_TIME_FIX?: number;
      JOBS_RESCHEDULED?: number;
      PARTS_ORDERED?: number;
      JOB_CLAIMED?: number;
      JOB_IN_PROGRESS?: number;
      JOB_COMPLETED?: number;
      JOB_RESCHEDULED?: number;
      PART_ORDER_SUBMITTED?: number;
    };
  };
  message: string;
};

export type StatusCountsResponse = {
  success: boolean;
  data: StatusCounts;
  message: string;
};

export type GeoHierarchyDistrict = {
  districtName: string;
  planningAreas: {
    planningAreaName: string;
    zipCodes: string[];
  }[];
};

export type GeoHierarchyResponse = {
  success: boolean;
  data: {
    districts: GeoHierarchyDistrict[];
  };
  message: string;
};

export type OrderTimingResponse = {
  success: boolean;
  data: {
    AGE_ON_OPEN_ORDERS: {
      avgAgeDays: number;
      numberOfOpenOrders: number;
    };
    CYCLE_TIME: {
      avgCycleTimeDays: number;
      numberOfCompletedOrders: number;
    };
  };
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
  const { data } = await apiClient.get<VendorCountResponse>('/api/dashboard/vendors/9');
  return data;
}

export async function fetchVendors(page = 1, limit = 20): Promise<VendorsListResponse> {
  const { data } = await apiClient.get<VendorsListResponse>('/api/dashboard/vendors', {
    params: { page, limit },
  });
  return data;
}

export async function fetchCompletedJobs(params?: {
  startDate?: string;
  endDate?: string;
  district?: string;
  planningArea?: string;
}): Promise<CompletedJobsResponse> {
  const { data } = await apiClient.get<CompletedJobsResponse>('/api/dashboard/jobs/completed', {
    params,
  });
  return data;
}

export async function fetchStatusCounts(params: {
  startDate: string;
  endDate: string;
  district?: string;
  planningArea?: string;
}): Promise<StatusCountsResponse> {
  const { data } = await apiClient.get<StatusCountsResponse>('/api/dashboard/jobs/status-counts', {
    params,
  });
  return data;
}

export async function fetchOrderTiming(params?: {
  district?: string;
  planningArea?: string;
}): Promise<OrderTimingResponse> {
  const { data } = await apiClient.get<OrderTimingResponse>('/api/dashboard/jobs/order-timing', { params });
  return data;
}

export async function fetchGeoHierarchy(): Promise<GeoHierarchyResponse> {
  const { data } = await apiClient.get<GeoHierarchyResponse>('/api/dashboard/geo-hierarchy');
  return data;
}

export async function fetchStatusTimeSeries(
  period: 'year' | 'month' | 'week',
): Promise<TimeSeriesResponse> {
  const { data } = await apiClient.get<TimeSeriesResponse>('/api/dashboard/jobs/status-counts', {
    params: { period },
  });
  return data;
}

export async function fetchVendorStatusRange(params: {
  startDate: string;
  endDate: string;
  page?: number;
  limit?: number;
  search?: string;
  district?: string;
  planningArea?: string;
}): Promise<VendorStatusRangeResponse> {
  const { data } = await apiClient.get<VendorStatusRangeResponse>('/api/dashboard/vendors/jobs/range', {
    params,
  });
  return data;
}

// Fetch ALL vendors by fetching all pages in parallel
export async function fetchAllVendorStatusRange(params: {
  startDate: string;
  endDate: string;
  district?: string;
  planningArea?: string;
}): Promise<VendorStatusRow[]> {
  // First fetch to get total pages
  const firstPage = await fetchVendorStatusRange({ ...params, page: 1, limit: 100 });
  const totalPages = firstPage.data?.pagination?.totalPages ?? 1;
  const allVendors: VendorStatusRow[] = [...(firstPage.data?.data ?? [])];
  
  if (totalPages > 1) {
    // Fetch remaining pages in parallel
    const pagePromises = [];
    for (let page = 2; page <= totalPages; page++) {
      pagePromises.push(fetchVendorStatusRange({ ...params, page, limit: 100 }));
    }
    const results = await Promise.all(pagePromises);
    for (const result of results) {
      allVendors.push(...(result.data?.data ?? []));
    }
  }
  
  return allVendors;
}

export async function fetchVendorJobs(vendorId: number): Promise<VendorJobsResponse> {
  const { data } = await apiClient.get<VendorJobsResponse>(
    `/api/dashboard/vendors/${vendorId}/jobs`,
  );
  return data;
}

export async function fetchVendorJobsRange(
  vendorId: number,
  startDate: string,
  endDate: string,
): Promise<any> {
  const { data } = await apiClient.get(
    `/api/dashboard/vendors/${vendorId}/jobs/range`,
    { params: { startDate, endDate } },
  );
  return data;
}
