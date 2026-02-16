import mongoose, { Schema, Document } from "mongoose";

export interface IFavorite extends Document {
  userId: mongoose.Types.ObjectId;
  petId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const favoriteSchema = new Schema<IFavorite>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    petId: {
      type: Schema.Types.ObjectId,
      ref: "Pet",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

favoriteSchema.index({ userId: 1, petId: 1 }, { unique: true });
favoriteSchema.index({ userId: 1 });

export const Favorite = mongoose.model<IFavorite>("Favorite", favoriteSchema);
