import mongoose from 'mongoose';
import { ACTIONS, MODULE_KEYS } from '../config/access.js';

// A custom role made on the Roles page. Users with this role have
// User.role === key. Built-in roles are not stored here (see config/access.js).
const permissionSchema = new mongoose.Schema({
  module: { type: String, enum: MODULE_KEYS, required: true },
  actions: [{ type: String, enum: ACTIONS }],
}, { _id: false });

const accessRoleSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, trim: true, lowercase: true, match: /^[a-z][a-z0-9_]{1,39}$/ },
  name: { type: String, required: true, trim: true, maxlength: 50 },
  description: { type: String, trim: true, default: '', maxlength: 200 },
  color: { type: String, enum: ['pink', 'yellow', 'blue', 'violet', 'green'], default: 'blue' },
  permissions: { type: [permissionSchema], default: [] },
  createBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  updateBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

accessRoleSchema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

/** { students: ['view', 'create'], ... } — the shape the client and authorize() use. */
accessRoleSchema.methods.permissionMap = function permissionMap() {
  const map = {};
  for (const p of this.permissions) if (p.actions.length) map[p.module] = [...p.actions];
  return map;
};

const AccessRole = mongoose.model('AccessRole', accessRoleSchema);
export default AccessRole;
