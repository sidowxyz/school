import Notification from '../models/notification.model.js';
import CommCounter from '../models/CommCounter.js';
import User from '../models/User.js';

/**
 * Notifications for the examination approval workflow — §14.28. Fire-and-
 * forget: called after the workflow action already succeeded, so a
 * notification failure must never throw back into the state transition.
 */

const REVIEWER_ROLES = ['academic_officer', 'principal', 'admin'];

const nextNotificationId = async () => {
  // Same counter the rest of the app uses for NTF-XXXX; upsert so a fresh DB
  // starts at 0001 without any seeding step.
  const counter = await CommCounter.findOneAndUpdate(
    { name: 'notification' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `NTF-${String(counter.seq).padStart(4, '0')}`;
};

const createOne = async ({ user_id, title, body, createBy }) => {
  const notification_id = await nextNotificationId();
  await Notification.create({
    notification_id,
    user_id,
    type: 'result',
    title,
    body,
    createBy: createBy ?? null
  });
};

const safeFanOut = async (recipients, buildPayload) => {
  await Promise.all(
    recipients
      .filter((u) => u && u._id)
      .map((user) => createOne({ user_id: user._id, ...buildPayload(user) }).catch(() => {}))
  );
};

/**
 * When a teacher submits marks for approval, tell every reviewer who can
 * act on the queue.
 */
export const notifySubmitted = async (submission, actor) => {
  try {
    const reviewers = await User.find({ role: { $in: REVIEWER_ROLES } }).select('_id');
    await safeFanOut(reviewers, () => ({
      createBy: actor?._id,
      title: 'New marks submitted for approval',
      body:
        `${submission.subjectName} · ${submission.className} — ${submission.examName}. ` +
        'Open the approvals queue to review.'
    }));
  } catch {
    // Swallowed by design — the caller has already saved the submission.
  }
};

/** Approval, return and publish all target the submitting teacher. */
export const notifyReviewed = async (submission, action, actor) => {
  try {
    if (!submission.teacherId) return;
    const map = {
      approve: {
        title: `${submission.subjectName} marks approved`,
        body:
          `${submission.examName} · ${submission.className} — approved. ` +
          'Publishing is the next step.'
      },
      return: {
        title: `${submission.subjectName} marks returned for correction`,
        body:
          `${submission.examName} · ${submission.className}. ` +
          `Reason: ${submission.returnReason ?? 'No reason provided.'}`
      },
      publish: {
        title: `${submission.subjectName} results published`,
        body:
          `${submission.examName} · ${submission.className} — results are now visible to students and parents.`
      }
    };
    const payload = map[action];
    if (!payload) return;
    await createOne({ user_id: submission.teacherId, createBy: actor?._id, ...payload });
  } catch {
    // Deliberate — a delivery blip must not roll back a completed review.
  }
};
