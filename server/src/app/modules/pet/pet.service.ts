import mongoose, { FilterQuery } from "mongoose";
import { Pet, PetStatus, IPet } from "./pet.model";
import { Shelter } from "../shelter/shelter.model";
import { AppError } from "../../common/middlewares/error.middleware";
import { AuditLog } from "../audit/audit.model";
import { User } from "../user/user.model";

export const createPetInDB = async (
  data: Omit<Partial<IPet>, "shelterId"> & {
    shelterId?: string | mongoose.Types.ObjectId;
  },
  userId: string,
  userRole: string,
  userShelterId?: string,
  ip?: string,
  userAgent?: string,
) => {
  let { shelterId } = data;

  if (userRole === "shelter_staff") {
    // If shelterId not provided in body, use the user's shelterId
    if (!shelterId && userShelterId) {
      shelterId = userShelterId as unknown as mongoose.Types.ObjectId;
    }

    if (!shelterId) {
      throw new AppError(400, "Shelter ID is required for staff to add a pet");
    }

    const { StaffApplication } =
      await import("../shelter/staff-application.model");
    const application = await StaffApplication.findOne({
      userId,
      shelterId,
      status: "approved",
    });

    if (!application) {
      throw new AppError(
        403,
        "You must be an approved staff member for this shelter to add pets",
      );
    }
  }

  if (!shelterId) {
    throw new AppError(400, "Shelter ID is required");
  }

  const shelter = await Shelter.findById(shelterId);
  if (!shelter) {
    throw new AppError(404, "Shelter not found");
  }

  const pet = await Pet.create({
    ...data,
    shelterId,
    temperament: data.temperament || [],
    compatibility: data.compatibility || {},
  });

  shelter.currentOccupancy += 1;
  await shelter.save();

  await AuditLog.create({
    userId,
    action: "create_pet",
    resource: "pet",
    resourceId: pet._id,
    ipAddress: ip,
    userAgent,
  });

  return pet;
};

export const getPetsFromDB = async (filters: Record<string, unknown>) => {
  const {
    species,
    breed,
    minAge,
    maxAge,
    gender,
    size,
    status,
    shelterId,
    goodWithKids,
    goodWithDogs,
    goodWithCats,
    page = 1,
    limit = 20,
  } = filters;

  const query: FilterQuery<IPet> & { isActive?: boolean } = { isActive: true };

  if (species) query.species = species;
  if (breed) query.breed = new RegExp(breed as string, "i");
  if (gender) query.gender = gender;
  if (size) query.size = size;
  if (status && status !== "all") {
    query.status = status;
  } else if (!shelterId) {
    // For public browse pets (no shelter filter), only show available pets
    query.status = "available";
  }
  // If shelterId is provided (shelter staff view), show all pets unless status is specified

  if (shelterId) query.shelterId = shelterId;

  if (minAge || maxAge) {
    query.age = {};
    if (minAge) query.age.$gte = parseInt(minAge as string);
    if (maxAge) query.age.$lte = parseInt(maxAge as string);
  }

  if (goodWithKids === "true") query["compatibility.goodWithKids"] = true;
  if (goodWithDogs === "true") query["compatibility.goodWithDogs"] = true;
  if (goodWithCats === "true") query["compatibility.goodWithCats"] = true;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const [pets, total] = await Promise.all([
    Pet.find(query)
      .populate("shelterId", "name address location")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Pet.countDocuments(query),
  ]);

  return {
    pets,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  };
};

