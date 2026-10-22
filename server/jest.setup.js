import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Force this regardless of what jest.globalSetup.cjs already tried — that runs
// in a separate process whose process.env mutations don't reliably propagate
// to the per-test-file context under --experimental-vm-modules, and .env's own
// NODE_ENV=development (needed for `npm run dev`'s stack-trace behavior) would
// otherwise win here, making src/server.js's `if (NODE_ENV !== 'test')` guard
// think it's not a test run and call app.listen() on a port already in use.
process.env.NODE_ENV = 'test';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    let dbUri = process.env.MONGODB_URI;
    if (dbUri) {
      if (dbUri.startsWith("MONGODB_URI=")) {
        dbUri = dbUri.replace("MONGODB_URI=", "");
      }
      const parts = dbUri.split('?');
      let base = parts[0];
      const query = parts[1] ? `?${parts[1]}` : '';
      const protoIndex = base.indexOf('://');
      const slashIndex = base.lastIndexOf('/');

      if (slashIndex > protoIndex + 2) {
        base = base.substring(0, slashIndex) + '/SMS_Test';
      } else {
        base = base.endsWith('/') ? `${base}SMS_Test` : `${base}/SMS_Test`;
      }
      dbUri = base + query;
    }
    // If an Atlas URI is configured in the environment, prefer a local MongoDB
    // for CI/test runs to avoid SSL/network issues in ephemeral test runs.
    const usingAtlas = dbUri && (dbUri.includes('mongodb.net') || dbUri.startsWith('mongodb+srv:'));
    const target = (!dbUri || usingAtlas) ? 'mongodb://localhost:27017/SMS_Test' : dbUri;
    if (usingAtlas) {
      console.warn('jest.setup: MONGODB_URI points to Atlas — using local MongoDB for tests');
    }

    // Fail fast instead of sitting on mongoose's 30s default server selection.
    try {
      await mongoose.connect(target, { serverSelectionTimeoutMS: 8000 });
    } catch (error) {
      const host = target.replace(/\/\/[^@]*@/, '//<credentials>@');
      throw new Error(
        [
          `Could not reach the test database within 8s: ${error.message}`,
          `  URI: ${host}`
        ].join('\n')
      );
    }
  }

  // Ensure a clean database for each test run then run the auto-seed for reference data.
  try {
    await mongoose.connection.db.dropDatabase();
    console.log('jest.setup: dropped test database');
  } catch (e) {
    console.warn('jest.setup: could not drop test database', e.message);
  }



  // Drop stale indexes from users collection to avoid duplicate null errors on user creation
  try {
    const usersCol = mongoose.connection.db.collection('users');
    await usersCol.dropIndex('user_no_1');
  } catch {
    // ignore missing index
  }
  try {
    const usersCol = mongoose.connection.db.collection('users');
    await usersCol.dropIndex('user_name_1');
  } catch {
    // ignore missing index
  }
  // Drop stale indexes from students collection to avoid duplicate null errors on student creation
  try {
    const studentsCol = mongoose.connection.db.collection('students');
    await studentsCol.dropIndex('admission_no_1');
  } catch {
    // ignore missing index
  }
  // Drop stale indexes from guardians collection to avoid duplicate null errors on guardian creation
  try {
    const guardiansCol = mongoose.connection.db.collection('guardians');
    await guardiansCol.dropIndex('p_no_1');
  } catch {
    // ignore missing index
  }
}, 30000);
