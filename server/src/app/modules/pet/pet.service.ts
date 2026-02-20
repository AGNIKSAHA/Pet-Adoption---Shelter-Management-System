import mongoose, { FilterQuery } from "mongoose";
import { Pet, PetStatus, IPet } from "./pet.model";
import { Shelter } from "../shelter/shelter.model";
import { AppError } from "../../common/middlewares/error.middleware";
import { AuditLog } from "../audit/audit.model";
import { User } from "../user/user.model";
import { PetVetApproval } from "./pet-vet-approval.model";
import { PetTransferRequest } from "./pet-transfer.model";
import { sendEmail } from "../../common/utils/mail";
import { env } from "../../common/config/env";
import { Application } from "../application/application.model";
import { FosterAssignment } from "../foster/foster-assignment.model";

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
  const shelterId =
    userRole === "admin" ? queryShelterId : queryShelterId || userShelterId;

  const query: FilterQuery<IPet> & { isActive?: boolean } = { isActive: true };
  if (shelterId) query.shelterId = new mongoose.Types.ObjectId(shelterId);

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

  if (pet.status === "medical_hold" && status === "available") {
    throw new AppError(
      400,
      "Vet sign-off required. Submit vet approval request to release from medical hold.",
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

export const requestVetMedicalReleaseInDB = async (
  petId: string,
  vetEmail: string,
  requestNote: string | undefined,
  userId: string,
  userRole: string,
  ip?: string,
  userAgent?: string,
) => {
  const pet = await Pet.findById(petId).populate("shelterId", "name");
  if (!pet) {
    throw new AppError(404, "Pet not found");
  }

  if (pet.status !== "medical_hold") {
    throw new AppError(
      400,
      "Vet sign-off is only required when pet is in medical hold",
    );
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
        "You must be an approved staff member for this shelter to request vet sign-off",
      );
    }
  }

  const existingPending = await PetVetApproval.findOne({
    petId,
    status: "pending",
  });
  if (existingPending) {
    throw new AppError(
      400,
      "A pending vet sign-off request already exists for this pet",
    );
  }

  const vetApproval = await PetVetApproval.create({
    petId: pet._id,
    shelterId: pet.shelterId,
    requestedBy: userId,
    vetEmail,
    requestNote,
    status: "pending",
  });

  const serverBaseUrl =
    process.env.SERVER_PUBLIC_URL || `http://localhost:${env.PORT}`;
  const approveUrl = `${serverBaseUrl}/api/v1/pets/vet-approvals/${vetApproval.token}/approve`;
  const rejectUrl = `${serverBaseUrl}/api/v1/pets/vet-approvals/${vetApproval.token}/reject`;

  const shelterName =
    typeof pet.shelterId === "object" && "name" in pet.shelterId
      ? (pet.shelterId as { name?: string }).name || "Shelter"
      : "Shelter";

  await sendEmail({
    to: vetEmail,
    subject: `Vet Sign-off Required: ${pet.name} (${pet.species})`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; line-height: 1.5;">
        <h2>Medical Hold Release Request</h2>
        <p>A shelter staff member has requested your sign-off to release this pet from <strong>medical hold</strong> to <strong>available</strong>.</p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;margin:16px 0;">
          <p><strong>Pet Name:</strong> ${pet.name}</p>
          <p><strong>Species/Breed:</strong> ${pet.species} / ${pet.breed}</p>
          <p><strong>Age:</strong> ${pet.age} months</p>
          <p><strong>Gender:</strong> ${pet.gender}</p>
          <p><strong>Current Status:</strong> ${pet.status}</p>
          <p><strong>Shelter:</strong> ${shelterName}</p>
          <p><strong>Description:</strong> ${pet.description}</p>
          ${requestNote ? `<p><strong>Staff Note:</strong> ${requestNote}</p>` : ""}
        </div>
        <p>Please choose an action:</p>
        <div style="margin:20px 0;">
          <a href="${approveUrl}" style="display:inline-block;padding:10px 18px;background:#16a34a;color:#fff;text-decoration:none;border-radius:6px;margin-right:12px;">Accept</a>
          <a href="${rejectUrl}" style="display:inline-block;padding:10px 18px;background:#dc2626;color:#fff;text-decoration:none;border-radius:6px;">Reject</a>
        </div>
        <p style="font-size:12px;color:#64748b;">If buttons do not work, open these links manually:<br/>Approve: ${approveUrl}<br/>Reject: ${rejectUrl}</p>
      </div>
    `,
  });

  await AuditLog.create({
    userId,
    action: "request_vet_signoff",
    resource: "pet",
    resourceId: pet._id,
    changes: { from: "medical_hold", requestedTo: "available", vetEmail },
    ipAddress: ip,
    userAgent,
  });

  return vetApproval;
};

export const processVetMedicalReleaseInDB = async (
  token: string,
  decision: "approve" | "reject",
) => {
  // Standalone-safe flow (no Mongo transaction required)
  const nextStatus = decision === "approve" ? "approved" : "rejected";
  const approval = await PetVetApproval.findOneAndUpdate(
    { token, status: "pending" },
    { $set: { status: nextStatus, decidedAt: new Date() } },
    { new: true },
  );

  if (!approval) {
    const existing = await PetVetApproval.findOne({ token });
    if (!existing) {
      throw new AppError(404, "Vet approval request not found");
    }
    throw new AppError(400, `This request is already ${existing.status}.`);
  }

  const pet = await Pet.findById(approval.petId);
  if (!pet) {
    throw new AppError(404, "Pet not found");
  }

  if (decision === "approve") {
    pet.status = "available";
    await pet.save();
  }

  return { status: approval.status, petName: pet.name };
};

const getApprovedStaffShelterIds = async (userId: string) => {
  const { StaffApplication } = await import("../shelter/staff-application.model");
  const apps = await StaffApplication.find({ userId, status: "approved" }).select(
    "shelterId",
  );
  return apps.map((app) => app.shelterId.toString());
};

export const createPetTransferRequestInDB = async (
  petId: string,
  toShelterId: string,
  note: string | undefined,
  userId: string,
  ip?: string,
  userAgent?: string,
) => {
  const pet = await Pet.findById(petId);
  if (!pet) {
    throw new AppError(404, "Pet not found");
  }

  const fromShelterId = pet.shelterId.toString();
  if (fromShelterId === toShelterId) {
    throw new AppError(400, "Source and target shelter cannot be the same");
  }

  const staffShelterIds = await getApprovedStaffShelterIds(userId);
  if (!staffShelterIds.includes(fromShelterId)) {
    throw new AppError(403, "You can only transfer pets from your shelter");
  }

  const targetShelter = await Shelter.findOne({ _id: toShelterId, isActive: true });
  if (!targetShelter) {
    throw new AppError(404, "Target shelter not found or inactive");
  }

  const existingPending = await PetTransferRequest.findOne({
    petId,
    status: "pending",
  });
  if (existingPending) {
    throw new AppError(400, "A pending transfer request already exists");
  }

  const request = await PetTransferRequest.create({
    petId,
    fromShelterId,
    toShelterId,
    requestedBy: userId,
    note,
    status: "pending",
  });

  await AuditLog.create({
    userId,
    action: "create_pet_transfer_request",
    resource: "pet_transfer",
    resourceId: request._id,
    changes: { petId, fromShelterId, toShelterId, note },
    ipAddress: ip,
    userAgent,
  });

  return request;
};

export const getPetTransferRequestsForStaffInDB = async (userId: string) => {
  const staffShelterIds = await getApprovedStaffShelterIds(userId);

  const [incoming, outgoing] = await Promise.all([
    PetTransferRequest.find({
      toShelterId: { $in: staffShelterIds },
    })
      .populate("petId", "name species breed status photos")
      .populate("fromShelterId", "name")
      .populate("toShelterId", "name")
      .populate("requestedBy", "firstName lastName email")
      .populate("decidedBy", "firstName lastName email")
      .sort({ createdAt: -1 }),
    PetTransferRequest.find({
      requestedBy: userId,
    })
      .populate("petId", "name species breed status photos")
      .populate("fromShelterId", "name")
      .populate("toShelterId", "name")
      .populate("requestedBy", "firstName lastName email")
      .populate("decidedBy", "firstName lastName email")
      .sort({ createdAt: -1 }),
  ]);

  return { incoming, outgoing };
};

export const respondPetTransferRequestInDB = async (
  requestId: string,
  decision: "approved" | "rejected",
  decisionNote: string | undefined,
  userId: string,
  ip?: string,
  userAgent?: string,
) => {
  const request = await PetTransferRequest.findById(requestId);
  if (!request) {
    throw new AppError(404, "Transfer request not found");
  }

  if (request.status !== "pending") {
    throw new AppError(400, `Transfer request already ${request.status}`);
  }

  const staffShelterIds = await getApprovedStaffShelterIds(userId);
  if (!staffShelterIds.includes(request.toShelterId.toString())) {
    throw new AppError(403, "Only target shelter staff can process this request");
  }

  if (decision === "rejected") {
    request.status = "rejected";
    request.decidedBy = new mongoose.Types.ObjectId(userId);
    request.decisionNote = decisionNote;
    await request.save();

    await AuditLog.create({
      userId,
      action: "reject_pet_transfer_request",
      resource: "pet_transfer",
      resourceId: request._id,
      changes: { decisionNote },
      ipAddress: ip,
      userAgent,
    });

    return request;
  }

  const pet = await Pet.findById(request.petId);
  if (!pet) {
    throw new AppError(404, "Pet not found");
  }

  if (pet.shelterId.toString() !== request.fromShelterId.toString()) {
    throw new AppError(400, "Pet is no longer in source shelter");
  }

  const sourceShelter = await Shelter.findById(request.fromShelterId);
  const targetShelter = await Shelter.findById(request.toShelterId);
  if (!sourceShelter || !targetShelter) {
    throw new AppError(404, "Source or target shelter not found");
  }

  // Sequential transfer with compensation for standalone Mongo environments.
  const previousPetShelterId = pet.shelterId;
  const previousSourceOcc = sourceShelter.currentOccupancy;
  const previousTargetOcc = targetShelter.currentOccupancy;
  let applicationsMoved = false;
  let assignmentsMoved = false;

  try {
    pet.shelterId = request.toShelterId;
    await pet.save();

    await Application.updateMany(
      { petId: request.petId },
      { $set: { shelterId: request.toShelterId } },
    );
    applicationsMoved = true;

    await FosterAssignment.updateMany(
      { petId: request.petId },
      { $set: { shelterId: request.toShelterId } },
    );
    assignmentsMoved = true;

    sourceShelter.currentOccupancy = Math.max(0, sourceShelter.currentOccupancy - 1);
    targetShelter.currentOccupancy += 1;
    await sourceShelter.save();
    await targetShelter.save();

    request.status = "approved";
    request.decidedBy = new mongoose.Types.ObjectId(userId);
    request.decisionNote = decisionNote;
    await request.save();
  } catch (error) {
    // Compensation rollback
    pet.shelterId = previousPetShelterId;
    await pet.save().catch(() => null);

    if (applicationsMoved) {
      await Application.updateMany(
        { petId: request.petId },
        { $set: { shelterId: request.fromShelterId } },
      ).catch(() => null);
    }

    if (assignmentsMoved) {
      await FosterAssignment.updateMany(
        { petId: request.petId },
        { $set: { shelterId: request.fromShelterId } },
      ).catch(() => null);
    }

    sourceShelter.currentOccupancy = previousSourceOcc;
    targetShelter.currentOccupancy = previousTargetOcc;
    await sourceShelter.save().catch(() => null);
    await targetShelter.save().catch(() => null);

    throw error;
  }

  await AuditLog.create({
    userId,
    action: "approve_pet_transfer_request",
    resource: "pet_transfer",
    resourceId: request._id,
    changes: {
      petId: request.petId,
      fromShelterId: request.fromShelterId,
      toShelterId: request.toShelterId,
      decisionNote,
    },
    ipAddress: ip,
    userAgent,
  });

  return request;
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