export const getPetStatsFromDB = async (
  userRole: string,
  userShelterId?: string,
  queryShelterId?: string,
) => {
  const shelterId = userRole === "admin" ? queryShelterId : userShelterId;

  const query: FilterQuery<IPet> & { isActive?: boolean } = { isActive: true };
  if (shelterId) query.shelterId = shelterId;

  const stats = await Pet.aggregate([
    { $match: query },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  return stats.reduce(
    (acc: Record<string, number>, curr: { _id: string; count: number }) => {
      acc[curr._id] = curr.count;
      acc.total = (acc.total || 0) + curr.count;
      return acc;
    },
    { total: 0 },
  );
};

export const getPetByIdFromDB = async (id: string) => {
  const pet = await Pet.findById(id).populate(
    "shelterId",
    "name email phone address location",
  );

  if (!pet) {
    throw new AppError(404, "Pet not found");
  }

  // Find a contact person for this shelter (Priority: Admin -> Approved Staff)
  // We need a user ID for the messaging system
  const shelterId =
    typeof pet.shelterId === "object" && "_id" in pet.shelterId
      ? (pet.shelterId as { _id: unknown })._id
      : pet.shelterId;

  const contactPerson = await User.findOne({
    shelterId: shelterId,
    isActive: true,
    $or: [
      { role: "admin" }, // Shelter admin
      { role: "shelter_staff", shelterApprovalStatus: "approved" }, // Approved staff
    ],
  })
    .sort({ role: 1 }) // "admin" comes before "shelter_staff" alphabetically
    .select("_id firstName lastName email role");

  return { ...pet.toObject(), contactPerson };
};

export const updatePetInDB = async (
  id: string,
  updates: Partial<IPet>,
  userId: string,
  userRole: string,
  _userShelterId?: string,
  ip?: string,
  userAgent?: string,
) => {
  const pet = await Pet.findById(id);
  if (!pet) {
    throw new AppError(404, "Pet not found");
  }

  if (userRole === "shelter_staff") {
    const { StaffApplication } =
      await import("../shelter/staff-application.model");
    const application = await StaffApplication.findOne({
      userId,
      shelterId: pet.shelterId,
      status: "approved",
    });

    if (!application) {
      throw new AppError(
        403,
        "You must be an approved staff member for this shelter to update pets",
      );
    }
  }

  delete updates.status;
  delete updates.shelterId;

  Object.assign(pet, updates);
  await pet.save();

  await AuditLog.create({
    userId,
    action: "update_pet",
    resource: "pet",
    resourceId: pet._id,
    changes: updates,
    ipAddress: ip,
    userAgent,
  });

  return pet;
};

export const updatePetStatusInDB = async (
  id: string,
  status: string,
  userId: string,
  userRole: string,
  _userShelterId?: string,
  ip?: string,
  userAgent?: string,
) => {
  const pet = await Pet.findById(id);
  if (!pet) {
    throw new AppError(404, "Pet not found");
  }

  if (userRole === "shelter_staff") {
    const { StaffApplication } =
      await import("../shelter/staff-application.model");
    const application = await StaffApplication.findOne({
      userId,
      shelterId: pet.shelterId,
      status: "approved",
    });

    if (!application) {
      throw new AppError(
        403,
        "You must be an approved staff member for this shelter to update pet status",
      );
    }
  }

  if (!(pet as IPet).canTransitionTo(status as PetStatus)) {
    throw new AppError(
      400,
      `Invalid status transition from ${pet.status} to ${status}`,
    );
  }

  const oldStatus = pet.status;
  pet.status = status as PetStatus;

  if (status === "adopted" && !pet.adoptionDate) {
    pet.adoptionDate = new Date();
  }

  await pet.save();

  await AuditLog.create({
    userId,
    action: "update_pet_status",
    resource: "pet",
    resourceId: pet._id,
    changes: { oldStatus, newStatus: status },
    ipAddress: ip,
    userAgent,
  });

  return pet;
};

export const deletePetInDB = async (
  id: string,
  userId: string,
  userRole: string,
  _userShelterId?: string,
  ip?: string,
  userAgent?: string,
) => {
  const pet = await Pet.findById(id);
  if (!pet) {
    throw new AppError(404, "Pet not found");
  }

  if (userRole === "shelter_staff") {
    const { StaffApplication } =
      await import("../shelter/staff-application.model");
    const application = await StaffApplication.findOne({
      userId,
      shelterId: pet.shelterId,
      status: "approved",
    });

    if (!application) {
      throw new AppError(
        403,
        "You must be an approved staff member for this shelter to delete pets",
      );
    }
  }

  pet.isActive = false;
  await pet.save();

  const shelter = await Shelter.findById(pet.shelterId);
  if (shelter && shelter.currentOccupancy > 0) {
    shelter.currentOccupancy -= 1;
    await shelter.save();
  }

  await AuditLog.create({
    userId,
    action: "delete_pet",
    resource: "pet",
    resourceId: pet._id,
    ipAddress: ip,
    userAgent,
  });

  return pet;
};

export const searchNearbyInDB = async (
  longitude: string,
  latitude: string,
  maxDistance: string,
  page: string,
  limit: string,
) => {
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const shelters = await Shelter.find({
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [parseFloat(longitude), parseFloat(latitude)],
        },
        $maxDistance: parseInt(maxDistance),
      },
    },
    isActive: true,
  }).select("_id");

  const shelterIds = shelters.map((s) => s._id);

  const [pets, total] = await Promise.all([
    Pet.find({
      shelterId: { $in: shelterIds },
      status: "available",
      isActive: true,
    })
      .populate("shelterId", "name address location")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Pet.countDocuments({
      shelterId: { $in: shelterIds },
      status: "available",
      isActive: true,
    }),
  ]);

  return {
    pets,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  };
};
