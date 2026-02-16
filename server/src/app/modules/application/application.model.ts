import mongoose, { Schema, Document } from "mongoose";

export type ApplicationStatus =
  | "submitted"
  | "reviewing"
  | "interview"
  | "approved"
  | "rejected";

export interface IApplication extends Document {
  petId: mongoose.Types.ObjectId;
  adopterId: mongoose.Types.ObjectId;
  shelterId: mongoose.Types.ObjectId;
  status: ApplicationStatus;
  questionnaire: {
    hasOwnedPetsBefore: boolean;
    currentPets: string;
    housingType: "house" | "apartment" | "condo" | "other";
    hasYard: boolean;
    householdMembers: number;
    hasChildren: boolean;
    childrenAges?: string;
    workSchedule: string;
    petCareExperience: string;
    whyAdopt: string;
  };
  references: {
    name: string;
    relationship: string;
    phone: string;
    email: string;
  }[];
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: mongoose.Types.ObjectId;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const applicationSchema = new Schema<IApplication>(
  {
    petId: {
      type: Schema.Types.ObjectId,
      ref: "Pet",
      required: [true, "Pet ID is required"],
    },
    adopterId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Adopter ID is required"],
    },
    shelterId: {
      type: Schema.Types.ObjectId,
      ref: "Shelter",
      required: [true, "Shelter ID is required"],
    },
    status: {
      type: String,
      enum: ["submitted", "reviewing", "interview", "approved", "rejected"],
      default: "submitted",
    },
    questionnaire: {
      hasOwnedPetsBefore: { type: Boolean, required: true },
      currentPets: { type: String, required: true },
      housingType: {
        type: String,
        enum: ["house", "apartment", "condo", "other"],
        required: true,
      },
      hasYard: { type: Boolean, required: true },
      householdMembers: { type: Number, required: true },
      hasChildren: { type: Boolean, required: true },
      childrenAges: String,
      workSchedule: { type: String, required: true },
      petCareExperience: { type: String, required: true },
      whyAdopt: { type: String, required: true },
    },
    references: [
      {
        name: { type: String, required: true },
        relationship: { type: String, required: true },
        phone: { type: String, required: true },
        email: { type: String, required: true },
      },
    ],
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    reviewedAt: Date,
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
applicationSchema.index({ petId: 1 });
applicationSchema.index({ adopterId: 1 });
applicationSchema.index({ shelterId: 1 });
applicationSchema.index({ status: 1 });
applicationSchema.index({ submittedAt: -1 });

// Prevent duplicate applications for same pet by same adopter
applicationSchema.index(
  { petId: 1, adopterId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ["submitted", "reviewing", "interview", "approved"] },
    },
  },
);

export const Application = mongoose.model<IApplication>(
  "Application",
  applicationSchema,
);
