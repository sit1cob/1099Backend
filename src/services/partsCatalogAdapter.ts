import axios from 'axios';

type HssomTokenResponse = {
  CorrelationId?: string;
  ResponseCode?: string;
  ResponseMessage?: string;
  token?: string;
  tokenLife?: number;
};

type CachedToken = {
  token: string;
  expiresAtMs: number;
};

type CredentialOverrides = {
  hssomBasicAuth?: string;
  hssomToken?: string;
  partsApiKey?: string;
};

let cachedToken: CachedToken | null = null;
let inflightTokenPromise: Promise<string> | null = null;

function nowMs() {
  return Date.now();
}

export class PartsCatalogAdapter {
  static getHssomAuthUrl() {
    return (
      process.env.HSSOM_AUTH_URL ||
      'https://hssom-api-gateway.prod.nextgen.shs.com/v1/api/HSSOMAuthService/services/auth/token'
    );
  }

  static getHssomBasicAuthHeader(override?: string) {
    const basic = override ?? process.env.HSSOM_BASIC_AUTH;
    if (!basic) {
      throw new Error('Missing env var HSSOM_BASIC_AUTH');
    }
    return basic.startsWith('Basic ') ? basic : `Basic ${basic}`;
  }

  static getPartsApiBaseUrl() {
    return process.env.PARTS_API_BASE_URL || 'https://api.shs-core.com';
  }

  static getPartsApiKey(override?: string) {
    const apiKey = override ?? process.env.PARTS_APIKEY;
    if (!apiKey) {
      throw new Error('Missing env var PARTS_APIKEY');
    }
    return apiKey;
  }

  static async fetchHssomToken(
    overrides: Pick<CredentialOverrides, 'hssomBasicAuth'> = {}
  ): Promise<{ token: string; tokenLife?: number; raw: HssomTokenResponse }> {
    const url = PartsCatalogAdapter.getHssomAuthUrl();

    let response;
    try {
      response = await axios.request<HssomTokenResponse>({
        method: 'GET',
        url,
        headers: {
          Accept: 'application/json',
          Authorization: PartsCatalogAdapter.getHssomBasicAuthHeader(overrides.hssomBasicAuth),
        },
        timeout: 30000,
      });
    } catch (err: any) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const data = err.response?.data;
        const details = data != null ? JSON.stringify(data) : '';
        throw new Error(
          `HSSOM token request failed${status ? ` (${status})` : ''}${details ? `: ${details}` : ''}`
        );
      }
      throw err;
    }

    const data = response.data;
    const token = data?.token;

    if (!token) {
      throw new Error('HSSOM token response missing token');
    }

    return { token, tokenLife: data?.tokenLife, raw: data };
  }

  static async getValidToken(overrides: Pick<CredentialOverrides, 'hssomBasicAuth' | 'hssomToken'> = {}): Promise<string> {
    const safetyMs = 30_000;

    if (overrides.hssomToken && String(overrides.hssomToken).trim() !== '') {
      return String(overrides.hssomToken).trim();
    }

    if (cachedToken && cachedToken.expiresAtMs - safetyMs > nowMs()) {
      return cachedToken.token;
    }

    if (inflightTokenPromise) {
      return inflightTokenPromise;
    }

    inflightTokenPromise = (async () => {
      try {
        const { token, tokenLife } = await PartsCatalogAdapter.fetchHssomToken({
          hssomBasicAuth: overrides.hssomBasicAuth,
        });
        const tokenLifeSeconds = typeof tokenLife === 'number' && tokenLife > 0 ? tokenLife : 5400;

        cachedToken = {
          token,
          expiresAtMs: nowMs() + tokenLifeSeconds * 1000,
        };

        return token;
      } finally {
        inflightTokenPromise = null;
      }
    })();

    return inflightTokenPromise;
  }

  static async callPartsCatalogService<T = any>(
    methodName: string,
    query: Record<string, any> = {},
    overrides: CredentialOverrides = {}
  ): Promise<T> {
    const token = await PartsCatalogAdapter.getValidToken({
      hssomBasicAuth: overrides.hssomBasicAuth,
      hssomToken: overrides.hssomToken,
    });

    const url = `${PartsCatalogAdapter.getPartsApiBaseUrl()}/sis/proxy/PartsCatalogService/${methodName}`;

    const params: Record<string, any> = {
      ...query,
    };

    if (params.apikey == null || String(params.apikey).trim() === '') {
      params.apikey = PartsCatalogAdapter.getPartsApiKey(overrides.partsApiKey);
    }

    const response = await axios.request<T>({
      method: 'GET',
      url,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      params,
      timeout: 30000,
    });

    return response.data;
  }
}
