#!/usr/bin/env node
/*
Usage examples:
  node scripts/import-local.cjs --file "/path/to/2025-09-25 2_35pm.csv" --collection jobs --mongo "<MONGO_URL>" --db TechHub1099db
  MONGO_URL="<MONGO_URL>" MONGO_DB=TechHub1099db node scripts/import-local.cjs --file "/path/to/file.xlsx" --collection orders

Notes:
- Works from any machine with Node >=16.
- Reads CSV/XLS/XLSX using `xlsx`.
- Upserts by `soNumber` when present; otherwise inserts.
- Collections supported: `jobs` or `orders`.
*/

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const XLSX = require('xlsx');
const { MongoClient } = require('mongodb');

// Load .env if present (optional)
try { dotenv.config(); } catch {}

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.replace(/^--/, '');
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      args[key] = val;
    }
  }
  return args;
}

function parseDate(v) {
  if (!v) return undefined;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d;
}

function pickFirst(row, keys) {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && row[k] !== '') return row[k];
  }
  return undefined;
}

async function main() {
  const args = parseArgs(process.argv);
  const inputFile = args.file ? path.resolve(args.file) : null;
  const collectionName = (args.collection || '').toLowerCase();
  const mongoUrl = args.mongo || process.env.MONGO_URL;
  const dbName = args.db || process.env.MONGO_DB;

  if (!inputFile || !fs.existsSync(inputFile)) {
    console.error('Source file not found or not provided. Pass with --file "/absolute/path/to/file.csv"');
    process.exit(1);
  }
  if (!mongoUrl) {
    console.error('Missing Mongo URL. Pass with --mongo "<connection-string>" or set MONGO_URL env');
    process.exit(1);
  }
  if (!dbName) {
    console.error('Missing database name. Pass with --db <dbName> or set MONGO_DB env');
    process.exit(1);
  }
  if (!['jobs', 'orders'].includes(collectionName)) {
    console.error('Invalid or missing --collection. Use "jobs" or "orders"');
    process.exit(1);
  }

  const wb = XLSX.readFile(inputFile, { raw: false });
  const sheet = wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { defval: '' });

  const client = new MongoClient(mongoUrl, { ignoreUndefined: true });
  await client.connect();
  const db = client.db(dbName);
  const col = db.collection(collectionName);

  let count = 0;
  for (const row of rows) {
    const soNumber = pickFirst(row, ['SO_NO', 'so_number', 'SO#', 'SO', 'SO Number']);
    const serviceUnitNumber = pickFirst(row, ['SVC_UN_NO', 'service_unit_number']);
    const vendorName = pickFirst(row, ['VENDOR', 'Vendor', 'vendor']);
    const customerCity = pickFirst(row, ['CUS_CTY_NM', 'customer_city', 'City']);
    const customerState = pickFirst(row, ['CUS_ST_CD', 'customer_state', 'State']);
    const customerZip = pickFirst(row, ['ZIP_CD', 'CN_ZIP_PC', 'customer_zip', 'Zip']);
    const scheduledDateRaw = pickFirst(row, ['SVC_SCH_DT', 'scheduled_date', 'Scheduled Date']);

    // Additional fields useful for jobs
    const customerName = pickFirst(row, ['Customer Name', 'CUS_NM', 'customer_name']);
    const customerAddress = pickFirst(row, ['Address', 'CUS_ADDR', 'customer_address']);
    const customerPhone = pickFirst(row, ['Phone', 'CUS_PH_NO', 'customer_phone']);
    const applianceType = pickFirst(row, ['Appliance Type', 'APPL_TYP']);
    const manufacturerBrand = pickFirst(row, ['Brand', 'MFR_BRND']);
    const serviceDescription = pickFirst(row, ['Problem Description', 'SVC_DESC']);

    const baseDoc = {
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

    const jobExtras = {
      customerName,
      customerAddress,
      customerPhone,
      applianceType,
      manufacturerBrand,
      serviceDescription,
    };

    const doc = collectionName === 'jobs' ? { ...baseDoc, ...jobExtras } : baseDoc;

    if (soNumber) {
      await col.updateOne(
        { soNumber },
        { $set: doc, $setOnInsert: { createdAt: new Date() } },
        { upsert: true }
      );
    } else {
      await col.insertOne(doc);
    }
    count++;
  }

  await client.close();
  console.log(`Imported/Upserted ${count} records into '${collectionName}' from ${path.basename(inputFile)}`);
}

main().catch(async (err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
