import mongoose from 'mongoose';

const bookSchema = new mongoose.Schema({
  book_name: { type: String, required: true, trim: true },
  author_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Author', required: true },
  cat_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'BookCategory', required: true },
  sh_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'Shelf', default: null },
  pages:     { type: Number, default: null },
  qty:       { type: Number, required: true, min: 0 },
  available_qty: { type: Number, required: true, min: 0 },
  version:   { type: String, default: null },
  isbn:      { type: String, unique: true, sparse: true, trim: true },
  file_name: { type: String, default: null },
  book_cover:{ type: String, default: null },
  view_count:  { type: Number, default: 0 },
  likes_count: { type: Number, default: 0 },
  isDeleted:   { type: Boolean, default: false },
  deletedAt:   { type: Date, default: null },
  registerBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  updateBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, {
  timestamps: { createdAt: 'registerDate', updatedAt: 'updateDate' }
});

// Full-text search index on book_name and isbn
bookSchema.index({ book_name: 'text', isbn: 'text' });
bookSchema.index({ author_id: 1 });
bookSchema.index({ cat_id: 1 });

const Book = mongoose.model('Book', bookSchema);
export default Book;
