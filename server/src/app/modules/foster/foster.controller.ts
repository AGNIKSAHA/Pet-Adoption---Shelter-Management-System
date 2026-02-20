import { Pet } from "../pet/pet.model";
import { Request, Response } from "express";
import mongoose, { FilterQuery } from "mongoose";
import { Foster } from "./foster.model";
import { FosterAssignment } from "./foster-assignment.model";
import { StaffApplication } from "../shelter/staff-application.model";
import { User } from "../user/user.model";
import { catchAsync } from "../../common/middlewares/catch.middleware";
import { AppError } from "../../common/middlewares/error.middleware";

const MAX_FOSTER_SHELTERS_PER_ADOPTER = 3;

export const getFosters = catchAsync(async (req: Request, res: Response) => {
  const { status, shelterId, page = 1, limit = 20 } = req.query;
  const query: FilterQuery<typeof Foster> = { deletedAt: { $exists: false } };

  if (req.user!.role === "shelter_staff") {
    let targetShelterId =
      (shelterId as string) || req.user!.shelterId?.toString();

    if (!targetShelterId) {
      const approvedApp = await StaffApplication.findOne({
        userId: req.user!.id,
        status: "approved",
      });
      if (approvedApp) {
        targetShelterId = approvedApp.shelterId.toString();
      }
    }

    if (!targetShelterId) {
      res.json({
        success: true,
        data: {
          fosters: [],
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
            pages: 0,
          },
        },
      });
      return;
    }

    query.shelterId = targetShelterId;
  } else if (shelterId) {
    query.shelterId = shelterId;
  }

  if (status) query.status = status;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const [fosters, total] = await Promise.all([
    Foster.find(query)
      .populate("userId", "firstName lastName email phone activePlacementCount")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Foster.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: {
      fosters,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    },
  });
});

export const updateFosterStatus = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    const foster = await Foster.findById(id);
    if (!foster) {
      throw new AppError(404, "Foster not found");
    }

    if (req.user!.role === "shelter_staff") {
      let shelterId = req.user!.shelterId?.toString();
      if (shelterId !== foster.shelterId.toString()) {
        const approvedApp = await StaffApplication.findOne({
          userId: req.user!.id,
          shelterId: foster.shelterId,
          status: "approved",
        });
        if (approvedApp) {
          shelterId = approvedApp.shelterId.toString();
        }
      }

      if (!shelterId || foster.shelterId.toString() !== shelterId) {
        throw new AppError(403, "Access denied");
      }
    }

    if (status === "approved" && foster.status !== "approved") {
      const approvedShelterCount = await Foster.countDocuments({
        userId: foster.userId,
        _id: { $ne: foster._id },
        status: "approved",
        deletedAt: { $exists: false },
      });

      if (approvedShelterCount >= MAX_FOSTER_SHELTERS_PER_ADOPTER) {
        throw new AppError(
          400,
          `Adopter can be approved as foster parent for maximum ${MAX_FOSTER_SHELTERS_PER_ADOPTER} shelters`,
        );
      }
    }

    foster.status = status;
    if (status === "approved") {
      foster.approvedAt = new Date();
      foster.approvedBy = new mongoose.Types.ObjectId(req.user!.id);
    }

    await foster.save();

    res.json({
      success: true,
      message: `Foster status updated to ${status}`,
      data: foster,
    });
  },
);

