import 'dotenv/config';
import { connectMongo, disconnectMongo } from '../src/mongo/connection';
import { VendorModel } from '../src/models/vendor';
import { UserModel } from '../src/models/user';
import { password } from '../src/utils/password';

async function main() {
  await connectMongo();

  const vendorName = process.env.SEED_VENDOR_NAME || 'AIJ_Appliances';
  const username = process.env.SEED_USERNAME || 'AIJ_Appliances';
  const plainPassword = process.env.SEED_PASSWORD || 'password123';

  let vendor = await VendorModel.findOne({ name: vendorName });
  if (!vendor) {
    vendor = await VendorModel.create({ name: vendorName, isActive: true });
    console.log('Created vendor:', vendor.name, vendor._id.toString());
  } else {
    console.log('Vendor exists:', vendor.name, vendor._id.toString());
  }

  const pwdHash = await password.hash(plainPassword);

  let user = await UserModel.findOne({ username });
  if (!user) {
    user = await UserModel.create({
      username,
      passwordHash: pwdHash,
      role: 'registered_user',
      vendorId: vendor._id,
      isActive: true,
    });
    console.log('Created user:', user.username, user._id.toString());
  } else {
    await UserModel.updateOne({ _id: user._id }, { $set: { passwordHash: pwdHash, vendorId: vendor._id, isActive: true } });
    console.log('Updated user password/vendor:', user.username, user._id.toString());
  }

  await disconnectMongo();
  console.log('Seed complete.');
}

main().catch(async (err) => {
  console.error('Seed failed:', err);
  try { await disconnectMongo(); } catch {}
  process.exit(1);
});
