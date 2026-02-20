import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";
import { encrypt, decrypt } from "../../common/utils/crypto";

export interface IUserMembership {
  shelterId: mongoose.Types.ObjectId;
  role: "admin" | "shelter_staff" | "adopter";
}

export interface IUser extends Document {
  email: string;
  password: string;
  role: "admin" | "shelter_staff" | "adopter";
  roles: string[];
  memberships: IUserMembership[];
  firstName: string;
  lastName: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  shelterId?: mongoose.Types.ObjectId;
  shelterApprovalStatus?: "pending" | "approved" | "rejected";
  shelterRequestDate?: Date;
  isEmailVerified: boolean;
  isActive: boolean;
  activePlacementCount?: number;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },
    role: {
      type: String,
      enum: ["admin", "shelter_staff", "adopter"],
      default: "adopter",
    },
    roles: [
      {
        type: String,
        enum: ["admin", "shelter_staff", "adopter"],
      },
    ],
    memberships: [
      {
        shelterId: {
          type: Schema.Types.ObjectId,
          ref: "Shelter",
        },
        role: {
          type: String,
          enum: ["admin", "shelter_staff", "adopter"],
        },
      },
    ],
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      get: decrypt,
      set: encrypt,
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    shelterId: {
      type: Schema.Types.ObjectId,
      ref: "Shelter",
    },
    shelterApprovalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: undefined,
    },
    shelterRequestDate: {
      type: Date,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    activePlacementCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  },
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (
  candidatePassword: string,
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Indexes
userSchema.index({ role: 1 });
userSchema.index({ shelterId: 1 });

export const User =
  (mongoose.models.User as mongoose.Model<IUser>) ||
  mongoose.model<IUser>("User", userSchema);
