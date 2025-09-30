import admin from 'firebase-admin';

let initialized = false;

function initIfNeeded() {
  if (initialized) return;
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!json && !path) {
    console.warn('[FCM] Skipping initialization: no FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH provided');
    return;
  }
  try {
    const credentials = json ? JSON.parse(json) : require(path!);
    admin.initializeApp({
      credential: admin.credential.cert(credentials as admin.ServiceAccount),
    });
    initialized = true;
    console.log('[FCM] Initialized');
  } catch (err) {
    console.error('[FCM] Initialization failed:', err);
  }
}

export async function sendMulticast(tokens: string[], payload: { title: string; body: string; data?: Record<string, string> }) {
  initIfNeeded();
  if (!initialized) {
    console.warn('[FCM] Not initialized; skipping send');
    return { successCount: 0, failureCount: tokens.length };
  }
  if (!tokens || tokens.length === 0) return { successCount: 0, failureCount: 0 };

  const message: admin.messaging.MulticastMessage = {
    tokens,
    notification: { title: payload.title, body: payload.body },
    data: payload.data || {},
  };

  const preview = tokens.slice(0, 5);
  console.log('[FCM] sendMulticast start', {
    tokensTotal: tokens.length,
    tokensPreview: preview,
    title: payload.title,
    body: payload.body,
    data: payload.data || {},
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
