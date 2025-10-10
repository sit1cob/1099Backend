import { Router } from 'express';
import type { Request } from 'express';
import { ExternalApiAdapter } from '../services/externalApiAdapter';

export const partsRouter = Router();

// DELETE /api/parts/:id - NO AUTH (proxies to external API)
// Remove a part from the list
partsRouter.delete('/:id', async (req: Request, res) => {
  try {
    const { id } = req.params;
    
    console.log('[DeletePart] ========================================');
    console.log('[DeletePart] Deleting part:', id);
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
