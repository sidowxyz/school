import Family from '../models/Family.js';
import Guardian from '../models/Guardian.js';
import Student from '../models/Student.js';
import SiblingRule from '../models/SiblingRule.js';
import AppError from '../utils/AppError.js';

export const calculateDiscountTier = (siblingCount) => {
  if (siblingCount >= 3) return 'Tier 2 (3+ siblings)';
  if (siblingCount === 2) return 'Tier 1 (2 siblings)';
  return 'None';
};

// Recomputes and persists a family's sibling count + discount tier label from
// its currently-linked active students. Safe to call with a null familyId
// (e.g. a student that has no guardian yet) — it's a no-op in that case.
export const recomputeFamilyDiscount = async (familyId) => {
  if (!familyId) return null;

  const siblingCount = await Student.countDocuments({
    familyId,
    status: 'Active',
    isDeleted: false,
  });
  const discountTier = calculateDiscountTier(siblingCount);

  return Family.findByIdAndUpdate(familyId, { siblingCount, discountTier }, { new: true });
};

// Resolves the family's sibling count against the configured SiblingRule set
// and returns the best matching discount percentage (0 if none apply). "Best"
// means the active rule with the highest minimum_siblings threshold the
// family's siblingCount still satisfies.
export const getSiblingDiscountPercent = async (familyId) => {
  if (!familyId) return 0;

  const family = await Family.findById(familyId);
  if (!family || !family.siblingCount) return 0;

  const rule = await SiblingRule.findOne({
    is_active: true,
    minimum_siblings: { $lte: family.siblingCount },
  }).sort({ minimum_siblings: -1 });

  return rule ? rule.discount_percentage : 0;
};

// The single "assign a parent to a student" operation. Always REPLACES the
// student's guardians array wholesale (never appends), which is what makes
// "one student -> exactly one guardian" hold in practice. If the student was
// already linked to a different guardian, that old family's sibling
// count/discount tier is recomputed too so it doesn't stay stale.
export const assignGuardianToStudent = async (studentId, guardianId) => {
  const [student, guardian] = await Promise.all([
    Student.findOne({ _id: studentId, isDeleted: false }),
    Guardian.findById(guardianId),
  ]);

  if (!student) throw new AppError('Student not found', 404);
  if (!guardian) throw new AppError('Parent not found', 404);

  const oldFamilyId = student.familyId ? student.familyId.toString() : null;
  const newFamilyId = guardian.familyId ? guardian.familyId.toString() : null;

  student.guardians = [{ guardianId: guardian._id, isPrimary: true }];
  student.familyId = guardian.familyId;
  await student.save();

  if (oldFamilyId && oldFamilyId !== newFamilyId) {
    await recomputeFamilyDiscount(oldFamilyId);
  }
  const family = await recomputeFamilyDiscount(newFamilyId);

  return { student, family };
};

// Clears a student's guardian/family link and recomputes the old family's
// sibling count/discount tier so it reflects the removal.
export const unassignGuardianFromStudent = async (studentId) => {
  const student = await Student.findOne({ _id: studentId, isDeleted: false });
  if (!student) throw new AppError('Student not found', 404);

  const oldFamilyId = student.familyId ? student.familyId.toString() : null;

  student.guardians = [];
  student.familyId = null;
  await student.save();

  if (oldFamilyId) {
    await recomputeFamilyDiscount(oldFamilyId);
  }

  return student;
};
