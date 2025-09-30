import mongoose from 'mongoose';
import { JobModel } from '../models/job';
import { UserModel } from '../models/user';
import { sendMulticast, chunk } from './fcm';

let running = false;
let changeStream: mongoose.mongo.ChangeStream | null = null;

export async function startJobWatcher() {
  if (running) return;
  running = true;

  // Guard: Change Streams require a replica set (Atlas OK). If not available, exit gracefully.
  const connection = mongoose.connection;
  const topology = (connection as any).client?.topology;
  if (!topology || typeof topology.capabilities !== 'function' || !topology.capabilities()?.hasSessions) {
    console.warn('[JobWatcher] Mongo topology does not support change streams (no sessions). Skipping watcher.');
    return;
  }

  console.log('[JobWatcher] Starting change stream on jobs (insert only)');
  changeStream = JobModel.watch([{ $match: { operationType: 'insert' } }], { fullDocument: 'updateLookup' as any });

  changeStream.on('change', async (event: any) => {
    try {
      const doc = event.fullDocument || {};
      const soNumber = doc.soNumber;
      const city = doc.customerCity;
      const vendorName = doc.vendorName;

      // collect unique FCM tokens
      const users = await UserModel.find({ fcmTokens: { $exists: true, $ne: [] } }).select('fcmTokens').lean();
      const tokenSet = new Set<string>();
      for (const u of users as any[]) {
        for (const t of (u.fcmTokens || []) as string[]) {
          if (t) tokenSet.add(t);
        }
      }
      const tokens = Array.from(tokenSet);

      const title = 'New job created';
      const body = vendorName ? `${vendorName}: ${soNumber || 'SO'} in ${city || 'your area'}` : `Job ${soNumber || ''} added`;
      const data = { type: 'new_job', soNumber: String(soNumber || ''), city: String(city || '') } as any;

      const previewTokens = tokens.slice(0, 5);
      console.log('[JobWatcher] Preparing notification', {
        tokensTotal: tokens.length,
        tokensPreview: previewTokens,
        message: { title, body, data },
      });
      // Print all FCM tokens as requested
      console.log('[JobWatcher] All FCM tokens:', tokens);

      let success = 0, failure = 0, batches = 0;
      for (const batch of chunk(tokens, 500)) {
        batches += 1;
        console.log(`[JobWatcher] Sending batch ${batches} size=${batch.length}`);
        const res = await sendMulticast(batch, { title, body, data });
        console.log(`[JobWatcher] Batch ${batches} result`, { successCount: res.successCount, failureCount: res.failureCount });
        success += res.successCount || 0;
        failure += res.failureCount || 0;
      }
      console.log(`[JobWatcher] Notification summary tokens=${tokens.length}, batches=${batches}, success=${success}, failure=${failure}`);
    } catch (err) {
      console.error('[JobWatcher] Notification error:', err);
    }
  });

  changeStream.on('error', (err) => {
    console.error('[JobWatcher] Change stream error:', err);
  });
}

export async function stopJobWatcher() {
  running = false;
  try {
    await changeStream?.close();
  } catch {}
  changeStream = null;
}
