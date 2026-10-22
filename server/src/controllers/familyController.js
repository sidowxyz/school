import mongoose from 'mongoose';
import Family from '../models/Family.js';
import Guardian from '../models/Guardian.js';
import Student from '../models/Student.js';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { recomputeFamilyDiscount } from '../services/familyService.js';

export const createFamily = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    let newFamily, newGuardian;

    await session.withTransaction(async () => {
      const { familyName, primaryContactPhone, primaryContactEmail, guardianName, relationship } = req.body;

      const createdFamilies = await Family.create([{
        familyName,
        primaryContactPhone,
        primaryContactEmail,
      }], { session });
      newFamily = createdFamilies[0];

      const createdGuardians = await Guardian.create([{
        familyId: newFamily._id,
        name: guardianName,
        relationship,
        phone: primaryContactPhone,
        email: primaryContactEmail,
        isPrimary: true,
      }], { session });
      newGuardian = createdGuardians[0];
    });

    res.status(201).json(new ApiResponse(201, { family: newFamily, guardian: newGuardian }, 'Family and primary guardian created successfully'));
  } catch (error) {
    next(new AppError('Transaction failed: ' + error.message, 500));
  } finally {
    session.endSession();
  }
};

export const addGuardian = async (req, res, next) => {
  try {
    const { familyId } = req.params;
    const { name, relationship, phone, email, createPortalUser, password } = req.body;

    let userId = null;

    if (createPortalUser && email && password) {
      const existingUser = await User.findOne({ email });
      if (existingUser) return next(new AppError('User email already in use', 400));

      // Split the guardian's full name into first/last for the login account.
      const [firstName, ...rest] = String(name).trim().split(/\s+/);
      const lastName = rest.join(' ') || firstName;

      const user = await User.create({
        firstName,
        lastName,
        email,
        password,
        role: 'parent',
      });
      userId = user._id;
    }

    const newGuardian = await Guardian.create({
      familyId,
      userId,
      name,
      relationship,
      phone,
      email,
    });

    res.status(201).json(new ApiResponse(201, newGuardian, 'Guardian added successfully'));
  } catch (error) {
    next(error);
  }
};

export const assignStudentToFamily = async (req, res, next) => {
  try {
    const { familyId, studentId } = req.params;

    const student = await Student.findById(studentId);
    if (!student) return next(new AppError('Student not found', 404));

    student.familyId = familyId;
    await student.save();

    const family = await recomputeFamilyDiscount(familyId);

    res.status(200).json(new ApiResponse(200, { student, family }, 'Student assigned to family and sibling count updated'));
  } catch (error) {
    next(error);
  }
};

export const linkGuardianToStudent = async (req, res, next) => {
  try {
    const { studentId, guardianId } = req.params;
    const { isPrimary } = req.body;

    const student = await Student.findById(studentId);
    if (!student) return next(new AppError('Student not found', 404));

    const existingLinkIndex = student.guardians.findIndex(g => g.guardianId.toString() === guardianId);

    if (existingLinkIndex > -1) {
      student.guardians[existingLinkIndex].isPrimary = isPrimary;
    } else {
      student.guardians.push({ guardianId, isPrimary });
    }

    // Ensure only one primary guardian exists if isPrimary is true
    if (isPrimary) {
      student.guardians.forEach((g) => {
        if (g.guardianId.toString() !== guardianId) g.isPrimary = false;
      });
    }

    await student.save();

    res.status(200).json(new ApiResponse(200, student, 'Guardian linked to student'));
  } catch (error) {
    next(error);
  }
};

export const getFamilyProfile = async (req, res, next) => {
  try {
    const { familyId } = req.params;

    const family = await Family.findById(familyId);
    if (!family) return next(new AppError('Family not found', 404));

    const guardians = await Guardian.find({ familyId });
    const students = await Student.find({ familyId, isDeleted: false });

    res.status(200).json(new ApiResponse(200, { family, guardians, students }, 'Family profile retrieved'));
  } catch (error) {
    next(error);
  }
};

export const updateFamily = async (req, res, next) => {
  try {
    const { familyId } = req.params;
    const updateData = req.body;

    const family = await Family.findByIdAndUpdate(familyId, updateData, { new: true, runValidators: true });
    if (!family) return next(new AppError('Family not found', 404));

    res.status(200).json(new ApiResponse(200, family, 'Family updated'));
  } catch (error) {
    next(error);
  }
};
