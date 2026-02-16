import { Request, Response } from "express";
import { catchAsync } from "../../common/middlewares/catch.middleware";
import * as petService from "./pet.service";

export const createPet = catchAsync(async (req: Request, res: Response) => {
  const pet = await petService.createPetInDB(
    req.body,
    req.user!.id,
    req.user!.role,
    req.user!.shelterId,
    req.ip,
    req.get("user-agent"),
  );

  res.status(201).json({
    success: true,
    message: "Pet created successfully",
    data: { pet },
  });
});

export const getPets = catchAsync(async (req: Request, res: Response) => {
  const result = await petService.getPetsFromDB(req.query);

  res.json({
    success: true,
    data: result,
  });
});

export const getPetStats = catchAsync(async (req: Request, res: Response) => {
  const stats = await petService.getPetStatsFromDB(
    req.user!.role,
    req.user!.shelterId,
    req.query.shelterId as string,
  );

  res.json({
    success: true,
    data: stats,
  });
});

export const getPetById = catchAsync(async (req: Request, res: Response) => {
  const pet = await petService.getPetByIdFromDB(req.params.id);

  res.json({
    success: true,
    data: { pet },
  });
});

export const updatePet = catchAsync(async (req: Request, res: Response) => {
  const pet = await petService.updatePetInDB(
    req.params.id,
    req.body,
    req.user!.id,
    req.user!.role,
    req.user!.shelterId,
    req.ip,
    req.get("user-agent"),
  );

  res.json({
    success: true,
    message: "Pet updated successfully",
    data: { pet },
  });
});

export const updatePetStatus = catchAsync(
  async (req: Request, res: Response) => {
    const pet = await petService.updatePetStatusInDB(
      req.params.id,
      req.body.status,
      req.user!.id,
      req.user!.role,
      req.user!.shelterId,
      req.ip,
      req.get("user-agent"),
    );

    res.json({
      success: true,
      message: "Pet status updated successfully",
      data: { pet },
    });
  },
);

export const deletePet = catchAsync(async (req: Request, res: Response) => {
  await petService.deletePetInDB(
    req.params.id,
    req.user!.id,
    req.user!.role,
    req.user!.shelterId,
    req.ip,
    req.get("user-agent"),
  );

  res.json({
    success: true,
    message: "Pet deleted successfully",
  });
});

export const searchNearby = catchAsync(async (req: Request, res: Response) => {
  const {
    longitude,
    latitude,
    maxDistance = "50000",
    page = "1",
    limit = "20",
  } = req.query;

  const result = await petService.searchNearbyInDB(
    longitude as string,
    latitude as string,
    maxDistance as string,
    page as string,
    limit as string,
  );

  res.json({
    success: true,
    data: result,
  });
});
