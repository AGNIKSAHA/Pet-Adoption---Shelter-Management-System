import { Request, Response } from "express";
import { Favorite } from "./favorite.model";
import { catchAsync } from "../../common/middlewares/catch.middleware";

export const toggleFavorite = catchAsync(
  async (req: Request, res: Response) => {
    const { petId } = req.body;
    const userId = req.user!.id;

    const existingFavorite = await Favorite.findOne({ userId, petId });

    if (existingFavorite) {
      await Favorite.findByIdAndDelete(existingFavorite._id);
      res.json({
        success: true,
        message: "Removed from favorites",
        isFavorite: false,
      });
    } else {
      await Favorite.create({ userId, petId });
      res.status(201).json({
        success: true,
        message: "Added to favorites",
        isFavorite: true,
      });
    }
  },
);

export const getMyFavorites = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const favorites = await Favorite.find({ userId }).populate({
      path: "petId",
      match: { isActive: true }, // Only show active pets
      populate: { path: "shelterId", select: "name" },
    });

    // Filter out favorites where petId is null (in case pet was deleted or marked inactive)
    const activeFavorites = favorites.filter((fav) => fav.petId !== null);

    res.json({
      success: true,
      data: activeFavorites.map((fav) => fav.petId),
    });
  },
);

export const checkIsFavorite = catchAsync(
  async (req: Request, res: Response) => {
    const { petId } = req.params;
    const userId = req.user!.id;

    const favorite = await Favorite.findOne({ userId, petId });

    res.json({
      success: true,
      isFavorite: !!favorite,
    });
  },
);
