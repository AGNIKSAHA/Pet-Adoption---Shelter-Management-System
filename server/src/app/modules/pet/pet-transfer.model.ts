import mongoose, { Document, Schema } from "mongoose";
export interface IPetTransferRequest extends Document {
    petId: mongoose.Types.ObjectId;
    fromShelterId: mongoose.Types.ObjectId;
    toShelterId: mongoose.Types.ObjectId;
    requestedBy: mongoose.Types.ObjectId;
    decidedBy?: mongoose.Types.ObjectId;
    status: "pending" | "approved" | "rejected";
    note?: string;
    decisionNote?: string;
    createdAt: Date;
    updatedAt: Date;
}
const petTransferRequestSchema = new Schema<IPetTransferRequest>({
    petId: { type: Schema.Types.ObjectId, ref: "Pet", required: true },
    fromShelterId: {
        type: Schema.Types.ObjectId,
        ref: "Shelter",
        required: true,
    },
    toShelterId: { type: Schema.Types.ObjectId, ref: "Shelter", required: true },
    requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    decidedBy: { type: Schema.Types.ObjectId, ref: "User" },
    status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
    },
    note: { type: String, trim: true },
    decisionNote: { type: String, trim: true },
}, { timestamps: true });
petTransferRequestSchema.index({ petId: 1, status: 1 });
petTransferRequestSchema.index({ toShelterId: 1, status: 1 });
petTransferRequestSchema.index({ requestedBy: 1, status: 1 });
export const PetTransferRequest = mongoose.model<IPetTransferRequest>("PetTransferRequest", petTransferRequestSchema);
