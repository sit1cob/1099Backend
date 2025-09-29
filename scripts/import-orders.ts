import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import XLSX from 'xlsx';
import { connectMongo, disconnectMongo } from '../src/mongo/connection';
import { OrderModel } from '../src/models/order';

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

  const docs = rows.map((row) => {
    const soNumber = pickFirst<string>(row, ['SO_NO', 'so_number', 'SO#', 'SO', 'SO Number']);
    const serviceUnitNumber = pickFirst<string>(row, ['SVC_UN_NO', 'service_unit_number']);
    const vendorName = pickFirst<string>(row, ['VENDOR', 'Vendor', 'vendor']);
    const customerCity = pickFirst<string>(row, ['CUS_CTY_NM', 'customer_city', 'City']);
    const customerState = pickFirst<string>(row, ['CUS_ST_CD', 'customer_state', 'State']);
    const customerZip = pickFirst<string>(row, ['ZIP_CD', 'CN_ZIP_PC', 'customer_zip', 'Zip']);
    const scheduledDateRaw = pickFirst<any>(row, ['SVC_SCH_DT', 'scheduled_date', 'Scheduled Date']);

    return {
      raw: row,
      soNumber,
      serviceUnitNumber,
      vendorName,
      customerCity,
      customerState,
      customerZip,
      scheduledDate: parseDate(scheduledDateRaw),
      sourceFile: path.basename(inputFile),
      importedAt: new Date(),
    };
  });

  for (const doc of docs) {
    if (doc.soNumber) {
      await OrderModel.updateOne(
        { soNumber: doc.soNumber },
        { $set: doc, $setOnInsert: { createdAt: new Date() } },
        { upsert: true }
      );
    } else {
      await OrderModel.create(doc);
    }
  }

  await disconnectMongo();
  console.log(`Imported ${docs.length} orders from ${path.basename(inputFile)}`);
}

main().catch(async (err) => {
  console.error('Import failed:', err);
  try { await disconnectMongo(); } catch {}
  process.exit(1);
});
