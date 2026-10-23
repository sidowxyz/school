// Wipes the database in MONGODB_URI so the school can start entering its own
// data from a clean slate (e.g. to remove demo records left by older versions
// that seeded sample data). On the next server start, the bootstrap creates
// the first admin login again — nothing else.
//
// Usage:  npm run db:reset -- --yes
//
// Refuses to run when NODE_ENV=production.
import mongoose from 'mongoose';
import connectDB from '../src/config/db.js';

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to reset a production database.');
  process.exit(1);
}
if (!process.argv.includes('--yes')) {
  console.error('This deletes EVERY record in the database. Re-run with --yes to confirm:  npm run db:reset -- --yes');
  process.exit(1);
}

const connected = await connectDB();
if (!connected) process.exit(1);

const name = mongoose.connection.name;
await mongoose.connection.dropDatabase();
console.log(`Database "${name}" was reset. Restart the server to create the first admin login.`);
await mongoose.connection.close();
process.exit(0);
