import mongoose, { Schema, Document } from "mongoose";

export interface IFosterAssignment extends Document {
  fosterId: mongoose.Types.ObjectId;
  petId: mongoose.Types.ObjectId;
  shelterId: mongoose.Types.ObjectId;
  startDate: Date;
  endDate?: Date;
  expectedDuration: number; // in days
  status: "active" | "completed" | "terminated";
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const fosterAssignmentSchema = new Schema<IFosterAssignment>(
  {
    fosterId: {
      type: Schema.Types.ObjectId,
      ref: "Foster",
      required: true,
    },
    petId: {
      type: Schema.Types.ObjectId,
      ref: "Pet",
      required: true,
    },
    shelterId: {
      type: Schema.Types.ObjectId,
      ref: "Shelter",
      required: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: Date,
    expectedDuration: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "completed", "terminated"],
      default: "active",
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

fosterAssignmentSchema.index({ fosterId: 1 });
fosterAssignmentSchema.index({ petId: 1 });
fosterAssignmentSchema.index({ shelterId: 1 });
fosterAssignmentSchema.index({ status: 1 });

export const FosterAssignment = mongoose.model<IFosterAssignment>(
  "FosterAssignment",
  fosterAssignmentSchema,
);
