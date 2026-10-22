// scripts/dropOldUserIndexes.cjs
// CommonJS entrypoint for index cleanup against local Compass or configured MONGODB_URI.
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DEFAULT_LOCAL_URI = 'mongodb://127.0.0.1:27017/school_management_system';
const TARGET_STALE_INDEXES = ['user_no_1', 'user_name_1'];

const redactUri = (uri) => {
  const match = /^mongodb(?:\+srv)?:\/\/([^:/?#]+)(?::[^@]*)?@([^/?#]+)/.exec(uri ?? '');
  return match ? `${match[1]}@${match[2]}` : uri.replace(/\/\/.*@/, '//***:***@');
};

async function cleanupUserIndexes() {
  const uri = process.env.MONGODB_URI || process.argv[2] || DEFAULT_LOCAL_URI;
  const shouldClearUsers = process.argv.includes('--clear-users');

  console.log(`Connecting to MongoDB: ${redactUri(uri)}`);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log(`✓ Connected to host: ${mongoose.connection.host}`);
  console.log(`✓ Database: ${mongoose.connection.name}`);

  try {
    const usersCollection = mongoose.connection.db.collection('users');

    const indexes = await usersCollection.indexes();
    console.log('\nCurrent indexes on "users" collection:');
    indexes.forEach(idx => {
      console.log(` - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

    let droppedCount = 0;
    for (const name of TARGET_STALE_INDEXES) {
      const exists = indexes.some(i => i.name === name);
      if (exists) {
        await usersCollection.dropIndex(name);
        console.log(`✓ Dropped stale index: "${name}"`);
        droppedCount++;
      } else {
        console.log(`- Stale index "${name}" not present (OK)`);
      }
    }

    if (droppedCount > 0) {
      console.log(`\nSuccessfully dropped ${droppedCount} legacy index(es).`);
    } else {
      console.log('\nNo stale indexes found. Collection is clean.');
    }

    if (shouldClearUsers) {
      console.warn('\n⚠️ --clear-users flag detected. Clearing users collection...');
      const del = await usersCollection.deleteMany({});
      console.log(`Cleared ${del.deletedCount} user documents.`);
    }
  } finally {
    await mongoose.disconnect();
    console.log('Database disconnected.');
  }
}

cleanupUserIndexes()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\nError cleaning up user indexes:', err.message);
    process.exit(1);
  });
