import { Request, Response } from "express";
import { catchAsync } from "../../common/middlewares/catch.middleware";
import * as petService from "./pet.service";
import { AppError } from "../../common/middlewares/error.middleware";

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

export const requestVetMedicalRelease = catchAsync(
  async (req: Request, res: Response) => {
    const { vetEmail, requestNote } = req.body;
    const result = await petService.requestVetMedicalReleaseInDB(
      req.params.id,
      vetEmail,
      requestNote,
      req.user!.id,
      req.user!.role,
      req.ip,
      req.get("user-agent"),
    );

    res.status(201).json({
      success: true,
      message: "Vet sign-off request sent successfully",
      data: { requestId: result._id, status: result.status },
    });
  },
);

export const processVetMedicalRelease = catchAsync(
  async (req: Request, res: Response) => {
    const decision =
      (req.params.decision === "approve" ? "approve" : "reject") as
        | "approve"
        | "reject";

    const result = await petService.processVetMedicalReleaseInDB(
      req.params.token,
      decision,
    );

    res
      .status(200)
      .send(`
        <html>
          <body style="font-family: Arial, sans-serif; padding: 24px;">
            <h2>Vet Decision Recorded</h2>
            <p>Pet: <strong>${result.petName}</strong></p>
            <p>Decision: <strong>${result.status.toUpperCase()}</strong></p>
            <p>You can now close this tab.</p>
          </body>
        </html>
      `);
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

export const createPetTransferRequest = catchAsync(
  async (req: Request, res: Response) => {
    const { petId, toShelterId, note } = req.body;
    const request = await petService.createPetTransferRequestInDB(
      petId,
      toShelterId,
      note,
      req.user!.id,
      req.ip,
      req.get("user-agent"),
    );

    res.status(201).json({
      success: true,
      message: "Pet transfer request sent",
      data: { request },
    });
  },
);

export const getMyPetTransferRequests = catchAsync(
  async (req: Request, res: Response) => {
    const result = await petService.getPetTransferRequestsForStaffInDB(req.user!.id);
    res.json({ success: true, data: result });
  },
);

export const respondPetTransferRequest = catchAsync(
  async (req: Request, res: Response) => {
    const { decision, decisionNote } = req.body as {
      decision: "approved" | "rejected";
      decisionNote?: string;
    };
    const request = await petService.respondPetTransferRequestInDB(
      req.params.id,
      decision,
      decisionNote,
      req.user!.id,
      req.ip,
      req.get("user-agent"),
    );

    res.json({
      success: true,
      message: `Transfer request ${decision}`,
      data: { request },
    });
  },
);

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

export const uploadPetImage = catchAsync(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new AppError(400, "Image file is required");
  }

  const fileUrl = `/uploads/pet-images/${req.file.filename}`;

  res.status(201).json({
    success: true,
    message: "Pet image uploaded",
    data: { url: fileUrl, filename: req.file.filename },
  });
});
