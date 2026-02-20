import mongoose, { Schema, Document } from "mongoose";

export interface IShelter extends Document {
  name: string;
  description: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  location: {
    type: string;
    coordinates: [number, number]; // [longitude, latitude]
  };
  website?: string;
  timezone?: string;
  capacity: number;
  currentOccupancy: number;
  isActive: boolean;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const shelterSchema = new Schema<IShelter>(
  {
    name: {
      type: String,
      required: [true, "Shelter name is required"],
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Phone is required"],
    },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: { type: String, required: true },
      country: { type: String, required: true },
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    website: String,
    timezone: {
      type: String,
      default: "UTC",
      trim: true,
    },
    capacity: {
      type: Number,
      required: [true, "Capacity is required"],
      min: [1, "Capacity must be at least 1"],
    },
    currentOccupancy: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

// Geospatial index for location-based queries
shelterSchema.index({ location: "2dsphere" });
shelterSchema.index({ isActive: 1 });
shelterSchema.index({ createdBy: 1 });

export const Shelter =
  (mongoose.models.Shelter as mongoose.Model<IShelter>) ||
  mongoose.model<IShelter>("Shelter", shelterSchema);
