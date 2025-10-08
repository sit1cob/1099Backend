import axios from 'axios';
import { ExternalApiCacheModel } from '../models/externalApiCache';

const EXTERNAL_API_BASE_URL = 'https://48d99eca-33b7-4a28-9c21-b6eaa571ad6b-00-2397wpudnvwvi.picard.replit.dev';

export class ExternalApiAdapter {
  /**
   * Call external login API and cache the response
   */
  static async login(username: string, password: string, role?: string) {
    try {
      const requestData = { username, password, role: role || 'registered_user' };
      
      console.log('[ExternalApiAdapter] ========== EXTERNAL API REQUEST ==========');
      console.log('[ExternalApiAdapter] URL:', `${EXTERNAL_API_BASE_URL}/api/auth/login`);
      console.log('[ExternalApiAdapter] Method: POST');
      console.log('[ExternalApiAdapter] Request Body:', JSON.stringify(requestData, null, 2));
      
      // Call external API
      const response = await axios.post(`${EXTERNAL_API_BASE_URL}/api/auth/login`, requestData, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      });

      console.log('[ExternalApiAdapter] ========== EXTERNAL API RESPONSE ==========');
      console.log('[ExternalApiAdapter] Status:', response.status);
      console.log('[ExternalApiAdapter] Headers:', JSON.stringify(response.headers, null, 2));
      console.log('[ExternalApiAdapter] Response Body:', JSON.stringify(response.data, null, 2));
      console.log('[ExternalApiAdapter] ================================================');

      const externalResponse = response.data;

      // Extract token and user info from external response
      const externalToken = externalResponse?.data?.accessToken;
      const externalUser = externalResponse?.data?.user;

      // Cache the response in MongoDB
      await ExternalApiCacheModel.create({
        endpoint: 'login',
        userId: externalUser?.id,
        username: externalUser?.username || username,
        requestData,
        externalResponse,
        mappedResponse: externalResponse, // For now, return as-is
        externalToken,
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
      });

      console.log('[ExternalApiAdapter] Login response cached for user:', username);

      // Return the external response as-is
      return externalResponse;
    } catch (error: any) {
      console.error('[ExternalApiAdapter] ========== EXTERNAL API ERROR ==========');
      console.error('[ExternalApiAdapter] Error Message:', error.message);
      if (error.response) {
        console.error('[ExternalApiAdapter] Error Status:', error.response.status);
        console.error('[ExternalApiAdapter] Error Response:', JSON.stringify(error.response.data, null, 2));
      }
      console.error('[ExternalApiAdapter] ================================================');
      throw new Error(error.response?.data?.message || 'External API login failed');
    }
  }

  /**
   * Get cached login data for a user
   */
  static async getCachedLogin(username: string) {
    try {
      const cached = await ExternalApiCacheModel.findOne({
        endpoint: 'login',
        username,
        expiresAt: { $gt: new Date() },
      })
        .sort({ createdAt: -1 })
        .lean();

      return cached?.externalResponse || null;
    } catch (error) {
      console.error('[ExternalApiAdapter] Failed to get cached login:', error);
      return null;
    }
  }

  /**
   * Call external API with token
   */
  static async callExternalApi(endpoint: string, token: string, method: string = 'GET', data?: any) {
    try {
      const url = `${EXTERNAL_API_BASE_URL}${endpoint}`;
      const config: any = {
        method,
        url,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      };

      if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        config.data = data;
      }

      const response = await axios(config);
      return response.data;
    } catch (error: any) {
      console.error('[ExternalApiAdapter] API call failed:', error.message);
      throw new Error(error.response?.data?.message || 'External API call failed');
    }
  }

  /**
   * Map external API response to our format (for future use)
   */
  static mapToOurFormat(externalData: any, endpoint: string): any {
    // TODO: Implement mapping logic based on endpoint
    // For now, return as-is
    return externalData;
  }
}