export const toggleFosterActive = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { isActive } = req.body;

    const foster = await Foster.findById(id);
    if (!foster || foster.deletedAt) {
      throw new AppError(404, "Foster not found");
    }

    // Authorization check
    if (req.user!.role === "adopter") {
      if (foster.userId.toString() !== req.user!.id) {
        throw new AppError(403, "Access denied");
      }
    } else if (req.user!.role === "shelter_staff") {
      let shelterId = req.user!.shelterId?.toString();
      if (shelterId !== foster.shelterId.toString()) {
        const approvedApp = await StaffApplication.findOne({
          userId: req.user!.id,
          shelterId: foster.shelterId,
          status: "approved",
        });
        if (approvedApp) {
          shelterId = approvedApp.shelterId.toString();
        }
      }
      if (!shelterId || foster.shelterId.toString() !== shelterId) {
        throw new AppError(403, "Access denied");
      }
    }

    foster.isActive = isActive;
    await foster.save();

    res.json({
      success: true,
      message: `Foster ${isActive ? "activated" : "deactivated"} successfully`,
      data: foster,
    });
  },
);

export const deleteFoster = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const foster = await Foster.findById(id);
  if (!foster || foster.deletedAt) {
    throw new AppError(404, "Foster record not found");
  }

  // Only staff can delete
  let shelterId = req.user!.shelterId?.toString();
  if (shelterId !== foster.shelterId.toString()) {
    const approvedApp = await StaffApplication.findOne({
      userId: req.user!.id,
      shelterId: foster.shelterId,
      status: "approved",
    });
    if (approvedApp) {
      shelterId = approvedApp.shelterId.toString();
    }
  }

  if (!shelterId || foster.shelterId.toString() !== shelterId) {
    throw new AppError(403, "Access denied");
  }

  // Check if they have active assignments
  const activeAssignments = await FosterAssignment.countDocuments({
    fosterId: id,
    status: "active",
  });

  if (activeAssignments > 0) {
    throw new AppError(
      400,
      "Cannot delete foster parent with active assignments",
    );
  }

  foster.deletedAt = new Date();
  foster.isActive = false;
  await foster.save();

  res.json({
    success: true,
    message: "Foster record deleted successfully",
  });
});

export const getFosterAssignments = catchAsync(
  async (req: Request, res: Response) => {
    const { shelterId } = req.query;
    const query: FilterQuery<typeof FosterAssignment> = { status: "active" };

    if (req.user!.role === "shelter_staff") {
      let targetShelterId =
        (shelterId as string) || req.user!.shelterId?.toString();

      if (!targetShelterId) {
        const approvedApp = await StaffApplication.findOne({
          userId: req.user!.id,
          status: "approved",
        });
        if (approvedApp) {
          targetShelterId = approvedApp.shelterId.toString();
        }
      }

      if (!targetShelterId) {
        res.json({ success: true, data: [] });
        return;
      }

      query.shelterId = targetShelterId;
    } else if (shelterId) {
      query.shelterId = shelterId;
    }

    const assignments = await FosterAssignment.find(query)
      .populate({
        path: "fosterId",
        populate: { path: "userId", select: "firstName lastName" },
      })
      .populate("petId", "name species breed photos")
      .sort({ startDate: -1 });

    res.json({
      success: true,
      data: assignments,
    });
  },
);

const isTransactionUnsupportedError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false;
  const maybeErr = error as { code?: number; message?: string };
  return (
    maybeErr.code === 20 ||
    maybeErr.message?.includes(
      "Transaction numbers are only allowed on a replica set member or mongos",
    ) === true
  );
};

