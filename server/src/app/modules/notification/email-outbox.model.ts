import mongoose, { Document, Schema } from "mongoose";
export type EmailOutboxStatus = "pending" | "sending" | "sent" | "failed";
export type EmailOutboxType = "application_status";
export interface IEmailOutbox extends Document {
    dedupKey: string;
    type: EmailOutboxType;
    to: string;
    payload: Record<string, unknown>;
    status: EmailOutboxStatus;
    attempts: number;
    lastError?: string;
    sentAt?: Date;
    sendingAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
const emailOutboxSchema = new Schema<IEmailOutbox>({
    dedupKey: {
        type: String,
        required: true,
        unique: true,
        index: true,
        trim: true,
    },
    type: {
        type: String,
        enum: ["application_status"],
        required: true,
        index: true,
    },
    to: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        index: true,
    },
    payload: {
        type: Schema.Types.Mixed,
        required: true,
    },
    status: {
        type: String,
        enum: ["pending", "sending", "sent", "failed"],
        default: "pending",
        index: true,
    },
    attempts: {
        type: Number,
        default: 0,
        min: 0,
    },
    lastError: {
        type: String,
        trim: true,
    },
    sentAt: {
        type: Date,
    },
    sendingAt: {
        type: Date,
    },
}, {
    timestamps: true,
});
emailOutboxSchema.index({ status: 1, createdAt: 1 });
export const EmailOutbox = (mongoose.models.EmailOutbox as mongoose.Model<IEmailOutbox>) ||
    mongoose.model<IEmailOutbox>("EmailOutbox", emailOutboxSchema);
