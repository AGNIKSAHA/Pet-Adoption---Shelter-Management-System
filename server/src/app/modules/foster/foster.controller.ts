import { Pet } from "../pet/pet.model";
import { Request, Response } from "express";
import mongoose, { FilterQuery } from "mongoose";
import { Foster } from "./foster.model";
import { FosterAssignment } from "./foster-assignment.model";
import { StaffApplication } from "../shelter/staff-application.model";
import { catchAsync } from "../../common/middlewares/catch.middleware";
import { AppError } from "../../common/middlewares/error.middleware";

export const getFosters = catchAsync(async (req: Request, res: Response) => {
  const { status, shelterId, page = 1, limit = 20 } = req.query;
  const query: FilterQuery<typeof Foster> = { deletedAt: { $exists: false } };

  if (req.user!.role === "shelter_staff") {
    let staffShelterId = req.user!.shelterId;

    if (!staffShelterId) {
      const approvedApp = await StaffApplication.findOne({
        userId: req.user!.id,
        status: "approved",
      });
      if (approvedApp) {
        staffShelterId = approvedApp.shelterId.toString();
      }
    }

    if (!staffShelterId) {
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

    query.shelterId = staffShelterId;
  } else if (shelterId) {
    query.shelterId = shelterId;
  }

  if (status) query.status = status;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const [fosters, total] = await Promise.all([
    Foster.find(query)
      .populate("userId", "firstName lastName email phone")
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
      let shelterId = req.user!.shelterId;
      if (!shelterId) {
        const approvedApp = await StaffApplication.findOne({
          userId: req.user!.id,
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
      let shelterId = req.user!.shelterId;
      if (!shelterId) {
        const approvedApp = await StaffApplication.findOne({
          userId: req.user!.id,
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
  let shelterId = req.user!.shelterId;
  if (!shelterId) {
    const approvedApp = await StaffApplication.findOne({
      userId: req.user!.id,
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
      let staffShelterId = req.user!.shelterId;

      if (!staffShelterId) {
        const approvedApp = await StaffApplication.findOne({
          userId: req.user!.id,
          status: "approved",
        });
        if (approvedApp) {
          staffShelterId = approvedApp.shelterId.toString();
        }
      }

      if (!staffShelterId) {
        res.json({ success: true, data: [] });
        return;
      }

      query.shelterId = staffShelterId;
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

export const assignPetToFoster = catchAsync(
  async (req: Request, res: Response) => {
    const { fosterId, petId, expectedDuration, notes } = req.body;
    let shelterId = req.user!.shelterId;

    if (!shelterId) {
      const approvedApp = await StaffApplication.findOne({
        userId: req.user!.id,
        status: "approved",
      });
      if (approvedApp) {
        shelterId = approvedApp.shelterId.toString();
      }
    }

    if (!shelterId) {
      throw new AppError(403, "Shelter access required");
    }

    // Check if pet exists and belongs to this shelter
    const pet = await Pet.findById(petId);
    if (!pet || pet.shelterId.toString() !== shelterId) {
      throw new AppError(404, "Pet not found in your shelter");
    }

    if (pet.status === "fostered") {
      throw new AppError(400, "Pet is already in foster");
    }

    // Check if foster exists and belongs to this shelter
    const foster = await Foster.findById(fosterId);
    if (!foster || foster.shelterId.toString() !== shelterId) {
      throw new AppError(404, "Foster parent not found in your shelter");
    }

    if (foster.status !== "approved") {
      throw new AppError(400, "Foster parent is not approved");
    }

    // Check capacity
    if (foster.currentAnimals >= foster.capacity) {
      throw new AppError(400, "Foster parent has reached maximum capacity");
    }

    // Check preferred species
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

    const assignment = await FosterAssignment.create({
      fosterId,
      petId,
      shelterId,
      expectedDuration,
      notes,
      status: "active",
    });

    // Update foster current animals count
    foster.currentAnimals += 1;
    await foster.save();

    // Update pet status
    pet.status = "fostered";
    await pet.save();

    res.status(201).json({
      success: true,
      message: "Pet assigned to foster successfully",
      data: assignment,
    });
  },
);

export const takeBackPetFromFoster = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params; // Assignment ID
    const { returnStatus = "available", notes: returnNotes } = req.body;

    const assignment = await FosterAssignment.findById(id);
    if (!assignment || assignment.status !== "active") {
      throw new AppError(404, "Active foster assignment not found");
    }

    if (req.user!.role === "shelter_staff") {
      let shelterId = req.user!.shelterId;
      if (!shelterId) {
        const approvedApp = await StaffApplication.findOne({
          userId: req.user!.id,
          status: "approved",
        });
        if (approvedApp) {
          shelterId = approvedApp.shelterId.toString();
        }
      }

      if (!shelterId || assignment.shelterId.toString() !== shelterId) {
        throw new AppError(403, "Access denied");
      }
    }

    const pet = await Pet.findById(assignment.petId);
    const foster = await Foster.findById(assignment.fosterId);

    // Update assignment
    assignment.status = "completed";
    assignment.endDate = new Date();
    if (returnNotes) {
      assignment.notes = `${assignment.notes}\n\nReturn Notes: ${returnNotes}`;
    }
    await assignment.save();

    // Update foster parent capacity
    if (foster) {
      foster.currentAnimals = Math.max(0, foster.currentAnimals - 1);
      await foster.save();
    }

    // Update pet status
    if (pet) {
      pet.status = returnStatus;
      await pet.save();
    }

    res.json({
      success: true,
      message: "Pet taken back from foster successfully",
      data: assignment,
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
    const foster = await Foster.findOne({
      userId,
      deletedAt: { $exists: false },
    }).populate("shelterId", "name");

    res.json({
      success: true,
      data: foster,
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
