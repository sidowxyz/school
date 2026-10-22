import mongoose from "mongoose";

const roleSchema = new mongoose.Schema(
  {
    role_no: {
      type: Number,
      required: true,
      unique: true,
    },

    role_name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      maxlength: 50,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    createBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    updateBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: {
      createdAt: "createDate",
      updatedAt: "updateDate",
    },
  }
);

export default mongoose.model("Role", roleSchema);