const assignPetToFosterCore = async (
  req: Request,
  payload: {
    fosterId: string;
    petId: string;
    expectedDuration: number;
    notes?: string;
  },
  session?: mongoose.ClientSession,
) => {
  const { fosterId, petId, expectedDuration, notes } = payload;

  let petQuery = Pet.findById(petId);
  if (session) petQuery = petQuery.session(session);
  const pet = await petQuery;
  if (!pet) {
    throw new AppError(404, "Pet not found");
  }

  let shelterId = req.user!.shelterId?.toString();
  if (shelterId !== pet.shelterId.toString()) {
    let approvedAppQuery = StaffApplication.findOne({
      userId: req.user!.id,
      shelterId: pet.shelterId,
      status: "approved",
    });
    if (session) approvedAppQuery = approvedAppQuery.session(session);
    const approvedApp = await approvedAppQuery;
    if (approvedApp) {
      shelterId = approvedApp.shelterId.toString();
    }
  }

  if (!shelterId || pet.shelterId.toString() !== shelterId) {
    throw new AppError(403, "Access denied. Pet is not in your shelter");
  }

  if (pet.status === "fostered") {
    throw new AppError(400, "Pet is already in foster");
  }

  let fosterQuery = Foster.findById(fosterId);
  if (session) fosterQuery = fosterQuery.session(session);
  const foster = await fosterQuery;
  if (!foster || foster.shelterId.toString() !== shelterId) {
    throw new AppError(404, "Foster parent not found in your shelter");
  }

  if (foster.status !== "approved") {
    throw new AppError(400, "Foster parent is not approved");
  }

  if (foster.currentAnimals >= foster.capacity) {
    throw new AppError(400, "Foster parent has reached maximum capacity");
  }

  if (foster.preferredSpecies && foster.preferredSpecies.length > 0) {
    const isMatch = foster.preferredSpecies.some((pref) => {
      const p = pref.toLowerCase();
      const s = pet.species.toLowerCase();
      return p.includes(s) || s.includes(p);
    });

    if (!isMatch) {
      throw new AppError(
        400,
        `This foster parent only accepts: ${foster.preferredSpecies.join(", ")}`,
      );
    }
  }

  let fosterUserQuery = User.findById(foster.userId);
  if (session) fosterUserQuery = fosterUserQuery.session(session);
  const fosterUser = await fosterUserQuery;
  if (!fosterUser) {
    throw new AppError(404, "Foster user not found");
  }

  let fosterIdsQuery = Foster.find({ userId: foster.userId });
  if (session) fosterIdsQuery = fosterIdsQuery.session(session);
  const fosterIds = await fosterIdsQuery.distinct("_id");

  let activePlacementCountQuery = FosterAssignment.countDocuments({
    fosterId: { $in: fosterIds },
    status: "active",
  });
  if (session)
    activePlacementCountQuery = activePlacementCountQuery.session(session);
  const actualActivePlacements = await activePlacementCountQuery;

  if (fosterUser.activePlacementCount !== actualActivePlacements) {
    fosterUser.activePlacementCount = actualActivePlacements;
    if (session) {
      await fosterUser.save({ session });
    } else {
      await fosterUser.save();
    }
  }

  const updatedFosterUser = await User.findOneAndUpdate(
    {
      _id: foster.userId,
      $or: [
        { activePlacementCount: { $exists: false } },
        { activePlacementCount: { $lt: 3 } },
      ],
    },
    { $inc: { activePlacementCount: 1 } },
    session ? { new: true, session } : { new: true },
  );

  if (!updatedFosterUser) {
    throw new AppError(
      400,
      "Foster parent has reached federation-wide hard limit (3 active placements)",
    );
  }

  let createdAssignment;
  if (session) {
    const [assignment] = await FosterAssignment.create(
      [
        {
          fosterId,
          petId,
          shelterId,
          expectedDuration,
          notes,
          status: "active",
        },
      ],
      { session },
    );
    createdAssignment = assignment;
  } else {
    createdAssignment = await FosterAssignment.create({
      fosterId,
      petId,
      shelterId,
      expectedDuration,
      notes,
      status: "active",
    });
  }

  foster.currentAnimals += 1;
  if (session) {
    await foster.save({ session });
  } else {
    await foster.save();
  }

  pet.status = "fostered";
  if (session) {
    await pet.save({ session });
  } else {
    await pet.save();
  }

  return createdAssignment;
};

