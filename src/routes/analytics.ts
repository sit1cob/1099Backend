import { Router } from 'express';
import { ApiAnalyticsModel } from '../models/apiAnalytics';
import { type AuthenticatedRequest } from '../middleware/auth';
import { UserModel } from '../models/user';

type QueryParams = {
  limit?: string;
  page?: string;
  method?: string;
  route?: string;
  success?: 'success' | 'failed';
  userId?: string;
  vendorId?: string;
  search?: string;
  from?: string;
  to?: string;
};

const MAX_LIMIT = 500;
const EXCLUDE_URL_REGEX = /\/api\/analytics/;
const NON_API_ROUTES = ['/', '/favicon.ico', '/robots.txt', '/sitemap.xml'];

export const analyticsRouter = Router();

async function buildFilters(query: QueryParams) {
  const filter: Record<string, any> = {};
  const andConditions: any[] = [
    { url: { $not: EXCLUDE_URL_REGEX } },
    { url: { $nin: NON_API_ROUTES } }, // Exclude non-API routes
  ];

  if (query.method) filter.method = query.method.toUpperCase();
  if (query.route) {
    // Filter by URL path (since route field is often null)
    // Match URLs that start with the selected route
    filter.url = new RegExp(`^${query.route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\?|$)`);
  }
  
  // Handle userId filter - support both ObjectId and username
  if (query.userId) {
    // Check if it's a valid ObjectId format (24 hex characters)
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(query.userId);
    
    if (isObjectId) {
      // Direct ObjectId match
      filter.userId = query.userId;
    } else {
      // Look up user by username
      const user = await UserModel.findOne({ username: query.userId }).lean();
      if (user) {
        filter.userId = user._id.toString();
      } else {
        // No user found - set impossible filter to return no results
        filter.userId = 'no-match';
      }
    }
  }
  
  // Handle vendorId filter
  if (query.vendorId) {
    filter.vendorId = query.vendorId;
  }
  
  if (query.success === 'success') filter.success = true;
  if (query.success === 'failed') filter.success = false;
  if (query.search) {
    const regex = new RegExp(query.search, 'i');
    filter.$or = [
      { route: regex },
      { url: regex },
      { userId: regex },
      { vendorId: regex },
    ];
  }

  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) {
      const fromDate = new Date(query.from);
      if (!isNaN(fromDate.getTime())) filter.createdAt.$gte = fromDate;
    }
    if (query.to) {
      const toDate = new Date(query.to);
      if (!isNaN(toDate.getTime())) filter.createdAt.$lte = toDate;
    }
    if (Object.keys(filter.createdAt).length === 0) {
      delete filter.createdAt;
    }
  }

  if (andConditions.length) {
    filter.$and = andConditions;
  }

  return filter;
}

analyticsRouter.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const query = req.query as QueryParams;
    const limit = Math.min(Number(query.limit) || 50, MAX_LIMIT);
    const page = Math.max(Number(query.page) || 1, 1);
    const skip = (page - 1) * limit;
    const filters = await buildFilters(query);

    const [records, total] = await Promise.all([
      ApiAnalyticsModel.find(filters)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ApiAnalyticsModel.countDocuments(filters),
    ]);

    return res.json({
      success: true,
      data: records,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: any) {
    console.error('[Analytics] Failed to load logs:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Failed to load analytics' });
  }
});

analyticsRouter.get('/summary', async (req: AuthenticatedRequest, res) => {
  try {
    const filters = await buildFilters(req.query as QueryParams);

    const aggregation = await ApiAnalyticsModel.aggregate([
      { $match: filters },
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                requests: { $sum: 1 },
                successCount: { $sum: { $cond: ['$success', 1, 0] } },
                avgLatency: { $avg: '$elapsedMs' },
              },
            },
          ],
          byMethod: [
            { $group: { _id: '$method', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ],
          byStatus: [
            { $group: { _id: '$statusCode', count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
          ],
        },
      },
    ]);

    const totals = aggregation[0]?.totals[0] || { requests: 0, successCount: 0, avgLatency: 0 };
    const byMethod = aggregation[0]?.byMethod || [];
    const byStatus = aggregation[0]?.byStatus || [];

    const successRate =
      totals.requests > 0 ? (totals.successCount / totals.requests) * 100 : 0;

    return res.json({
      success: true,
      data: {
        totals: {
          requests: totals.requests || 0,
          successRate,
          avgLatency: totals.avgLatency || 0,
        },
        byMethod: Object.fromEntries(byMethod.map((item: any) => [item._id, item.count])),
        byStatus: Object.fromEntries(byStatus.map((item: any) => [item._id, item.count])),
      },
    });
  } catch (err: any) {
    console.error('[Analytics] Failed to build summary:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Failed to load summary' });
  }
});

function escapeCsvField(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

analyticsRouter.get('/routes', async (req: AuthenticatedRequest, res) => {
  try {
    // Get distinct URLs (not routes, since route field is often null)
    const urls = await ApiAnalyticsModel.distinct('url', {
      url: { $not: EXCLUDE_URL_REGEX },
    });

    // Extract base paths (remove query strings and normalize)
    const routeSet = new Set<string>();
    urls.forEach((url: string) => {
      if (!url) return;
      // Remove query string
      const path = url.split('?')[0];
      // Normalize path (remove trailing slashes)
      const normalized = path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path;
      // Only include API routes (starting with /api) and exclude root paths like /
      if (normalized && normalized.trim().length > 0 && normalized.startsWith('/api')) {
        routeSet.add(normalized);
      }
    });

    // Convert to array and sort
    const validRoutes = Array.from(routeSet).sort();

    return res.json({
      success: true,
      data: validRoutes,
    });
  } catch (err: any) {
    console.error('[Analytics] Failed to load routes:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Failed to load routes' });
  }
});

analyticsRouter.get('/export', async (req: AuthenticatedRequest, res) => {
  try {
    const filters = await buildFilters(req.query as QueryParams);
    const records = await ApiAnalyticsModel.find(filters)
      .sort({ createdAt: -1 })
      .limit(MAX_LIMIT)
      .lean();

    const headers = [
      '_id',
      'userId',
      'vendorId',
      'method',
      'route',
      'url',
      'statusCode',
      'success',
      'elapsedMs',
      'ipAddress',
      'userAgent',
      'createdAt',
    ];

    const csvRows = [
      headers.join(','),
      ...records.map((record: any) =>
        headers.map((header) => escapeCsvField(record[header] || '')).join(',')
      ),
    ];

    const csv = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="api-analytics.csv"');
    return res.send(csv);
  } catch (err: any) {
    console.error('[Analytics] Failed to export CSV:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Failed to export analytics' });
  }
});

