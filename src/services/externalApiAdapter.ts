import axios from 'axios';
import FormData from 'form-data';
import { ExternalApiCacheModel } from '../models/externalApiCache';

//const EXTERNAL_API_BASE_URL = 'https://48d99eca-33b7-4a28-9c21-b6eaa571ad6b-00-2397wpudnvwvi.picard.replit.dev';
const EXTERNAL_API_BASE_URL = 'https://shs-1099-job-board.replit.app';

// Export the base URL so routes can use it in logs
export const EXTERNAL_API_URL = EXTERNAL_API_BASE_URL;

export class ExternalApiAdapter {
  /**
   * Call external login API and cache the response
   */
  static async login(username: string, password: string, role?: string) {
    const url = `${EXTERNAL_API_BASE_URL}/api/auth/login`;
    
    try {
      const requestData = { username, password, role: role || 'registered_user' };
      
      console.log('[ExternalApiAdapter] ========== EXTERNAL API REQUEST ==========');
      console.log('[ExternalApiAdapter] URL:', url);
      console.log('[ExternalApiAdapter] Method: POST');
      console.log('[ExternalApiAdapter] Request Body:', JSON.stringify(requestData, null, 2));
      console.log('[ExternalApiAdapter] Timeout: 30000ms (30 seconds)');
      
      // Call external API with increased timeout
      const response = await axios.post(url, requestData, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000, // Increased from 10s to 30s
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
      console.error('[ExternalApiAdapter] ========== EXTERNAL API LOGIN FAILED ==========');
      console.error('[ExternalApiAdapter] Failed Request Details:');
      console.error('[ExternalApiAdapter]   Method: POST');
      console.error('[ExternalApiAdapter]   Endpoint: /api/auth/login');
      console.error('[ExternalApiAdapter]   Full URL:', url);
      console.error('[ExternalApiAdapter]   Username:', username);
      console.error('[ExternalApiAdapter] Error Details:');
      console.error('[ExternalApiAdapter]   Error Message:', error.message);
      console.error('[ExternalApiAdapter]   Error Code:', error.code);
      if (error.response) {
        console.error('[ExternalApiAdapter]   HTTP Status:', error.response.status);
        console.error('[ExternalApiAdapter]   Status Text:', error.response.statusText);
        console.error('[ExternalApiAdapter]   Response Data:', JSON.stringify(error.response.data, null, 2));
      } else if (error.request) {
        console.error('[ExternalApiAdapter]   No response received from server');
        console.error('[ExternalApiAdapter]   Possible causes: Network error, timeout, or server unreachable');
        console.error('[ExternalApiAdapter]   Request config:', JSON.stringify({
          url: error.config?.url,
          method: error.config?.method,
          timeout: error.config?.timeout,
        }, null, 2));
      }
      console.error('[ExternalApiAdapter] ================================================');
      throw new Error(error.response?.data?.message || error.message || 'External API login failed');
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
    const url = `${EXTERNAL_API_BASE_URL}${endpoint}`;
    
    try {
      const config: any = {
        method,
        url,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000, // Increased from 10s to 30s to handle slow Replit server
      };

      if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE')) {
        config.data = data;
      }

      const response = await axios(config);
      return response.data;
    } catch (error: any) {
      console.error('[ExternalApiAdapter] ========== EXTERNAL API CALL FAILED ==========');
      console.error('[ExternalApiAdapter] Failed Request Details:');
      console.error('[ExternalApiAdapter]   Method:', method);
      console.error('[ExternalApiAdapter]   Endpoint:', endpoint);
      console.error('[ExternalApiAdapter]   Full URL:', url);
      console.error('[ExternalApiAdapter]   Token (first 20 chars):', token.substring(0, 20) + '...');
      if (data) {
        console.error('[ExternalApiAdapter]   Request Body:', JSON.stringify(data, null, 2));
      }
      console.error('[ExternalApiAdapter] Error Details:');
      console.error('[ExternalApiAdapter]   Error Message:', error.message);
      if (error.response) {
        console.error('[ExternalApiAdapter]   HTTP Status:', error.response.status);
        console.error('[ExternalApiAdapter]   Status Text:', error.response.statusText);
        console.error('[ExternalApiAdapter]   Response Data:', JSON.stringify(error.response.data, null, 2));
      } else if (error.request) {
        console.error('[ExternalApiAdapter]   No response received from server');
        console.error('[ExternalApiAdapter]   Request timeout or network error');
      }
      console.error('[ExternalApiAdapter] ================================================');
      throw new Error(error.response?.data?.message || 'External API call failed');
    }
  }

  /**
   * Upload multipart/form-data to external API
   */
  static async uploadMultipartData(endpoint: string, token: string, formData: FormData) {
    const url = `${EXTERNAL_API_BASE_URL}${endpoint}`;
    
    try {
      console.log('[ExternalApiAdapter] ========== MULTIPART UPLOAD REQUEST ==========');
      console.log('[ExternalApiAdapter] URL:', url);
      console.log('[ExternalApiAdapter] Method: POST');
      console.log('[ExternalApiAdapter] Content-Type: multipart/form-data');
      console.log('[ExternalApiAdapter] Token (first 20 chars):', token.substring(0, 20) + '...');
      
      const response = await axios.post(url, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          ...formData.getHeaders(),
        },
        timeout: 60000, // 60 seconds for file uploads
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      console.log('[ExternalApiAdapter] ========== MULTIPART UPLOAD RESPONSE ==========');
      console.log('[ExternalApiAdapter] Status:', response.status);
      console.log('[ExternalApiAdapter] Response:', JSON.stringify(response.data, null, 2));
      console.log('[ExternalApiAdapter] ================================================');

      return response.data;
    } catch (error: any) {
      console.error('[ExternalApiAdapter] ========== MULTIPART UPLOAD FAILED ==========');
      console.error('[ExternalApiAdapter] Failed Request Details:');
      console.error('[ExternalApiAdapter]   Method: POST');
      console.error('[ExternalApiAdapter]   Endpoint:', endpoint);
      console.error('[ExternalApiAdapter]   Full URL:', url);
      console.error('[ExternalApiAdapter] Error Details:');
      console.error('[ExternalApiAdapter]   Error Message:', error.message);
      if (error.response) {
        console.error('[ExternalApiAdapter]   HTTP Status:', error.response.status);
        console.error('[ExternalApiAdapter]   Status Text:', error.response.statusText);
        console.error('[ExternalApiAdapter]   Response Data:', JSON.stringify(error.response.data, null, 2));
      } else if (error.request) {
        console.error('[ExternalApiAdapter]   No response received from server');
        console.error('[ExternalApiAdapter]   Request timeout or network error');
      }
      console.error('[ExternalApiAdapter] ================================================');
      throw new Error(error.response?.data?.message || 'Multipart upload failed');
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