export const assignPetToFoster = catchAsync(
  async (req: Request, res: Response) => {
    const { fosterId, petId, expectedDuration, notes } = req.body;
    const payload = { fosterId, petId, expectedDuration, notes };
    let createdAssignment;

    const session = await mongoose.startSession();
    try {
      try {
        await session.withTransaction(async () => {
          createdAssignment = await assignPetToFosterCore(
            req,
            payload,
            session,
          );
        });
      } catch (error) {
        if (!isTransactionUnsupportedError(error)) {
          throw error;
        }
        createdAssignment = await assignPetToFosterCore(req, payload);
      }
    } finally {
      await session.endSession();
    }

    res.status(201).json({
      success: true,
      message: "Pet assigned to foster successfully",
      data: createdAssignment,
    });
  },
);

const takeBackPetFromFosterCore = async (
  req: Request,
  assignmentId: string,
  returnStatus = "available",
  returnNotes?: string,
  session?: mongoose.ClientSession,
) => {
  let assignmentQuery = FosterAssignment.findById(assignmentId);
  if (session) assignmentQuery = assignmentQuery.session(session);
  const assignment = await assignmentQuery;
  if (!assignment || assignment.status !== "active") {
    throw new AppError(404, "Active foster assignment not found");
  }

  if (req.user!.role === "shelter_staff") {
    let shelterId = req.user!.shelterId?.toString();
    if (shelterId !== assignment.shelterId.toString()) {
      let approvedAppQuery = StaffApplication.findOne({
        userId: req.user!.id,
        shelterId: assignment.shelterId,
        status: "approved",
      });
      if (session) approvedAppQuery = approvedAppQuery.session(session);
      const approvedApp = await approvedAppQuery;
      if (approvedApp) {
        shelterId = approvedApp.shelterId.toString();
      }
    }

    if (!shelterId || assignment.shelterId.toString() !== shelterId) {
      throw new AppError(403, "Access denied");
    }
  }

  let petQuery = Pet.findById(assignment.petId);
  if (session) petQuery = petQuery.session(session);
  const pet = await petQuery;

  let fosterQuery = Foster.findById(assignment.fosterId);
  if (session) fosterQuery = fosterQuery.session(session);
  const foster = await fosterQuery;

  assignment.status = "completed";
  assignment.endDate = new Date();
  if (returnNotes) {
    assignment.notes = `${assignment.notes}\n\nReturn Notes: ${returnNotes}`;
  }
  if (session) {
    await assignment.save({ session });
  } else {
    await assignment.save();
  }

  if (foster) {
    foster.currentAnimals = Math.max(0, foster.currentAnimals - 1);
    if (session) {
      await foster.save({ session });
    } else {
      await foster.save();
    }

    await User.findByIdAndUpdate(
      foster.userId,
      [
        {
          $set: {
            activePlacementCount: {
              $max: [{ $subtract: ["$activePlacementCount", 1] }, 0],
            },
          },
        },
      ],
      session ? { session } : undefined,
    );
  }

  if (pet) {
    pet.status = returnStatus as
      | "available"
      | "intake"
      | "medical_hold"
      | "meet"
      | "adopted"
      | "returned"
      | "fostered"
      | "transferred"
      | "deceased";
    if (session) {
      await pet.save({ session });
    } else {
      await pet.save();
    }
  }

  return assignment;
};

export const takeBackPetFromFoster = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params; // Assignment ID
    const { returnStatus = "available", notes: returnNotes } = req.body;

    const session = await mongoose.startSession();
    let updatedAssignment;
    try {
      try {
        await session.withTransaction(async () => {
          updatedAssignment = await takeBackPetFromFosterCore(
            req,
            id,
            returnStatus,
            returnNotes,
            session,
          );
        });
      } catch (error) {
        if (!isTransactionUnsupportedError(error)) {
          throw error;
        }
        updatedAssignment = await takeBackPetFromFosterCore(
          req,
          id,
          returnStatus,
          returnNotes,
        );
      }
    } finally {
      await session.endSession();
    }

    res.json({
      success: true,
      message: "Pet taken back from foster successfully",
      data: updatedAssignment,
    });
  },
);

