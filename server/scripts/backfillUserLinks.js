import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { default: User } = await import('../src/models/User.js');
const { default: Student } = await import('../src/models/Student.js');
const { default: Guardian } = await import('../src/models/Guardian.js');

const APPLY = process.argv.includes('--apply');

const normalizeUri = (uri) => {
  if (!uri) return 'mongodb://127.0.0.1:27017/school_management_system';
  return uri.startsWith('MONGODB_URI=') ? uri.replace('MONGODB_URI=', '') : uri;
};

// Link one collection of profile docs to Users by email. Returns a summary.
const backfill = async (label, Model, emailField) => {
  const unlinked = await Model.find({ $or: [{ userId: null }, { userId: { $exists: false } }] });
  const result = { label, total: unlinked.length, linked: 0, noEmail: [], noUser: [], ambiguous: [] };

  for (const doc of unlinked) {
    const email = doc[emailField];
    if (!email) {
      result.noEmail.push(doc._id.toString());
      continue;
    }

    const users = await User.find({ email: email.toLowerCase().trim() }).select('_id email');
    if (users.length === 0) {
      result.noUser.push(`${doc._id} (${email})`);
      continue;
    }
    if (users.length > 1) {
      result.ambiguous.push(`${doc._id} (${email} → ${users.length} users)`);
      continue;
    }

    if (APPLY) {
      doc.userId = users[0]._id;
      await doc.save();
    }
    result.linked += 1;
  }

  return result;
};

const report = (r) => {
  console.log(`\n${r.label}`);
  console.log(`   unlinked records:      ${r.total}`);
  console.log(`   ${APPLY ? 'linked' : 'would link'}:${' '.repeat(APPLY ? 15 : 11)}${r.linked}`);
  if (r.noEmail.length)    console.log(`   skipped (no email):    ${r.noEmail.length}  ${r.noEmail.join(', ')}`);
  if (r.noUser.length)     console.log(`   skipped (no User):     ${r.noUser.length}\n     - ${r.noUser.join('\n     - ')}`);
  if (r.ambiguous.length)  console.log(`   skipped (ambiguous):   ${r.ambiguous.length}\n     - ${r.ambiguous.join('\n     - ')}`);
};

(async () => {
  const uri = normalizeUri(process.env.MONGODB_URI);
  await mongoose.connect(uri);
  console.log(`Connected to ${mongoose.connection.name}`);
  console.log(APPLY ? '⚙️  APPLY mode — writing links.' : '🔍 DRY RUN — no writes. Re-run with --apply to persist.');

  const students = await backfill('Students', Student, 'email');
  const guardians = await backfill('Guardians', Guardian, 'email');

  report(students);
  report(guardians);

  const totalLinked = students.linked + guardians.linked;
  const totalStuck = students.noUser.length + students.noEmail.length + students.ambiguous.length +
                     guardians.noUser.length + guardians.noEmail.length + guardians.ambiguous.length;
  console.log(`\n${APPLY ? 'Linked' : 'Would link'} ${totalLinked} record(s); ${totalStuck} need attention.`);
  if (!APPLY && totalLinked > 0) console.log('Re-run with --apply to persist these links.');

  await mongoose.connection.close();
  process.exit(0);
})();
