import mongoose from 'mongoose';
import User from '../models/User.js';
import AppliesTo from '../models/AppliesTo.js';
import PaymentMethod from '../models/PaymentMethod.js';
import connectDB from '../config/db.js';

/*
 * Startup bootstrap — creates only what the app cannot work without. It never
 * creates demo or sample records: classes, students, fees and everything else
 * are entered by the school through the app and live only in the database.
 *
 *  1. The "All Fees" category sibling-discount rules attach to (there is no
 *     screen to create it, and the Parents page needs it to add a rule).
 *  2. A first admin login, but only when the database has no admin at all,
 *     so a fresh install can be signed into. Set ADMIN_EMAIL and
 *     ADMIN_PASSWORD; in development they default to admin@gmail.com / admin.
 *     Existing accounts are never modified.
 *  3. A "Cash" payment method when there is none, so fees can be collected
 *     on day one (more can be added under Fees & Payments → Setup).
 */

const DEV_ADMIN = { email: 'admin@gmail.com', password: 'admin' };

// Indexes left behind by older schemas that now break inserts.
const dropStaleIndexes = async () => {
  const stale = { users: ['user_name_1', 'userId_1', 'username_1'], students: ['admission_no_1'], guardians: ['p_no_1'], subjects: ['code_1'] };
  for (const [collection, names] of Object.entries(stale)) {
    for (const name of names) {
      await mongoose.connection.db.collection(collection).dropIndex(name).catch(() => {});
    }
  }
};

const ensureFirstAdmin = async () => {
  if (await User.exists({ role: 'admin' })) return null;

  const isProduction = process.env.NODE_ENV === 'production';
  const email = process.env.ADMIN_EMAIL || (isProduction ? null : DEV_ADMIN.email);
  const password = process.env.ADMIN_PASSWORD || (isProduction ? null : DEV_ADMIN.password);
  if (!email || !password) {
    console.error('No admin account exists. Set ADMIN_EMAIL and ADMIN_PASSWORD and restart to create one.');
    return null;
  }
  if (isProduction && password.length < 8) {
    console.error('ADMIN_PASSWORD must be at least 8 characters in production; no admin was created.');
    return null;
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    console.error(`No admin exists, but ${email} is already used by a ${existing.role} account; set a different ADMIN_EMAIL.`);
    return null;
  }

  await User.create({ firstName: 'System', lastName: 'Admin', email, password, role: 'admin' });
  console.log(`Created the first admin account: ${email}${process.env.ADMIN_PASSWORD ? '' : ' (default dev password — change it after signing in)'}`);
  return email;
};

export const bootstrap = async () => {
  await dropStaleIndexes();
  await AppliesTo.findOneAndUpdate(
    { applies_to_id: 'AT-ALL' },
    { $setOnInsert: { applies_to_id: 'AT-ALL', applies_to_name: 'All Fees', description: 'Applies to every fee type' } },
    { upsert: true }
  );
  await ensureFirstAdmin();
  if (!(await PaymentMethod.exists({}))) {
    await PaymentMethod.create({ payment_method_no: 'PM-CASH', payment_method_name: 'Cash' }).catch(() => {});
  }
};

// Allow running this script directly:  node src/seed/bootstrap.js
if (process.argv[1] && process.argv[1].endsWith('bootstrap.js')) {
  (async () => {
    const connected = await connectDB();
    if (!connected) process.exit(1);
    try {
      await bootstrap();
    } catch (err) {
      console.error('Bootstrap failed:', err.message);
      process.exitCode = 1;
    }
    await mongoose.connection.close();
    process.exit(process.exitCode ?? 0);
  })();
}
