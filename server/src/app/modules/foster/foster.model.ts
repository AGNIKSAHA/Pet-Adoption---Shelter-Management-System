import mongoose, { Schema, Document } from "mongoose";

export interface IFoster extends Document {
  userId: mongoose.Types.ObjectId;
  shelterId: mongoose.Types.ObjectId;
  status: "pending" | "approved" | "rejected";
  capacity: number;
  currentAnimals: number;
  experience: string;
  homeType: "house" | "apartment" | "condo" | "other";
  hasYard: boolean;
  preferredSpecies: string[];
  availability: string;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  isActive: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const fosterSchema = new Schema<IFoster>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    shelterId: {
      type: Schema.Types.ObjectId,
      ref: "Shelter",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
    },
    currentAnimals: {
      type: Number,
      default: 0,
      min: 0,
    },
    experience: {
      type: String,
      required: true,
    },
    homeType: {
      type: String,
      enum: ["house", "apartment", "condo", "other"],
      required: true,
    },
    hasYard: {
      type: Boolean,
      default: false,
    },
    preferredSpecies: {
      type: [String],
      default: [],
    },
    availability: {
      type: String,
      required: true,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: Date,
    isActive: {
      type: Boolean,
      default: true,
    },
    deletedAt: Date,
  },
  {
    timestamps: true,
  },
);

fosterSchema.index({ userId: 1 });
fosterSchema.index({ shelterId: 1 });
fosterSchema.index({ status: 1 });
fosterSchema.index({ isActive: 1 });
fosterSchema.index({ deletedAt: 1 });

export const Foster = mongoose.model<IFoster>("Foster", fosterSchema);
