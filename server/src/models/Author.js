import mongoose from 'mongoose';

const authorSchema = new mongoose.Schema({
  author_name: { type: String, required: true, trim: true },
  description: { type: String, default: null },
  author_photo: { type: String, default: null },
  registerBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  updateBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, {
  timestamps: { createdAt: 'registerDate', updatedAt: 'updateDate' }
});

authorSchema.index({ author_name: 'text' });

const Author = mongoose.model('Author', authorSchema);
export default Author;
