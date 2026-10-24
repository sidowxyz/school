import mongoose from 'mongoose';
import Guardian from '../models/Guardian.js';
import Family from '../models/Family.js';
import Student from '../models/Student.js';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { generatePassword } from '../utils/generatePassword.js';
import { assignGuardianToStudent, unassignGuardianFromStudent, getSiblingDiscountPercent } from '../services/familyService.js';
import { withTransaction } from '../utils/transaction.js';
import { pageParams, searchRegex } from '../utils/query.js';

// @desc   Create a new parent (Guardian). Auto-creates a hidden 1:1 Family
//         "household" record so admins manage a single "Parent" concept —
//         Family stays an internal implementation detail for sibling bookkeeping.
// @route  POST /api/parents
export const createParent = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    let newGuardian, newUser, temporaryPassword;

    await withTransaction(session, async () => {
      const { name, relationship, phone, email, createPortalUser, password } = req.body;

      if (!name || !relationship || !phone) {
        throw new AppError('Name, relationship and phone are required.', 400);
      }

      if (createPortalUser) {
        if (!email) throw new AppError('Email is required to create a portal login.', 400);
        const existingUser = await User.findOne({ email }).session(session);
        if (existingUser) throw new AppError('Email already in use', 400);
      }

      const createdFamilies = await Family.create([{
        familyName: `${name} Family`,
        primaryContactPhone: phone,
        primaryContactEmail: email || undefined,
      }], { session });
      const family = createdFamilies[0];

      let userId = null;
      if (createPortalUser) {
        temporaryPassword = password || generatePassword();
        const parts = String(name).trim().split(/\s+/);
        const firstName = parts[0] || 'Parent';
        const lastName = parts.slice(1).join(' ') || 'Guardian';

        const createdUsers = await User.create([{
          firstName,
          lastName,
          email,
          password: temporaryPassword,
          role: 'parent',
        }], { session });
        newUser = createdUsers[0];
        userId = newUser._id;
      }

      const createdGuardians = await Guardian.create([{
        familyId: family._id,
        userId,
        name,
        relationship,
        phone,
        email: email || undefined,
        isPrimary: true,
      }], { session });
      newGuardian = createdGuardians[0];
    });

    const userResponse = newUser ? (() => { const u = newUser.toObject(); delete u.password; return u; })() : null;

    res.status(201).json(new ApiResponse(201, {
      parent: newGuardian,
      user: userResponse,
      temporaryPassword,
    }, 'Parent created successfully'));
  } catch (error) {
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc   List parents with search/pagination, each augmented with children
//         count and their family's discount tier.
// @route  GET /api/parents
export const getParents = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (searchRegex(search)) {
      filter.$or = [
        { name: searchRegex(search) },
        { phone: searchRegex(search) },
        { email: searchRegex(search) },
      ];
    }

    const { page: currentPage, limit: pageSize } = pageParams({ page, limit }, { defaultLimit: 20, maxLimit: 1000 });

    const [total, guardians] = await Promise.all([
      Guardian.countDocuments(filter),
      Guardian.find(filter)
        .populate('familyId', 'siblingCount discountTier')
        .populate('userId', 'email status')
        .sort({ createdAt: -1 })
        .skip((currentPage - 1) * pageSize)
        .limit(pageSize),
    ]);

    const guardianIds = guardians.map((g) => g._id);
    const counts = await Student.aggregate([
      { $match: { isDeleted: false, 'guardians.guardianId': { $in: guardianIds } } },
      { $unwind: '$guardians' },
      { $match: { 'guardians.guardianId': { $in: guardianIds } } },
      { $group: { _id: '$guardians.guardianId', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));

    const parents = guardians.map((g) => ({
      ...g.toObject(),
      childrenCount: countMap.get(g._id.toString()) || 0,
    }));

    res.status(200).json(new ApiResponse(200, {
      pagination: { page: currentPage, limit: pageSize, totalPages: Math.ceil(total / pageSize), totalRecords: total },
      parents,
    }, 'Parents retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

// @desc   Get a parent's profile + their children + computed sibling discount
// @route  GET /api/parents/:id
export const getParent = async (req, res, next) => {
  try {
    const guardian = await Guardian.findById(req.params.id)
      .populate('familyId')
      .populate('userId', 'email status');
    if (!guardian) return next(new AppError('Parent not found', 404));

    const children = await Student.find({ 'guardians.guardianId': guardian._id, isDeleted: false })
      .populate('classId', 'cl_name')
      .populate('sectionId', 'name');

    const discountPercent = guardian.familyId ? await getSiblingDiscountPercent(guardian.familyId._id) : 0;

    res.status(200).json(new ApiResponse(200, { parent: guardian, children, discountPercent }, 'Parent retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

// @desc   Update a parent's contact details
// @route  PUT /api/parents/:id
export const updateParent = async (req, res, next) => {
  try {
    const { name, relationship, phone, email } = req.body;
    const guardian = await Guardian.findByIdAndUpdate(
      req.params.id,
      { name, relationship, phone, email },
      { new: true, runValidators: true }
    );
    if (!guardian) return next(new AppError('Parent not found', 404));

    res.status(200).json(new ApiResponse(200, guardian, 'Parent updated successfully'));
  } catch (error) {
    next(error);
  }
};

// @desc   Assign a student to this parent — replaces any existing guardian on
//         that student (the one-parent-per-student invariant).
// @route  POST /api/parents/:id/students/:studentId
export const assignStudent = async (req, res, next) => {
  try {
    const { id, studentId } = req.params;
    const { student, family } = await assignGuardianToStudent(studentId, id);
    res.status(200).json(new ApiResponse(200, { student, family }, 'Student assigned to parent'));
  } catch (error) {
    next(error);
  }
};

// @desc   Remove a student from this parent
// @route  DELETE /api/parents/:id/students/:studentId
export const unassignStudent = async (req, res, next) => {
  try {
    const { id, studentId } = req.params;

    const student = await Student.findOne({ _id: studentId, isDeleted: false });
    if (!student) return next(new AppError('Student not found', 404));

    const isLinked = student.guardians.some((g) => g.guardianId.toString() === id);
    if (!isLinked) return next(new AppError('This student is not assigned to this parent', 400));

    const updated = await unassignGuardianFromStudent(studentId);
    res.status(200).json(new ApiResponse(200, updated, 'Student unassigned from parent'));
  } catch (error) {
    next(error);
  }
};

// DELETE /api/parents/:id
// Only a parent with no children in school can be deleted, so no student is
// left without a family by accident. Their portal login is switched off and
// their family record goes too once nobody else uses it. Past students who
// left keep their record; only the link to this parent is cleared.
export const deleteParent = async (req, res, next) => {
  try {
    const guardian = await Guardian.findById(req.params.id);
    if (!guardian) return next(new AppError('Parent not found', 404));

    const linked = await Student.countDocuments({ isDeleted: false, 'guardians.guardianId': guardian._id });
    if (linked) {
      return next(new AppError(`${guardian.name} still has ${linked} ${linked === 1 ? 'child' : 'children'} linked. Remove or move them to another parent first.`, 409));
    }

    await Student.updateMany({ 'guardians.guardianId': guardian._id }, { $pull: { guardians: { guardianId: guardian._id } } });
    if (guardian.userId) await User.updateOne({ _id: guardian.userId }, { status: false, refreshTokens: [] });
    await guardian.deleteOne();

    if (guardian.familyId) {
      const stillUsed = await Promise.all([
        Guardian.exists({ familyId: guardian.familyId }),
        Student.exists({ familyId: guardian.familyId }),
      ]);
      if (!stillUsed.some(Boolean)) await Family.deleteOne({ _id: guardian.familyId });
    }

    res.status(200).json(new ApiResponse(200, null, 'Parent deleted'));
  } catch (error) {
    next(error);
  }
};