export const applyToBeFoster = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const {
      shelterId,
      capacity,
      experience,
      homeType,
      hasYard,
      preferredSpecies,
      availability,
    } = req.body;

    // Check if already applied
    const existingApplication = await Foster.findOne({ userId, shelterId });
    if (existingApplication) {
      throw new AppError(
        400,
        "You have already applied to foster for this shelter",
      );
    }

    const linkedShelterCount = await Foster.countDocuments({
      userId,
      deletedAt: { $exists: false },
      status: { $in: ["pending", "approved"] },
    });

    if (linkedShelterCount >= MAX_FOSTER_SHELTERS_PER_ADOPTER) {
      throw new AppError(
        400,
        `You can apply as foster parent for maximum ${MAX_FOSTER_SHELTERS_PER_ADOPTER} shelters`,
      );
    }

    const foster = await Foster.create({
      userId,
      shelterId,
      capacity,
      experience,
      homeType,
      hasYard,
      preferredSpecies,
      availability,
      status: "pending",
    });

    res.status(201).json({
      success: true,
      message: "Foster application submitted successfully",
      data: foster,
    });
  },
);

export const getAdopterFosterStatus = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const [foster] = await Foster.find({
      userId,
      deletedAt: { $exists: false },
    })
      .sort({
        status: 1,
        updatedAt: -1,
      })
      .limit(1)
      .populate("shelterId", "name");

    res.json({
      success: true,
      data: foster,
    });
  },
);

export const getAdopterFosterShelters = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const fosterRecords = await Foster.find({
      userId,
      deletedAt: { $exists: false },
    })
      .populate("shelterId", "name")
      .sort({ createdAt: -1 });

    const shelterCount = fosterRecords.filter((record) =>
      ["pending", "approved"].includes(record.status),
    ).length;

    res.json({
      success: true,
      data: {
        records: fosterRecords,
        shelterCount,
        maxShelters: MAX_FOSTER_SHELTERS_PER_ADOPTER,
      },
    });
  },
);

export const updateFosterProfile = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { preferredSpecies, capacity, availability } = req.body;

    const foster = await Foster.findOne({
      userId,
      deletedAt: { $exists: false },
    });
    if (!foster) {
      throw new AppError(404, "Foster profile not found");
    }

    if (preferredSpecies) foster.preferredSpecies = preferredSpecies;
    if (capacity) foster.capacity = capacity;
    if (availability) foster.availability = availability;

    await foster.save();

    res.json({
      success: true,
      message: "Foster profile updated successfully",
      data: foster,
    });
  },
);

export const updateAdopterFosterPreferencesById = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;
    const { preferredSpecies, capacity, availability } = req.body;

    const foster = await Foster.findOne({
      _id: id,
      userId,
      deletedAt: { $exists: false },
    });

    if (!foster) {
      throw new AppError(404, "Foster profile not found");
    }

    if (capacity !== undefined) {
      const nextCapacity = Number(capacity);
      if (!Number.isFinite(nextCapacity) || nextCapacity < 1) {
        throw new AppError(400, "Capacity must be at least 1");
      }
      if (nextCapacity < foster.currentAnimals) {
        throw new AppError(
          400,
          "Capacity cannot be lower than current assigned animals",
        );
      }
      foster.capacity = nextCapacity;
    }

    if (preferredSpecies) foster.preferredSpecies = preferredSpecies;
    if (availability) foster.availability = availability;

    await foster.save();

    res.json({
      success: true,
      message: "Foster profile updated successfully",
      data: foster,
    });
  },
);

export const getAdopterAssignments = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const foster = await Foster.findOne({ userId });

    if (!foster) {
      res.json({ success: true, data: [] });
      return;
    }

    const assignments = await FosterAssignment.find({
      fosterId: foster._id,
      status: "active",
    })
      .populate("petId", "name species breed photos age gender size")
      .populate("shelterId", "name email phone");

    res.json({
      success: true,
      data: assignments,
    });
  },
);
