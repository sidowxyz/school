/**
 * Backfill the `section` field on StudentClass rows that predate it
 * (added 2026-08-19 alongside promotionService/applyMove writing it).
 *
 * For every StudentClass row where section is null / missing, look up the
 * matching Student and copy over `Student.sectionId`. That is the best
 * historical guess available for legacy rows — the correct section for the
 * year *of that enrolment* isn't recoverable when nothing recorded it, and
 * the student's current section is a strictly better answer than null.
 *
 * Idempotent: rows that already have a section are left alone. Safe to
 * re-run any time. Dry-run by default.
 *
 * Usage:
 *   node scripts/backfillStudentClassSections.js            # report only
 *   node scripts/backfillStudentClassSections.js --apply    # write changes
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { default: StudentClass } = await import('../src/models/StudentClass.js');
const { default: Student } = await import('../src/models/Student.js');

const APPLY = process.argv.includes('--apply');

const normalizeUri = (uri) => {
  if (!uri) return 'mongodb://127.0.0.1:27017/school_management_system';
  return uri.startsWith('MONGODB_URI=') ? uri.replace('MONGODB_URI=', '') : uri;
};

const summarise = (rows) => ({
  total: rows.length,
  withStudent: rows.filter((r) => r.studentSection).length,
  withoutStudent: rows.filter((r) => !r.studentSection).length
});

async function main() {
  await mongoose.connect(normalizeUri(process.env.MONGODB_URI), { serverSelectionTimeoutMS: 8000 });
  console.log(`Connected. Mode: ${APPLY ? 'APPLY (writing changes)' : 'DRY RUN (report only)'}`);

  // Rows missing the section field entirely, and rows explicitly set to null.
  // Populated with the current Student.sectionId so we can preview what gets
  // written and skip enrolments whose student has been deleted since.
  const candidates = await StudentClass.find({
    $or: [{ section: null }, { section: { $exists: false } }]
  })
    .populate('student', 'sectionId isDeleted')
    .lean();

  const rows = candidates
    .filter((row) => row.student && !row.student.isDeleted)
    .map((row) => ({
      id: row._id,
      studentSection: row.student.sectionId ?? null
    }));

  const summary = summarise(rows);
  console.log(
    `${candidates.length} StudentClass row(s) without a section — ` +
      `${summary.total} still have a live student, ` +
      `${summary.withStudent} of those have a section to copy, ` +
      `${summary.withoutStudent} have no section either.`
  );

  const writable = rows.filter((r) => r.studentSection);
  if (writable.length === 0) {
    console.log('Nothing to write.');
  } else if (!APPLY) {
    console.log(`Would update ${writable.length} row(s). Re-run with --apply to write.`);
  } else {
    // updateOne per row rather than a single updateMany, since each row's
    // section value is different — a bulkWrite keeps it to one round trip.
    const ops = writable.map((row) => ({
      updateOne: {
        filter: { _id: row.id },
        update: { $set: { section: row.studentSection } }
      }
    }));
    const result = await StudentClass.bulkWrite(ops);
    console.log(`Wrote section on ${result.modifiedCount} row(s).`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exitCode = 1;
});
