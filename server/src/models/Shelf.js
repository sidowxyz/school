import mongoose from 'mongoose';

const shelfSchema = new mongoose.Schema({
  sh_name: { type: String, required: true, trim: true, unique: true },
  registerBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  updateBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, {
  timestamps: { createdAt: 'registerDate', updatedAt: 'updateDate' }
});

const Shelf = mongoose.model('Shelf', shelfSchema);
export default Shelf;
