import mongoose from 'mongoose';
import FixedAsset from '../models/FixedAsset.js';
import ChartOfAccount from '../models/ChartOfAccount.js';
import { postJournalEntry } from '../services/journalService.js';

export const getFixedAssets = async (req, res) => {
  try {
    const assets = await FixedAsset.find()
      .populate('assetAccountId', 'accountCode accountName')
      .populate('depreciationExpenseAccountId', 'accountCode accountName')
      .populate('accumulatedDepreciationAccountId', 'accountCode accountName')
      .sort({ purchaseDate: -1 });

    const totalCost = assets.reduce((sum, a) => sum + (a.purchaseCost || 0), 0);
    const totalAccumulatedDepr = assets.reduce((sum, a) => sum + (a.accumulatedDepreciation || 0), 0);
    const totalBookValue = assets.reduce((sum, a) => sum + (a.currentBookValue || 0), 0);

    res.json({
      success: true,
      data: assets,
      summary: { totalCost, totalAccumulatedDepr, totalBookValue },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createFixedAsset = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      assetCode,
      assetName,
      category = 'Furniture & Fixtures',
      purchaseDate = new Date(),
      purchaseCost,
      salvageValue = 0,
      usefulLifeMonths = 60,
      depreciationMethod = 'Straight Line',
      location,
      serialNumber,
      paymentAccountId,
    } = req.body;

    if (!purchaseCost || purchaseCost <= 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Purchase cost must be greater than 0' });
    }

    const code = assetCode || `AST-${Date.now().toString().slice(-6)}`;

    // Resolve system COA accounts
    let assetAccount = await ChartOfAccount.findOne({ accountCode: '1500' }).session(session);
    if (!assetAccount) {
      assetAccount = (await ChartOfAccount.create([{ accountCode: '1500', accountName: 'Fixed Assets', type: 'Asset', normalBalance: 'Debit' }], { session }))[0];
    }

    let deprExpenseAccount = await ChartOfAccount.findOne({ accountCode: '5200' }).session(session);
    if (!deprExpenseAccount) {
      deprExpenseAccount = (await ChartOfAccount.create([{ accountCode: '5200', accountName: 'Depreciation Expense', type: 'Expense', normalBalance: 'Debit' }], { session }))[0];
    }

    let accumDeprAccount = await ChartOfAccount.findOne({ accountCode: '1590' }).session(session);
    if (!accumDeprAccount) {
      accumDeprAccount = (await ChartOfAccount.create([{ accountCode: '1590', accountName: 'Accumulated Depreciation', type: 'Asset', normalBalance: 'Credit' }], { session }))[0];
    }

    const asset = new FixedAsset({
      assetCode: code,
      assetName,
      category,
      purchaseDate,
      purchaseCost,
      salvageValue,
      usefulLifeMonths,
      depreciationMethod,
      accumulatedDepreciation: 0,
      currentBookValue: purchaseCost,
      location,
      serialNumber,
      status: 'In Use',
      assetAccountId: assetAccount._id,
      depreciationExpenseAccountId: deprExpenseAccount._id,
      accumulatedDepreciationAccountId: accumDeprAccount._id,
    });

    await asset.save({ session });

    // If payment account is supplied, post purchase entry:
    // Dr: Fixed Assets
    // Cr: Cash / Bank
    if (paymentAccountId) {
      const paymentAccount = await ChartOfAccount.findById(paymentAccountId).session(session);
      if (paymentAccount) {
        await postJournalEntry({
          date: purchaseDate,
          referenceType: 'Asset Purchase',
          referenceId: asset._id,
          journalNumber: `JRN-${code}`,
          description: `Acquisition of fixed asset: ${assetName}`,
          lines: [
            { accountId: assetAccount._id, debit: purchaseCost, credit: 0, description: `Asset purchase: ${assetName}` },
            { accountId: paymentAccount._id, debit: 0, credit: purchaseCost, description: `Payment for asset: ${assetName}` },
          ],
          session,
        });
      }
    }

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ success: true, message: 'Fixed asset created successfully', data: asset });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ success: false, message: error.message });
  }
};

export const runDepreciation = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { assetId } = req.params;
    const asset = await FixedAsset.findById(assetId).session(session);
    if (!asset) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    if (asset.currentBookValue <= asset.salvageValue) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Asset is already fully depreciated' });
    }

    // Calculate 1 month depreciation
    const depreciableBase = asset.purchaseCost - asset.salvageValue;
    const monthlyDepreciation = Math.round((depreciableBase / asset.usefulLifeMonths) * 100) / 100;
    const actualDepreciation = Math.min(monthlyDepreciation, asset.currentBookValue - asset.salvageValue);

    asset.accumulatedDepreciation = (asset.accumulatedDepreciation || 0) + actualDepreciation;
    asset.currentBookValue = Math.max(asset.salvageValue, asset.purchaseCost - asset.accumulatedDepreciation);
    await asset.save({ session });

    // Post depreciation journal entry:
    // Dr: Depreciation Expense
    // Cr: Accumulated Depreciation
    await postJournalEntry({
      date: new Date(),
      referenceType: 'Depreciation',
      referenceId: asset._id,
      journalNumber: `JRN-DEP-${asset.assetCode}-${Date.now().toString().slice(-4)}`,
      description: `Monthly depreciation for asset ${asset.assetName} (${asset.assetCode})`,
      lines: [
        { accountId: asset.depreciationExpenseAccountId, debit: actualDepreciation, credit: 0 },
        { accountId: asset.accumulatedDepreciationAccountId, debit: 0, credit: actualDepreciation },
      ],
      session,
    });

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: `Depreciation of $${actualDepreciation} posted successfully`,
      data: asset,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ success: false, message: error.message });
  }
};
