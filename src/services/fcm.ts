import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

let initialized = false;

function initIfNeeded() {
  if (initialized) return;
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const svcPathRaw = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!json && !svcPathRaw) {
    console.warn('[FCM] Skipping initialization: no FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH provided');
    return;
  }
  try {
    const credentials = json
      ? JSON.parse(json)
      : (() => {
          // Normalize path (trim whitespace and surrounding quotes)
          const cleaned = (svcPathRaw || '').trim().replace(/^['"]|['"]$/g, '');
          const resolved = path.isAbsolute(cleaned) ? cleaned : path.resolve(process.cwd(), cleaned);
          if (!fs.existsSync(resolved)) {
            console.error('[FCM] Service account file not found', { provided: svcPathRaw, cleaned, cwd: process.cwd(), resolved });
            throw new Error('Service account file not found at ' + resolved);
          } else {
            console.log('[FCM] Using service account file', { provided: svcPathRaw, resolved });
          }
          const raw = fs.readFileSync(resolved, 'utf8');
          return JSON.parse(raw);
        })();
    admin.initializeApp({
      credential: admin.credential.cert(credentials as admin.ServiceAccount),
    });
    initialized = true;
    console.log('[FCM] Initialized');
  } catch (err) {
    console.error('[FCM] Initialization failed:', err);
  }
}

// Heuristic to filter obviously invalid FCM tokens (useful in local/dev)
export function isLikelyValidFcmToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const t = token.trim();
  // Typical FCM tokens are long, often contain a colon and an "APA91" segment
  return t.length > 80 && t.includes(':') && t.toUpperCase().includes('APA91');
}

export async function sendMulticast(tokens: string[], payload: { title: string; body: string; data?: Record<string, string> }) {
  initIfNeeded();
  if (!tokens || tokens.length === 0) return { successCount: 0, failureCount: 0 };

  // Filter tokens to likely valid ones
  const validTokens = tokens.filter(isLikelyValidFcmToken);
  const skippedInvalid = tokens.length - validTokens.length;
  if (validTokens.length === 0) {
    console.log('[FCM] No valid tokens after filtering; skipping send', { tokensTotal: tokens.length, skippedInvalid });
    return { successCount: 0, failureCount: 0 };
  }

  if (!initialized) {
    console.warn('[FCM] Not initialized; skipping send (dev mode). Set FIREBASE_SERVICE_ACCOUNT_* to enable.');
    return { successCount: 0, failureCount: 0 };
  }

  const message: admin.messaging.MulticastMessage = {
    tokens: validTokens,
    notification: { title: payload.title, body: payload.body },
    data: payload.data || {},
  };

  const preview = validTokens.slice(0, 5);
  console.log('[FCM] sendMulticast start', {
    tokensTotal: validTokens.length,
    tokensPreview: preview,
    title: payload.title,
    body: payload.body,
    data: payload.data || {},
    skippedInvalid,
  });

  const res = await admin.messaging().sendEachForMulticast(message);

  // Summarize failures by error code
  const debug = String(process.env.LOG_FCM_DEBUG || '').toLowerCase() === 'true';
  const failuresByCode: Record<string, number> = {};
  const sampleErrors: Array<{ idx: number; code?: string; message?: string }> = [];
  res.responses.forEach((r, idx) => {
    if (!r.success) {
      const code = (r.error as any)?.errorInfo?.code || (r.error as any)?.code || 'unknown';
      failuresByCode[code] = (failuresByCode[code] || 0) + 1;
      if (sampleErrors.length < 5) {
        sampleErrors.push({ idx, code, message: (r.error as any)?.message });
      }
    }
  });

  console.log('[FCM] sendMulticast done', {
    successCount: res.successCount,
    failureCount: res.failureCount,
    failuresByCode,
    sampleErrors,
    skippedInvalid,
  });

  if (debug) {
    // Verbose per-token logging
    res.responses.forEach((r, idx) => {
      if (r.success) {
        console.log(`[FCM][OK] idx=${idx}`);
      } else {
        const code = (r.error as any)?.errorInfo?.code || (r.error as any)?.code || 'unknown';
        console.warn(`[FCM][ERR] idx=${idx} code=${code} message=${(r.error as any)?.message}`);
      }
    });
  }

  return { successCount: res.successCount, failureCount: res.failureCount, responses: res.responses };
}

export function chunk<T>(arr: T[], size = 500): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
