import mongoose from 'mongoose';

const fixedAssetSchema = new mongoose.Schema(
  {
    assetCode: { type: String, required: true, unique: true },
    assetName: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['Buildings', 'Vehicles', 'Computers & IT', 'Furniture & Fixtures', 'Lab Equipment', 'Other'],
      default: 'Furniture & Fixtures',
    },
    purchaseDate: { type: Date, required: true },
    purchaseCost: { type: Number, required: true, min: 0 },
    salvageValue: { type: Number, default: 0, min: 0 },
    usefulLifeMonths: { type: Number, required: true, min: 1 },
    depreciationMethod: {
      type: String,
      enum: ['Straight Line', 'Declining Balance'],
      default: 'Straight Line',
    },
    accumulatedDepreciation: { type: Number, default: 0, min: 0 },
    currentBookValue: { type: Number, required: true, min: 0 },
    location: { type: String, trim: true },
    serialNumber: { type: String, trim: true },
    status: {
      type: String,
      enum: ['In Use', 'Under Maintenance', 'Disposed', 'Written Off'],
      default: 'In Use',
    },
    assetAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChartOfAccount',
    },
    depreciationExpenseAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChartOfAccount',
    },
    accumulatedDepreciationAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChartOfAccount',
    },
  },
  { timestamps: true }
);

export default mongoose.models.FixedAsset || mongoose.model('FixedAsset', fixedAssetSchema);
