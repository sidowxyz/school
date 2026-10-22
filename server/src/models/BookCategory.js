import mongoose from 'mongoose';

const bookCategorySchema = new mongoose.Schema({
  cat_name: { type: String, required: true, trim: true, unique: true },
  registerBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  updateBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, {
  timestamps: { createdAt: 'registerDate', updatedAt: 'updateDate' }
});

const BookCategory = mongoose.model('BookCategory', bookCategorySchema);
export default BookCategory;
