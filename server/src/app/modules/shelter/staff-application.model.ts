import mongoose, { Schema, Document } from "mongoose";
export interface IStaffApplication extends Document {
    userId: mongoose.Types.ObjectId;
    shelterId: mongoose.Types.ObjectId;
    status: "pending" | "approved" | "rejected";
    requestDate: Date;
    updatedAt: Date;
}
const staffApplicationSchema = new Schema<IStaffApplication>({
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
    requestDate: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
});
staffApplicationSchema.index({ userId: 1, shelterId: 1 }, { unique: true });
export const StaffApplication = (mongoose.models.StaffApplication as mongoose.Model<IStaffApplication>) ||
    mongoose.model<IStaffApplication>("StaffApplication", staffApplicationSchema);
