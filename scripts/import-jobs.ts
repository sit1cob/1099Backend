import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import XLSX from 'xlsx';
import { connectMongo, disconnectMongo } from '../src/mongo/connection';
import { JobModel } from '../src/models/job';
import { UserModel } from '../src/models/user';
import { sendMulticast, chunk } from '../src/services/fcm';

const DEFAULT_FILE = path.join(process.cwd(), '..', 'docs', '2025-09-25 2_35pm.csv');

function parseDate(v: any): Date | undefined {
  if (!v) return undefined;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d;
}

function pickFirst<T = any>(row: Record<string, any>, keys: string[]): T | undefined {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && row[k] !== '') return row[k] as T;
  }
  return undefined;
}

async function main() {
  const inputFile = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_FILE;
  if (!fs.existsSync(inputFile)) {
    console.error(`Source file not found: ${inputFile}`);
    process.exit(1);
  }

  await connectMongo();

  const wb = XLSX.readFile(inputFile, { raw: false });
  const sheet = wb.SheetNames[0];
  const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { defval: '' });

  const notify = process.argv.includes('--notify');
  let count = 0;
  const newlyCreatedJobSummaries: { soNumber?: string; customerCity?: string; vendorName?: string }[] = [];
  for (const row of rows) {
    const soNumber = pickFirst<string>(row, ['SO_NO', 'so_number', 'SO#', 'SO', 'SO Number']);
    const serviceUnitNumber = pickFirst<string>(row, ['SVC_UN_NO', 'service_unit_number']);
    const vendorName = pickFirst<string>(row, ['VENDOR', 'Vendor', 'vendor']);
    const customerCity = pickFirst<string>(row, ['CUS_CTY_NM', 'customer_city', 'City']);
    const customerState = pickFirst<string>(row, ['CUS_ST_CD', 'customer_state', 'State']);
    const customerZip = pickFirst<string>(row, ['ZIP_CD', 'CN_ZIP_PC', 'customer_zip', 'Zip']);
    const scheduledDateRaw = pickFirst<any>(row, ['SVC_SCH_DT', 'scheduled_date', 'Scheduled Date']);
    const customerName = pickFirst<string>(row, ['Customer Name', 'CUS_NM', 'customer_name']);
    const customerAddress = pickFirst<string>(row, ['Address', 'CUS_ADDR', 'customer_address']);
    const customerPhone = pickFirst<string>(row, ['Phone', 'CUS_PH_NO', 'customer_phone']);
    const applianceType = pickFirst<string>(row, ['Appliance Type', 'APPL_TYP']);
    const manufacturerBrand = pickFirst<string>(row, ['Brand', 'MFR_BRND']);
    const serviceDescription = pickFirst<string>(row, ['Problem Description', 'SVC_DESC']);

    const doc = {
      soNumber,
      serviceUnitNumber,
      vendorName,
      customerCity,
      customerState,
      customerZip,
      scheduledDate: parseDate(scheduledDateRaw),
      customerName,
      customerAddress,
      customerPhone,
      applianceType,
      manufacturerBrand,
      serviceDescription,
    } as any;

    if (!soNumber) {
      await JobModel.create(doc);
      count++;
      continue;
    }

    const res = await JobModel.updateOne(
      { soNumber },
      { $set: doc, $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    );
    if (notify && res.upsertedCount && res.upsertedCount > 0) {
      newlyCreatedJobSummaries.push({ soNumber, customerCity, vendorName });
    }
    count++;
  }

  await disconnectMongo();
  console.log(`Imported/Upserted ${count} jobs from ${path.basename(inputFile)} into 'jobs' collection`);

  if (notify && newlyCreatedJobSummaries.length > 0) {
    // Fetch unique FCM tokens
    const users = await UserModel.find({ fcmTokens: { $exists: true, $ne: [] } }).select('fcmTokens').lean();
    const tokenSet = new Set<string>();
    for (const u of users as any[]) {
      for (const t of (u.fcmTokens || []) as string[]) {
        if (t) tokenSet.add(t);
      }
    }
    const tokens = Array.from(tokenSet);

    const title = 'New jobs available';
    const body = `${newlyCreatedJobSummaries.length} new job(s) added`;
    let success = 0, failure = 0;
    for (const batch of chunk(tokens, 500)) {
      const res = await sendMulticast(batch, { title, body, data: { type: 'new_jobs' } });
      success += res.successCount || 0;
      failure += res.failureCount || 0;
    }
    console.log(`[FCM] Sent notifications: success=${success}, failure=${failure}, recipients=${tokens.length}`);
  }
}

main().catch(async (err) => {
  console.error('Import jobs failed:', err);
  try { await disconnectMongo(); } catch {}
  process.exit(1);
});
