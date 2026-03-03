import { Router } from 'express';
import axios from 'axios';

export const prosRouter = Router();

const PROS_API_BASE_URL = process.env.PROS_API_BASE_URL || 'https://pros.shs.com';

function getForwardHeaders(req: any) {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  const auth = typeof req.headers.authorization === 'string' ? req.headers.authorization : '';
  if (auth) headers.Authorization = auth;

  const cookie = typeof req.headers.cookie === 'string' ? req.headers.cookie : '';
  if (cookie) headers.Cookie = cookie;

  return headers;
}

// POST /api/pros/assignments/:assignmentId/orders/:orderId/tracking/status
prosRouter.post('/assignments/:assignmentId/orders/:orderId/tracking/status', async (req, res) => {
  try {
    const assignmentId = req.params.assignmentId;
    const orderId = req.params.orderId;

    const trackingNumber = typeof req.body?.trackingNumber === 'string' ? req.body.trackingNumber.trim() : '';
    if (!trackingNumber) {
      return res.status(422).json({ success: false, message: 'trackingNumber is required' });
    }

    const upstreamUrl = `${PROS_API_BASE_URL}/api/assignments/${encodeURIComponent(assignmentId)}/orders/${encodeURIComponent(orderId)}/tracking/status`;

    console.log('[PROS] tracking/status -> upstream POST', {
      upstreamUrl,
      assignmentId,
      orderId,
    });

    const upstreamResponse = await axios({
      method: 'POST',
      url: upstreamUrl,
      headers: {
        ...getForwardHeaders(req),
        'Content-Type': 'application/json',
      },
      data: { trackingNumber },
      timeout: 60000,
      validateStatus: () => true,
    });

    return res.status(upstreamResponse.status).json(upstreamResponse.data);
  } catch (err: any) {
    const status = err?.response?.status || 502;
    const upstreamData = err?.response?.data;
    const code = err?.code || null;
    const message = err?.message || 'Failed to call PROS API';

    console.error('[PROS] tracking/status upstream error', { status, code, message, upstreamData });

    return res.status(status).json({
      success: false,
      message,
      code,
      upstreamStatus: err?.response?.status ?? null,
      upstream: upstreamData ?? null,
    });
  }
});

// POST /api/pros/assignments/:assignmentId/models/parts/search-substitute
prosRouter.post('/assignments/:assignmentId/models/parts/search-substitute', async (req, res) => {
  try {
    const assignmentId = req.params.assignmentId;
    const parts = Array.isArray(req.body?.parts) ? req.body.parts : null;

    if (!parts || parts.length === 0) {
      return res.status(422).json({ success: false, message: 'parts array is required' });
    }

    const upstreamUrl = `${PROS_API_BASE_URL}/api/assignments/${encodeURIComponent(assignmentId)}/models/parts/search-substitute`;

    console.log('[PROS] models/parts/search-substitute -> upstream POST', {
      upstreamUrl,
      assignmentId,
      partsCount: parts.length,
    });

    const upstreamResponse = await axios({
      method: 'POST',
      url: upstreamUrl,
      headers: {
        ...getForwardHeaders(req),
        'Content-Type': 'application/json',
      },
      data: { parts },
      timeout: 60000,
      validateStatus: () => true,
    });

    return res.status(upstreamResponse.status).json(upstreamResponse.data);
  } catch (err: any) {
    const status = err?.response?.status || 502;
    const upstreamData = err?.response?.data;
    const code = err?.code || null;
    const message = err?.message || 'Failed to call PROS API';

    console.error('[PROS] models/parts/search-substitute upstream error', { status, code, message, upstreamData });

    return res.status(status).json({
      success: false,
      message,
      code,
      upstreamStatus: err?.response?.status ?? null,
      upstream: upstreamData ?? null,
    });
  }
});

// DELETE /api/pros/assignments/:assignmentId/orders/:orderId/parts/:partId
prosRouter.delete('/assignments/:assignmentId/orders/:orderId/parts/:partId', async (req, res) => {
  try {
    const assignmentId = req.params.assignmentId;
    const orderId = req.params.orderId;
    const partId = req.params.partId;

    const upstreamUrl = `${PROS_API_BASE_URL}/api/assignments/${encodeURIComponent(assignmentId)}/orders/${encodeURIComponent(orderId)}/parts/${encodeURIComponent(partId)}`;

    console.log('[PROS] orders/parts -> upstream DELETE', {
      upstreamUrl,
      assignmentId,
      orderId,
      partId,
    });

    const upstreamResponse = await axios({
      method: 'DELETE',
      url: upstreamUrl,
      headers: {
        ...getForwardHeaders(req),
      },
      timeout: 60000,
      validateStatus: () => true,
    });

    return res.status(upstreamResponse.status).json(upstreamResponse.data);
  } catch (err: any) {
    const status = err?.response?.status || 502;
    const upstreamData = err?.response?.data;
    const code = err?.code || null;
    const message = err?.message || 'Failed to call PROS API';

    console.error('[PROS] orders/parts upstream error', { status, code, message, upstreamData });

    return res.status(status).json({
      success: false,
      message,
      code,
      upstreamStatus: err?.response?.status ?? null,
      upstream: upstreamData ?? null,
    });
  }
});

// GET /api/pros/assignments/:assignmentId/orders/:orderId/tracking/part-order-details
prosRouter.get('/assignments/:assignmentId/orders/:orderId/tracking/part-order-details', async (req, res) => {
  try {
    const assignmentId = req.params.assignmentId;
    const orderId = req.params.orderId;

    const upstreamUrl = `${PROS_API_BASE_URL}/api/assignments/${encodeURIComponent(assignmentId)}/orders/${encodeURIComponent(orderId)}/tracking/part-order-details`;

    console.log('[PROS] tracking/part-order-details -> upstream GET', {
      upstreamUrl,
      assignmentId,
      orderId,
    });

    const upstreamResponse = await axios({
      method: 'GET',
      url: upstreamUrl,
      headers: {
        ...getForwardHeaders(req),
      },
      timeout: 60000,
      validateStatus: () => true,
    });

    return res.status(upstreamResponse.status).json(upstreamResponse.data);
  } catch (err: any) {
    const status = err?.response?.status || 502;
    const upstreamData = err?.response?.data;
    const code = err?.code || null;
    const message = err?.message || 'Failed to call PROS API';

    console.error('[PROS] tracking/part-order-details upstream error', { status, code, message, upstreamData });

    return res.status(status).json({
      success: false,
      message,
      code,
      upstreamStatus: err?.response?.status ?? null,
      upstream: upstreamData ?? null,
    });
  }
});
