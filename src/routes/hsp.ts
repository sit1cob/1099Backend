import { Router } from 'express';
import axios from 'axios';

export const hspRouter = Router();

const HSP_API_BASE_URL =
  process.env.HSP_API_BASE_URL || 'https://hspws-api-gateway.prod.nextgen.shs.com';

hspRouter.post('/part-orders/search', async (req, res) => {
  try {
    const authHeader = typeof req.headers.authorization === 'string' ? req.headers.authorization : '';
    const headerToken = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : '';
    const envToken = process.env.HSP_BEARER_TOKEN || '';
    const token = headerToken || envToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Missing token. Provide Authorization: Bearer <token> header or configure HSP_BEARER_TOKEN',
      });
    }

    const clientId = typeof req.body?.clientId === 'string' ? req.body.clientId.trim() : '';
    const unitNumber = typeof req.body?.unitNumber === 'string' ? req.body.unitNumber.trim() : '';
    const serviceOrderNumber = typeof req.body?.serviceOrderNumber === 'string' ? req.body.serviceOrderNumber.trim() : '';

    if (!clientId || !unitNumber || !serviceOrderNumber) {
      return res.status(422).json({
        success: false,
        message: 'clientId, unitNumber, and serviceOrderNumber are required',
      });
    }

    const upstreamResponse = await axios({
      method: 'POST',
      url: `${HSP_API_BASE_URL}/v1/api/HSPRTPartOrderService/rest/searchPartOrderDetailsList`,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      data: {
        clientId,
        unitNumber,
        serviceOrderNumber,
      },
      timeout: 30000,
    });

    return res.status(upstreamResponse.status).json(upstreamResponse.data);
  } catch (err: any) {
    const status = err?.response?.status || 502;
    const data = err?.response?.data;
    const message = err?.message || 'Failed to call HSP API';
    return res.status(status).json({ success: false, message, upstream: data ?? null });
  }
});
