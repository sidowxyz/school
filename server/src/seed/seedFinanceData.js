import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import ChartOfAccount from '../models/ChartOfAccount.js';
import FiscalYear from '../models/FiscalYear.js';
import AccountingPeriod from '../models/AccountingPeriod.js';
import FeeType from '../models/FeeType.js';
import FeeStructure from '../models/FeeStructure.js';
import PaymentMethod from '../models/PaymentMethod.js';
import Level from '../models/Level.js';
import Year from '../models/Year.js';
import Class from '../models/Class.js';
import Section from '../models/Section.js';
import Student from '../models/Student.js';
import StudentInvoice from '../models/StudentInvoice.js';
import Payment from '../models/payment.js';
import StudentFee from '../models/StudentFee.js';
import ScholarshipType from '../models/ScholarshipType.js';
import DiscountType from '../models/DiscountType.js';
import AppliesTo from '../models/AppliesTo.js';
import Scholarship from '../models/Scholarship.js';
import StudentScholarship from '../models/StudentScholarship.js';
import Status from '../models/Status.js';
import Supplier from '../models/Supplier.js';
import Expense from '../models/Expense.js';
import FixedAsset from '../models/FixedAsset.js';
import JournalEntry from '../models/JournalEntry.js';
import JournalLine from '../models/JournalLine.js';
import Ledger from '../models/Ledger.js';
import { postJournalEntry } from '../services/journalService.js';

