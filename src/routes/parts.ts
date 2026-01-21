import { Router } from 'express';
import type { Request } from 'express';
import axios from 'axios';
import { ExternalApiAdapter, EXTERNAL_API_URL } from '../services/externalApiAdapter';
import { PartsCatalogAdapter } from '../services/partsCatalogAdapter';

export const partsRouter = Router();

// POST /api/parts/auth/token - Public (fetches and caches HSSOM token)
partsRouter.post('/auth/token', async (_req, res) => {
  try {
    const { tokenLife, raw } = await PartsCatalogAdapter.fetchHssomToken();
    // Also warm the cache for subsequent calls
    await PartsCatalogAdapter.getValidToken();
    return res.json({ ...raw, tokenLife });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to fetch HSSOM token' });
  }
});

// GET /api/parts/models/search - Public (proxies to PartsCatalogService/modelSearch)
partsRouter.get('/models/search', async (req, res) => {
  try {
    const query = req.query as Record<string, any>;
    const data = await PartsCatalogAdapter.callPartsCatalogService('modelSearch', query);
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to search models' });
  }
});

// GET /api/parts/items/search - Public (proxies to PartsCatalogService/itemSearch)
partsRouter.get('/items/search', async (req, res) => {
  try {
    const query = req.query as Record<string, any>;
    const data = await PartsCatalogAdapter.callPartsCatalogService('itemSearch', query);
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to search parts' });
  }
});

// GET /api/parts/models/:modelId/details - Public (proxies to PartsCatalogService/getModelDetails)
partsRouter.get('/models/:modelId/details', async (req, res) => {
  try {
    const query = { ...(req.query as Record<string, any>), modelId: req.params.modelId };
    const data = await PartsCatalogAdapter.callPartsCatalogService('getModelDetails', query);
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to fetch model details' });
  }
});

// DELETE /api/parts/:id - NO AUTH (proxies to external API)
// Remove a part from the list
partsRouter.delete('/:id', async (req: Request, res) => {
  try {
    const { id } = req.params;
    
    console.log('[DeletePart] ========================================');
    console.log('[DeletePart] Calling EXTERNAL API:', `${EXTERNAL_API_URL}/api/parts/${id}`);
    console.log('[DeletePart] ========================================');

    // Get the token from request headers
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : '';

    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    try {
      // Call external API to delete the part
      const externalResponse = await ExternalApiAdapter.callExternalApi(
        `/api/parts/${id}`,
        token,
        'DELETE'
      );
      
      console.log('[DeletePart] ========== EXTERNAL API RESPONSE ==========');
      console.log('[DeletePart] Response:', JSON.stringify(externalResponse, null, 2));
      console.log('[DeletePart] ================================================');
      console.log('[DeletePart] ✓ Returning external API response');

      // Return external API response
      return res.json(externalResponse);
    } catch (extErr: any) {
      console.error('[DeletePart] ✗ External API call failed:', extErr.message);
      
      // Return the error from external API
      return res.status(500).json({ 
        success: false, 
        message: extErr.message || 'External API call failed' 
      });
    }
  } catch (err: any) {
    console.error('[DeletePart] Unexpected error:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Failed to delete part' });
  }
});

// POST /api/parts/search-sears - Public (mirrors legacy backend implementation)
partsRouter.post('/search-sears', async (req, res) => {
  try {
    const partNumberRaw = typeof req.body?.partNumber === 'string' ? req.body.partNumber.trim() : '';
    const modelNumberRaw = typeof req.body?.modelNumber === 'string' ? req.body.modelNumber.trim() : '';

    if (!partNumberRaw) {
      return res.status(422).json({
        success: false,
        message: 'Part number is required',
      });
    }

    const partNumber = partNumberRaw;
    const modelNumber = modelNumberRaw || null;
    const GRAPHQL_ENDPOINT = process.env.SEARS_GRAPHQL_ENDPOINT || 'https://catalog-staging.searspartsdirect.com/graphql';
    const GRAPHQL_API_KEY = process.env.SEARS_GRAPHQL_API_KEY || 'a3kbNXnE0P81WOl04J7xd5o82pm2f3LB5vscNPUA';

    console.log(`[Sears Parts API] Searching for part: ${partNumber}${modelNumber ? ` (model: ${modelNumber})` : ''}`);

    const query = `
      query PartSearch($q: String!) {
        partSearch(q: $q) {
          parts {
            id
            number
            title
            description
            pricing { sell }
            models { models { number title } }
          }
        }
      }
    `;

    let gqlResponse;
    try {
      gqlResponse = await axios.post(
        GRAPHQL_ENDPOINT,
        { query, variables: { q: partNumber } },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': GRAPHQL_API_KEY,
          },
          timeout: 30000,
        }
      );
    } catch (error: any) {
      const fallbackUrl = `https://www.searspartsdirect.com/search?q=${encodeURIComponent(partNumber)}`;
      const status = error?.response?.status;
      console.error(
        `[Sears Parts API] GraphQL request failed: ${status ?? 'unknown'} (Cloudflare blocking likely)`,
        error?.response?.data || error?.message
      );

      return res.json({
        success: false,
        message: 'Server-side requests are blocked by Cloudflare. Use client-side agent code to call the GraphQL API directly.',
        partNumber,
        modelNumber,
        fallbackUrl,
        note: 'Your agent code (fetchSearsPart) works perfectly because it runs client-side. Use that instead.',
        cloudflareBlocked: true,
      });
    }

    const data = gqlResponse?.data;
    let parts = data?.data?.partSearch?.parts ?? [];

    console.log(`[Sears Parts API] Found ${parts.length} results before filtering`);

    parts = parts.filter((part: any) => part?.number === partNumber);
    console.log(`[Sears Parts API] Found ${parts.length} exact matches for ${partNumber}`);

    if (modelNumber) {
      parts.sort((a: any, b: any) => {
        const aHit = (a?.models?.models ?? []).some((m: any) => m?.number === modelNumber);
        const bHit = (b?.models?.models ?? []).some((m: any) => m?.number === modelNumber);
        return Number(bHit) - Number(aHit);
      });
    }

    const topParts = parts.slice(0, 3);
    const formattedParts = topParts.map((part: any) => ({
      id: part?.id ?? null,
      number: part?.number ?? null,
      title: part?.title ?? null,
      price:
        typeof part?.pricing?.sell === 'number'
          ? part.pricing.sell
          : Number(part?.pricing?.sell ?? NaN) || null,
      models: (part?.models?.models ?? []).map((model: any) =>
        [model?.number ?? '', model?.title ?? ''].filter(Boolean).join(' — ')
      ),
      description: part?.description ?? null,
    }));

    const fallbackUrl = `https://www.searspartsdirect.com/search?q=${encodeURIComponent(partNumber)}`;

    return res.json({
      success: true,
      partNumber,
      modelNumber,
      count: formattedParts.length,
      parts: formattedParts,
      fallbackUrl,
      message:
        formattedParts.length > 0
          ? `Found ${formattedParts.length} matching part(s)`
          : `No exact matches found for ${partNumber}. Try the fallback URL.`,
    });
  } catch (err: any) {
    console.error('[Sears Parts API] Error:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Failed to search Sears parts' });
  }
});
