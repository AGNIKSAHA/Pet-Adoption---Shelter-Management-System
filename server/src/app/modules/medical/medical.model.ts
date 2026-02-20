import mongoose, { Schema, Document } from "mongoose";
export interface IMedicalRecord extends Document {
    petId: mongoose.Types.ObjectId;
    recordType: "vaccination" | "correction" | "sterilization" | "condition" | "checkup" | "treatment";
    title: string;
    description: string;
    date: Date;
    veterinarian?: string;
    documents: string[];
    nextDueDate?: Date;
    correctsRecordId?: mongoose.Types.ObjectId;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
const medicalRecordSchema = new Schema<IMedicalRecord>({
    petId: {
        type: Schema.Types.ObjectId,
        ref: "Pet",
        required: [true, "Pet ID is required"],
    },
    recordType: {
        type: String,
        enum: [
            "vaccination",
            "correction",
            "sterilization",
            "condition",
            "checkup",
            "treatment",
        ],
        required: [true, "Record type is required"],
    },
    title: {
        type: String,
        required: [true, "Title is required"],
        trim: true,
    },
    description: {
        type: String,
        required: [true, "Description is required"],
    },
    date: {
        type: Date,
        required: [true, "Date is required"],
    },
    veterinarian: String,
    documents: {
        type: [String],
        default: [],
    },
    nextDueDate: Date,
    correctsRecordId: {
        type: Schema.Types.ObjectId,
        ref: "MedicalRecord",
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
}, {
    timestamps: true,
});
medicalRecordSchema.index({ petId: 1 });
medicalRecordSchema.index({ recordType: 1 });
medicalRecordSchema.index({ date: -1 });
medicalRecordSchema.index({ correctsRecordId: 1 });
export const MedicalRecord = mongoose.model<IMedicalRecord>("MedicalRecord", medicalRecordSchema);
