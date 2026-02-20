import crypto from "crypto";
import mongoose, { Document, Schema } from "mongoose";
export interface IPetVetApproval extends Document {
    petId: mongoose.Types.ObjectId;
    shelterId: mongoose.Types.ObjectId;
    requestedBy: mongoose.Types.ObjectId;
    vetEmail: string;
    requestNote?: string;
    token: string;
    status: "pending" | "approved" | "rejected";
    decidedAt?: Date;
    decisionNote?: string;
    createdAt: Date;
    updatedAt: Date;
}
const petVetApprovalSchema = new Schema<IPetVetApproval>({
    petId: { type: Schema.Types.ObjectId, ref: "Pet", required: true },
    shelterId: { type: Schema.Types.ObjectId, ref: "Shelter", required: true },
    requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    vetEmail: { type: String, required: true, lowercase: true, trim: true },
    requestNote: { type: String },
    token: {
        type: String,
        required: true,
        unique: true,
        default: () => crypto.randomBytes(24).toString("hex"),
    },
    status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
    },
    decidedAt: { type: Date },
    decisionNote: { type: String },
}, { timestamps: true });
petVetApprovalSchema.index({ petId: 1, status: 1 });
petVetApprovalSchema.index({ token: 1 }, { unique: true });
export const PetVetApproval = mongoose.model<IPetVetApproval>("PetVetApproval", petVetApprovalSchema);
