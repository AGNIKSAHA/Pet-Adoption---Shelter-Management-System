import mongoose, { Document, Schema } from "mongoose";
export interface IMessageHandoff {
    fromStaffId?: mongoose.Types.ObjectId;
    toStaffId: mongoose.Types.ObjectId;
    reason?: string;
    handoffAt: Date;
}
export interface IMessageConversation extends Document {
    shelterId: mongoose.Types.ObjectId;
    adopterId: mongoose.Types.ObjectId;
    assignedStaffId?: mongoose.Types.ObjectId;
    lastMessage?: string;
    lastMessageAt?: Date;
    handoffHistory: IMessageHandoff[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
const handoffSchema = new Schema<IMessageHandoff>({
    fromStaffId: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    toStaffId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    reason: {
        type: String,
        trim: true,
    },
    handoffAt: {
        type: Date,
        default: Date.now,
    },
}, { _id: false });
const messageConversationSchema = new Schema<IMessageConversation>({
    shelterId: {
        type: Schema.Types.ObjectId,
        ref: "Shelter",
        required: true,
        index: true,
    },
    adopterId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    assignedStaffId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true,
    },
    lastMessage: {
        type: String,
        trim: true,
    },
    lastMessageAt: {
        type: Date,
        index: true,
    },
    handoffHistory: {
        type: [handoffSchema],
        default: [],
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true,
    },
}, {
    timestamps: true,
});
messageConversationSchema.index({ shelterId: 1, adopterId: 1, isActive: 1 }, { unique: true, partialFilterExpression: { isActive: true } });
export const MessageConversation = (mongoose.models.MessageConversation as mongoose.Model<IMessageConversation>) ||
    mongoose.model<IMessageConversation>("MessageConversation", messageConversationSchema);