export const seedComprehensiveFinanceData = async () => {
  try {
    console.log('🚀 Starting Comprehensive Real Finance Data Seeding...');

    // 1. Chart of Accounts
    const defaultAccounts = [
      // Assets (1xxx)
      { accountCode: '1000', accountName: 'Cash in Hand',               type: 'Asset',     normalBalance: 'Debit',  isSystemAccount: true  },
      { accountCode: '1010', accountName: 'Dahabshiil Bank Account',    type: 'Asset',     normalBalance: 'Debit'  },
      { accountCode: '1020', accountName: 'Premier Bank Account',       type: 'Asset',     normalBalance: 'Debit'  },
      { accountCode: '1030', accountName: 'Salaam Mobile Bank (EVC+)',  type: 'Asset',     normalBalance: 'Debit'  },
      { accountCode: '1100', accountName: 'Petty Cash',                 type: 'Asset',     normalBalance: 'Debit'  },
      { accountCode: '1200', accountName: 'Accounts Receivable',        type: 'Asset',     normalBalance: 'Debit',  isSystemAccount: true, allowManualPosting: false },
      { accountCode: '1300', accountName: 'Prepaid Expenses',           type: 'Asset',     normalBalance: 'Debit'  },
      { accountCode: '1500', accountName: 'Fixed Assets - Equipment & Vehicles', type: 'Asset', normalBalance: 'Debit' },
      { accountCode: '1590', accountName: 'Accumulated Depreciation',   type: 'Asset',     normalBalance: 'Credit' },

      // Liabilities (2xxx)
      { accountCode: '2000', accountName: 'Accounts Payable',           type: 'Liability', normalBalance: 'Credit', isSystemAccount: true, allowManualPosting: false },
      { accountCode: '2100', accountName: 'Accrued Salaries Payable',   type: 'Liability', normalBalance: 'Credit' },
      { accountCode: '2200', accountName: 'Deferred Student Revenue',   type: 'Liability', normalBalance: 'Credit' },

      // Equity (3xxx)
      { accountCode: '3000', accountName: 'Institutional Capital',      type: 'Equity',    normalBalance: 'Credit' },
      { accountCode: '3100', accountName: 'Retained Surplus / Earnings',type: 'Equity',    normalBalance: 'Credit', isSystemAccount: true },

      // Revenue (4xxx)
      { accountCode: '4000', accountName: 'Tuition Fee Revenue',        type: 'Revenue',   normalBalance: 'Credit', isSystemAccount: true },
      { accountCode: '4100', accountName: 'Registration & Admission Fees', type: 'Revenue', normalBalance: 'Credit' },
      { accountCode: '4200', accountName: 'Laboratory & Science Fees',  type: 'Revenue',   normalBalance: 'Credit' },
      { accountCode: '4300', accountName: 'Library & Activities Revenue',type: 'Revenue',  normalBalance: 'Credit' },

      // Expenses (5xxx)
      { accountCode: '5000', accountName: 'Teacher & Staff Salaries',   type: 'Expense',   normalBalance: 'Debit'  },
      { accountCode: '5100', accountName: 'Scholarship & Financial Aid Expense', type: 'Expense', normalBalance: 'Debit', isSystemAccount: true },
      { accountCode: '5200', accountName: 'Depreciation Expense',       type: 'Expense',   normalBalance: 'Debit'  },
      { accountCode: '5300', accountName: 'Generator Fuel & Utilities', type: 'Expense',   normalBalance: 'Debit'  },
      { accountCode: '5400', accountName: 'Textbooks & Educational Supplies', type: 'Expense', normalBalance: 'Debit' },
      { accountCode: '5500', accountName: 'Campus Maintenance & Repairs', type: 'Expense', normalBalance: 'Debit' },
    ];

    for (const acc of defaultAccounts) {
      await ChartOfAccount.findOneAndUpdate({ accountCode: acc.accountCode }, acc, { upsert: true, new: true });
    }
    console.log('✅ Chart of Accounts seeded.');

    // 2. Fiscal Year & Periods
    let fiscalYear = await FiscalYear.findOne({ yearName: 'FY 2026/2027' });
    if (!fiscalYear) {
      fiscalYear = await FiscalYear.create({
        yearName: 'FY 2026/2027',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        status: 'Open',
      });
    }

    const periodNames = [
      { name: 'Semester 1 - Term 1', start: '2026-01-01', end: '2026-03-31' },
      { name: 'Semester 1 - Term 2', start: '2026-04-01', end: '2026-06-30' },
      { name: 'Semester 2 - Term 1', start: '2026-07-01', end: '2026-09-30' },
      { name: 'Semester 2 - Term 2', start: '2026-10-01', end: '2026-12-31' },
    ];

    for (const p of periodNames) {
      await AccountingPeriod.findOneAndUpdate(
        { periodName: p.name, fiscalYearId: fiscalYear._id },
        { periodName: p.name, fiscalYearId: fiscalYear._id, startDate: new Date(p.start), endDate: new Date(p.end), status: 'Open' },
        { upsert: true }
      );
    }
    console.log('✅ Fiscal Year & Accounting Periods seeded.');

    // 3. Reference Academic Levels & Years
    let level = await Level.findOne({ lev_no: 'L1' });
    if (!level) {
      level = await Level.create({ lev_no: 'L1', lev_name: 'High School' });
    }
    let year = await Year.findOne({ y_no: 'Y1' });
    if (!year) {
      year = await Year.create({ y_no: 'Y1', y_name: '2026' });
    }

    // 4. Fee Types & Fee Structures
    const feeTypeTuition = await FeeType.findOneAndUpdate(
      { fee_type_no: 'FT-TUITION' },
      { fee_type_no: 'FT-TUITION', fee_name: 'Term Tuition Fee' },
      { upsert: true, new: true }
    );
    const feeTypeLab = await FeeType.findOneAndUpdate(
      { fee_type_no: 'FT-LAB' },
      { fee_type_no: 'FT-LAB', fee_name: 'Science & Computer Lab Fee' },
      { upsert: true, new: true }
    );
    const feeTypeReg = await FeeType.findOneAndUpdate(
      { fee_type_no: 'FT-REG' },
      { fee_type_no: 'FT-REG', fee_name: 'Annual Registration Fee' },
      { upsert: true, new: true }
    );

    const feeStructureTuition = await FeeStructure.findOneAndUpdate(
      { fee_struc_no: 'FS-TUITION-2026' },
      { fee_struc_no: 'FS-TUITION-2026', fee_type_no: feeTypeTuition._id, lev_no: level._id, y_no: year._id, amount: 450 },
      { upsert: true, new: true }
    );
    const feeStructureLab = await FeeStructure.findOneAndUpdate(
      { fee_struc_no: 'FS-LAB-2026' },
      { fee_struc_no: 'FS-LAB-2026', fee_type_no: feeTypeLab._id, lev_no: level._id, y_no: year._id, amount: 75 },
      { upsert: true, new: true }
    );

    // 5. Payment Methods
    const pmCash = await PaymentMethod.findOneAndUpdate(
      { payment_method_no: 'PM-CASH' },
      { payment_method_no: 'PM-CASH', payment_method_name: 'Cash in Hand' },
      { upsert: true, new: true }
    );
    const pmBank = await PaymentMethod.findOneAndUpdate(
      { payment_method_no: 'PM-DAHABSHIIL' },
      { payment_method_no: 'PM-DAHABSHIIL', payment_method_name: 'Dahabshiil Bank Transfer' },
      { upsert: true, new: true }
    );
    const pmEvc = await PaymentMethod.findOneAndUpdate(
      { payment_method_no: 'PM-EVC' },
      { payment_method_no: 'PM-EVC', payment_method_name: 'EVC Plus / Mobile Money' },
      { upsert: true, new: true }
    );

    // 6. Scholarships & Discounts
    let discountType = await DiscountType.findOne({ discount_type_name: 'Percentage' });
    if (!discountType) {
      discountType = await DiscountType.create({ discount_type_id: 'DT-PCT', discount_type_name: 'Percentage' });
    }
    let appliesTo = await AppliesTo.findOne({ applies_to_name: 'All Fees' });
    if (!appliesTo) {
      appliesTo = await AppliesTo.create({ applies_to_id: 'AT-ALL', applies_to_name: 'All Fees' });
    }
    let scholarType = await ScholarshipType.findOne({ scholarship_name: 'Academic Merit Excellence' });
    if (!scholarType) {
      scholarType = await ScholarshipType.create({ schola_type_no: 'ST-MERIT', scholarship_name: 'Academic Merit Excellence', description: 'Top academic achiever grant' });
    }
    let activeStatus = await Status.findOne({ st_name: { $regex: /active/i } });
    if (!activeStatus) {
      activeStatus = await Status.create({ st_no: 'ST-ACTIVE', st_name: 'Active' });
    }

    let scholarshipRule = await Scholarship.findOne({ scholar_type_no: scholarType._id });
    if (!scholarshipRule) {
      scholarshipRule = await Scholarship.create({
        scholarship_id: 'SCH-MERIT-50',
        scholar_type_no: scholarType._id,
        discount_type_id: discountType._id,
        applies_to_id: appliesTo._id,
        discount_value: 50, // 50% discount
        status_no: activeStatus._id,
      });
    }

    // 7. Ensure at least 4 real Students
    let klass = await Class.findOne({ cl_no: 'G10' });
    if (!klass) {
      klass = await Class.create({ cl_no: 'G10', cl_name: 'Grade 10', lev_no: level._id });
    }
    let section = await Section.findOne({ name: 'Section A' });
    if (!section) {
      section = await Section.create({ name: 'Section A', class: klass._id });
    }

    const sampleStudents = [
      { firstName: 'Ahmad', lastName: 'Ali', admissionNumber: 'ZU-2026-0001', phoneNumber: '0615123456', gender: 'Male', parentName: 'Mohamed Ali', parentPhoneNumber: '0615123456', address: 'Mogadishu' },
      { firstName: 'Fatima', lastName: 'Hassan', admissionNumber: 'ZU-2026-0002', phoneNumber: '0615234567', gender: 'Female', parentName: 'Hassan Noor', parentPhoneNumber: '0615234567', address: 'Mogadishu' },
      { firstName: 'Khadar', lastName: 'Osman', admissionNumber: 'ZU-2026-0003', phoneNumber: '0615345678', gender: 'Male', parentName: 'Osman Gedi', parentPhoneNumber: '0615345678', address: 'Mogadishu' },
      { firstName: 'Maryan', lastName: 'Abdi', admissionNumber: 'ZU-2026-0004', phoneNumber: '0615456789', gender: 'Female', parentName: 'Abdi Warsame', parentPhoneNumber: '0615456789', address: 'Mogadishu' },
    ];

    const studentDocs = [];
    for (const s of sampleStudents) {
      let doc = await Student.findOne({ admissionNumber: s.admissionNumber });
      if (!doc) {
        doc = await Student.create({
          firstName: s.firstName,
          lastName: s.lastName,
          admissionNumber: s.admissionNumber,
          admission_no: s.admissionNumber,
          phoneNumber: s.phoneNumber,
          gender: s.gender,
          birthDate: new Date('2009-05-15'),
          classId: klass._id,
          sectionId: section._id,
          parentName: s.parentName,
          parentPhoneNumber: s.parentPhoneNumber,
          address: s.address,
          status: 'Active',
        });
      }
      studentDocs.push(doc);
    }

    // Grant 50% Merit scholarship to Fatima (studentDocs[1])
    await StudentScholarship.findOneAndUpdate(
      { st_no: studentDocs[1]._id },
      {
        student_scholarship_id: `SSCH-${studentDocs[1].admissionNumber}`,
        st_no: studentDocs[1]._id,
        scholarship_id: scholarshipRule._id,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        status_no: activeStatus._id,
        remarks: 'Honor roll student 50% tuition reduction',
      },
      { upsert: true, new: true }
    );

    // 8. Seed Real Invoices with Journal Entries
    console.log('⚙️ Creating Real Invoices and Double-Entry Journal Entries...');

    // Invoice 1: Ahmad (Full tuition $450 - Paid $450 in full)
    let inv1 = await StudentInvoice.findOne({ invoice_no: 'INV-2026-001' });
    if (!inv1) {
      inv1 = await StudentInvoice.create({
        invoice_no: 'INV-2026-001',
        student: studentDocs[0]._id,
        fee_struc_no: feeStructureTuition._id,
        original_amount: 450,
        discount_percentage: 0,
        discount_amount: 0,
        invoice_amount: 450,
        paid_amount: 450,
        balance: 0,
        status: 'Paid',
        dueDate: new Date('2026-02-15'),
        registerDate: new Date('2026-01-10'),
      });

      // Post Invoice Journal Entry: Dr AR $450, Cr Tuition Revenue $450
      await postJournalEntry({
        date: new Date('2026-01-10'),
        referenceType: 'Invoice',
        referenceId: inv1._id,
        journalNumber: 'JRN-INV-2026-001',
        description: `Student Invoice - Ahmad Ali (Full Tuition)`,
        lines: [
          { accountCode: '1200', debit: 450, credit: 0, studentId: studentDocs[0]._id },
          { accountCode: '4000', debit: 0, credit: 450, studentId: studentDocs[0]._id },
        ],
      });

      // Post Payment: Dr Dahabshiil Bank $450, Cr AR $450
      const pay1 = await Payment.create({
        payment_id: 'PAY-2026-001',
        student: studentDocs[0]._id,
        fee_structure: feeStructureTuition._id,
        payment_type: 'monthly',
        payment_method: pmBank._id,
        amount_paid: 450,
        remaining_balance: 0,
        status: activeStatus._id,
        payment_date: new Date('2026-01-12'),
      });
      await StudentFee.create({
        student_fee_no: 'SF-2026-001',
        invoice_no: inv1._id,
        payment_method_no: pmBank._id,
        paid_amount: 450,
        registerDate: new Date('2026-01-12'),
      });
      await postJournalEntry({
        date: new Date('2026-01-12'),
        referenceType: 'Payment',
        referenceId: pay1._id,
        journalNumber: 'JRN-PAY-2026-001',
        description: `Payment received from Ahmad Ali (Bank Transfer)`,
        lines: [
          { accountCode: '1010', debit: 450, credit: 0, studentId: studentDocs[0]._id },
          { accountCode: '1200', debit: 0, credit: 450, studentId: studentDocs[0]._id },
        ],
      });
    }

    // Invoice 2: Fatima (Tuition $450 with 50% scholarship discount = $225 net, Paid $150, Balance $75)
    let inv2 = await StudentInvoice.findOne({ invoice_no: 'INV-2026-002' });
    if (!inv2) {
      inv2 = await StudentInvoice.create({
        invoice_no: 'INV-2026-002',
        student: studentDocs[1]._id,
        fee_struc_no: feeStructureTuition._id,
        original_amount: 450,
        discount_percentage: 50,
        discount_amount: 225,
        invoice_amount: 225,
        paid_amount: 150,
        balance: 75,
        status: 'Partially_Paid',
        dueDate: new Date('2026-02-15'),
        registerDate: new Date('2026-01-10'),
      });

      // Post Invoice: Dr AR $225, Dr Scholarship Expense $225, Cr Tuition Revenue $450
      await postJournalEntry({
        date: new Date('2026-01-10'),
        referenceType: 'Invoice',
        referenceId: inv2._id,
        journalNumber: 'JRN-INV-2026-002',
        description: `Student Invoice - Fatima Hassan (50% Scholarship Applied)`,
        lines: [
          { accountCode: '1200', debit: 225, credit: 0, studentId: studentDocs[1]._id },
          { accountCode: '5100', debit: 225, credit: 0, studentId: studentDocs[1]._id },
          { accountCode: '4000', debit: 0, credit: 450, studentId: studentDocs[1]._id },
        ],
      });

      // Post Partial Payment: Dr Cash $150, Cr AR $150
      const pay2 = await Payment.create({
        payment_id: 'PAY-2026-002',
        student: studentDocs[1]._id,
        fee_structure: feeStructureTuition._id,
        payment_type: 'monthly',
        payment_method: pmCash._id,
        amount_paid: 150,
        remaining_balance: 75,
        status: activeStatus._id,
        payment_date: new Date('2026-01-15'),
      });
      await StudentFee.create({
        student_fee_no: 'SF-2026-002',
        invoice_no: inv2._id,
        payment_method_no: pmCash._id,
        paid_amount: 150,
        registerDate: new Date('2026-01-15'),
      });
      await postJournalEntry({
        date: new Date('2026-01-15'),
        referenceType: 'Payment',
        referenceId: pay2._id,
        journalNumber: 'JRN-PAY-2026-002',
        description: `Partial payment from Fatima Hassan (Cash)`,
        lines: [
          { accountCode: '1000', debit: 150, credit: 0, studentId: studentDocs[1]._id },
          { accountCode: '1200', debit: 0, credit: 150, studentId: studentDocs[1]._id },
        ],
      });
    }

    // Invoice 3: Khadar (Lab Fee $75 - Unpaid, Overdue)
    let inv3 = await StudentInvoice.findOne({ invoice_no: 'INV-2026-003' });
    if (!inv3) {
      inv3 = await StudentInvoice.create({
        invoice_no: 'INV-2026-003',
        student: studentDocs[2]._id,
        fee_struc_no: feeStructureLab._id,
        original_amount: 75,
        discount_percentage: 0,
        discount_amount: 0,
        invoice_amount: 75,
        paid_amount: 0,
        balance: 75,
        status: 'Unpaid',
        dueDate: new Date('2026-01-30'), // Overdue
        registerDate: new Date('2026-01-05'),
      });

      await postJournalEntry({
        date: new Date('2026-01-05'),
        referenceType: 'Invoice',
        referenceId: inv3._id,
        journalNumber: 'JRN-INV-2026-003',
        description: `Science Lab Fee - Khadar Osman`,
        lines: [
          { accountCode: '1200', debit: 75, credit: 0, studentId: studentDocs[2]._id },
          { accountCode: '4200', debit: 0, credit: 75, studentId: studentDocs[2]._id },
        ],
      });
    }

    // Invoice 4: Maryan (Tuition $450 - Paid in Full via EVC+)
    let inv4 = await StudentInvoice.findOne({ invoice_no: 'INV-2026-004' });
    if (!inv4) {
      inv4 = await StudentInvoice.create({
        invoice_no: 'INV-2026-004',
        student: studentDocs[3]._id,
        fee_struc_no: feeStructureTuition._id,
        original_amount: 450,
        discount_percentage: 0,
        discount_amount: 0,
        invoice_amount: 450,
        paid_amount: 450,
        balance: 0,
        status: 'Paid',
        dueDate: new Date('2026-02-15'),
        registerDate: new Date('2026-01-10'),
      });

      await postJournalEntry({
        date: new Date('2026-01-10'),
        referenceType: 'Invoice',
        referenceId: inv4._id,
        journalNumber: 'JRN-INV-2026-004',
        description: `Student Invoice - Maryan Abdi`,
        lines: [
          { accountCode: '1200', debit: 450, credit: 0, studentId: studentDocs[3]._id },
          { accountCode: '4000', debit: 0, credit: 450, studentId: studentDocs[3]._id },
        ],
      });

      const pay4 = await Payment.create({
        payment_id: 'PAY-2026-004',
        student: studentDocs[3]._id,
        fee_structure: feeStructureTuition._id,
        payment_type: 'monthly',
        payment_method: pmEvc._id,
        amount_paid: 450,
        remaining_balance: 0,
        status: activeStatus._id,
        payment_date: new Date('2026-01-18'),
      });
      await StudentFee.create({
        student_fee_no: 'SF-2026-004',
        invoice_no: inv4._id,
        payment_method_no: pmEvc._id,
        paid_amount: 450,
        registerDate: new Date('2026-01-18'),
      });
      await postJournalEntry({
        date: new Date('2026-01-18'),
        referenceType: 'Payment',
        referenceId: pay4._id,
        journalNumber: 'JRN-PAY-2026-004',
        description: `Payment received from Maryan Abdi (EVC Plus)`,
        lines: [
          { accountCode: '1030', debit: 450, credit: 0, studentId: studentDocs[3]._id },
          { accountCode: '1200', debit: 0, credit: 450, studentId: studentDocs[3]._id },
        ],
      });
    }

    // 9. Suppliers & Operational Expenses
    console.log('🏢 Seeding Suppliers and Real Expenses...');
    const supplierFuel = await Supplier.findOneAndUpdate(
      { supplierName: 'Hass Petroleum Somalia' },
      { supplierName: 'Hass Petroleum Somalia', contactPerson: 'Abdirahman Noor', phone: '+252-61-5550101', email: 'fuel@hass.so', address: 'Km4, Mogadishu' },
      { upsert: true, new: true }
    );
    const supplierStationery = await Supplier.findOneAndUpdate(
      { supplierName: 'Somali Educational Books & Stationery' },
      { supplierName: 'Somali Educational Books & Stationery', contactPerson: 'Hodan Barre', phone: '+252-61-5550202', email: 'orders@sebs.so', address: 'Bakaara Market, Mogadishu' },
      { upsert: true, new: true }
    );
    const supplierTelecom = await Supplier.findOneAndUpdate(
      { supplierName: 'Hormuud Telecom Fiber Services' },
      { supplierName: 'Hormuud Telecom Fiber Services', contactPerson: 'Enterprise Support', phone: '+252-61-5550303', email: 'fiber@hormuud.com', address: 'Main HQ, Mogadishu' },
      { upsert: true, new: true }
    );

    // Expense 1: Generator Diesel Fuel ($280)
    let exp1 = await Expense.findOne({ expenseNumber: 'EXP-2026-001' });
    const accFuel = await ChartOfAccount.findOne({ accountCode: '5300' });
    const accCash = await ChartOfAccount.findOne({ accountCode: '1000' });
    const accBank = await ChartOfAccount.findOne({ accountCode: '1010' });
    const accSupplies = await ChartOfAccount.findOne({ accountCode: '5400' });
    const accFixedAssets = await ChartOfAccount.findOne({ accountCode: '1500' });
    const accDeprExp = await ChartOfAccount.findOne({ accountCode: '5200' });
    const accAccumDepr = await ChartOfAccount.findOne({ accountCode: '1590' });

    if (!exp1 && accFuel && accCash) {
      exp1 = await Expense.create({
        expenseNumber: 'EXP-2026-001',
        expenseDate: new Date('2026-01-20'),
        categoryAccountId: accFuel._id,
        paymentAccountId: accCash._id,
        supplierId: supplierFuel._id,
        title: 'Monthly Campus Generator Fuel (350 Liters)',
        description: 'Diesel purchase for main campus electricity backup',
        amount: 280,
        paymentMethod: 'Cash',
        status: 'Paid',
      });
      await postJournalEntry({
        date: new Date('2026-01-20'),
        referenceType: 'Expense',
        referenceId: exp1._id,
        journalNumber: 'JRN-EXP-2026-001',
        description: 'Monthly Campus Generator Fuel (350L)',
        lines: [
          { accountCode: '5300', debit: 280, credit: 0 },
          { accountCode: '1000', debit: 0, credit: 280 },
        ],
      });
    }

    // Expense 2: Textbooks & Class Stationery ($195)
    let exp2 = await Expense.findOne({ expenseNumber: 'EXP-2026-002' });
    if (!exp2 && accSupplies && accBank) {
      exp2 = await Expense.create({
        expenseNumber: 'EXP-2026-002',
        expenseDate: new Date('2026-01-25'),
        categoryAccountId: accSupplies._id,
        paymentAccountId: accBank._id,
        supplierId: supplierStationery._id,
        title: 'Science Workbooks & Whiteboard Markers',
        description: 'Term 1 classroom educational supplies batch',
        amount: 195,
        paymentMethod: 'Bank Transfer',
        status: 'Paid',
      });
      await postJournalEntry({
        date: new Date('2026-01-25'),
        referenceType: 'Expense',
        referenceId: exp2._id,
        journalNumber: 'JRN-EXP-2026-002',
        description: 'Science Workbooks & Whiteboard Supplies',
        lines: [
          { accountCode: '5400', debit: 195, credit: 0 },
          { accountCode: '1010', debit: 0, credit: 195 },
        ],
      });
    }

    // 10. Fixed Assets & Depreciation
    console.log('🚌 Registering Fixed Assets and Depreciation...');
    let asset1 = await FixedAsset.findOne({ assetCode: 'AST-BUS-01' });
    if (!asset1 && accFixedAssets && accDeprExp && accAccumDepr) {
      asset1 = await FixedAsset.create({
        assetCode: 'AST-BUS-01',
        assetName: 'Toyota Coaster School Bus (32-Seater)',
        category: 'Vehicles',
        purchaseDate: new Date('2025-08-01'),
        purchaseCost: 24000,
        salvageValue: 4000,
        usefulLifeMonths: 60, // 5 years
        depreciationMethod: 'Straight Line',
        accumulatedDepreciation: 2000, // 6 months @ $333.33
        currentBookValue: 22000,
        location: 'Main Parking Yard',
        serialNumber: 'VIN-TOY-8921804',
        status: 'In Use',
        assetAccountId: accFixedAssets._id,
        depreciationExpenseAccountId: accDeprExp._id,
        accumulatedDepreciationAccountId: accAccumDepr._id,
      });

      // Post initial asset acquisition journal entry
      await postJournalEntry({
        date: new Date('2025-08-01'),
        referenceType: 'Asset Purchase',
        referenceId: asset1._id,
        journalNumber: 'JRN-AST-BUS-01',
        description: 'Acquisition of School Bus (Toyota Coaster)',
        lines: [
          { accountCode: '1500', debit: 24000, credit: 0 },
          { accountCode: '3000', debit: 0, credit: 24000 }, // Institutional Capital
        ],
      });

      // Post 1 month depreciation
      await postJournalEntry({
        date: new Date('2026-01-31'),
        referenceType: 'Depreciation',
        referenceId: asset1._id,
        journalNumber: 'JRN-DEP-BUS-JAN26',
        description: 'Monthly depreciation for Toyota School Bus',
        lines: [
          { accountCode: '5200', debit: 333.33, credit: 0 },
          { accountCode: '1590', debit: 0, credit: 333.33 },
        ],
      });
    }

    let asset2 = await FixedAsset.findOne({ assetCode: 'AST-LAB-COMP' });
    if (!asset2 && accFixedAssets && accDeprExp && accAccumDepr) {
      asset2 = await FixedAsset.create({
        assetCode: 'AST-LAB-COMP',
        assetName: 'Computer Lab Desktop PCs (25 Units)',
        category: 'Computers & IT',
        purchaseDate: new Date('2025-09-15'),
        purchaseCost: 12500,
        salvageValue: 1000,
        usefulLifeMonths: 36,
        depreciationMethod: 'Straight Line',
        accumulatedDepreciation: 1277.76,
        currentBookValue: 11222.24,
        location: 'Computer Lab 1',
        serialNumber: 'DELL-OPTIPLEX-BATCH25',
        status: 'In Use',
        assetAccountId: accFixedAssets._id,
        depreciationExpenseAccountId: accDeprExp._id,
        accumulatedDepreciationAccountId: accAccumDepr._id,
      });

      await postJournalEntry({
        date: new Date('2025-09-15'),
        referenceType: 'Asset Purchase',
        referenceId: asset2._id,
        journalNumber: 'JRN-AST-LAB-COMP',
        description: 'Purchase of 25 Dell Desktop PCs for Lab',
        lines: [
          { accountCode: '1500', debit: 12500, credit: 0 },
          { accountCode: '3000', debit: 0, credit: 12500 },
        ],
      });
    }

    console.log('🎉 Comprehensive Real Finance Data Seeding COMPLETE!');
    return true;
  } catch (error) {
    console.error('❌ Seeding Error:', error);
    throw error;
  }
};

// Allow executing directly: node src/seed/seedFinanceData.js
if (process.argv[1] && process.argv[1].endsWith('seedFinanceData.js')) {
  (async () => {
    await connectDB();
    await seedComprehensiveFinanceData();
    await mongoose.connection.close();
    process.exit(0);
  })();
}
