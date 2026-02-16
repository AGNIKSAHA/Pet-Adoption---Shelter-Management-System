import mongoose, { Schema, Document } from "mongoose";

export interface IWebhook extends Document {
  userId: mongoose.Types.ObjectId;
  url: string;
  events: string[]; // e.g., ['application.submitted', 'application.approved', 'pet.created']
  secret: string; // For signing webhook payloads
  isActive: boolean;
  lastTriggeredAt?: Date;
  failureCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const webhookSchema = new Schema<IWebhook>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    url: {
      type: String,
      required: [true, "Webhook URL is required"],
      validate: {
        validator: function (v: string) {
          return /^https?:\/\/.+/.test(v);
        },
        message: "Invalid webhook URL",
      },
    },
    events: {
      type: [String],
      required: true,
      validate: {
        validator: function (v: string[]) {
          return v.length > 0;
        },
        message: "At least one event must be specified",
      },
    },
    secret: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastTriggeredAt: Date,
    failureCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

// Index for efficient queries
webhookSchema.index({ userId: 1, isActive: 1 });
webhookSchema.index({ events: 1, isActive: 1 });

export const Webhook = mongoose.model<IWebhook>("Webhook", webhookSchema);
