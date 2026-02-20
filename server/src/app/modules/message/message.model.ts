import mongoose, { Schema, Document } from "mongoose";

export interface IMessage extends Document {
  senderId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  conversationId?: mongoose.Types.ObjectId;
  shelterId?: mongoose.Types.ObjectId;
  adopterId?: mongoose.Types.ObjectId;
  senderStaffId?: mongoose.Types.ObjectId;
  applicationId?: mongoose.Types.ObjectId;
  content: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "MessageConversation",
    },
    shelterId: {
      type: Schema.Types.ObjectId,
      ref: "Shelter",
    },
    adopterId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    senderStaffId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: "Application",
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

messageSchema.index({ senderId: 1, receiverId: 1 });
messageSchema.index({ conversationId: 1, createdAt: 1 });
messageSchema.index({ conversationId: 1, receiverId: 1, isRead: 1 });
messageSchema.index({ applicationId: 1 });
messageSchema.index({ createdAt: -1 });

export const Message = mongoose.model<IMessage>("Message", messageSchema);
