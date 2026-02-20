import { FilterQuery } from "mongoose";
import { User, IUser } from "../user/user.model";
import { Shelter, IShelter } from "../shelter/shelter.model";
import { StaffApplication } from "../shelter/staff-application.model";
import { AppError } from "../../common/middlewares/error.middleware";
import { createNotification } from "../../common/utils/notification.util";

export const getAllUsersFromDB = async (
  page: number,
  limit: number,
  role?: string,
  search?: string,
) => {
  const skip = (page - 1) * limit;

  const query: FilterQuery<IUser> = {
    role: { $in: ["adopter", "shelter_staff"] },
  };

  if (role && ["adopter", "shelter_staff"].includes(role)) {
    query.role = role;
  }

  if (search) {
    query.$and = [
      { role: { $in: ["adopter", "shelter_staff"] } },
      {
        $or: [
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      },
    ];
  }

  const users = await User.find(query)
    .sort("-createdAt")
    .skip(skip)
    .limit(limit);

  const total = await User.countDocuments(query);

  return {
    users,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit),
    },
  };
};

export const updateUserStatusInDB = async (
  id: string,
  data: { role?: string; isEmailVerified?: boolean; isActive?: boolean },
) => {
  const user = await User.findById(id);
  if (!user) {
    throw new AppError(404, "User not found");
  }

  if (user.role === "admin") {
    throw new AppError(403, "Cannot modify admin accounts");
  }

  if (data.role && (data.role === "adopter" || data.role === "shelter_staff")) {
    user.role = data.role;
  }
  if (data.isEmailVerified !== undefined)
    user.isEmailVerified = data.isEmailVerified;
  if (data.isActive !== undefined) user.isActive = data.isActive;

  await user.save();
  return user;
};

export const getAllSheltersFromDB = async () => {
  return await Shelter.find().sort("-createdAt");
};

export const createShelterInDB = async (
  data: Partial<IShelter>,
  adminId: string,
) => {
  return await Shelter.create({ ...data, createdBy: adminId });
};

export const updateShelterInDB = async (
  id: string,
  data: Partial<IShelter>,
  adminId: string,
) => {
  const existingShelter = await Shelter.findById(id);
  if (!existingShelter) {
    throw new AppError(404, "Shelter not found");
  }

  // Ownership rule: one admin cannot edit another admin's shelter.
  if (
    existingShelter.createdBy &&
    existingShelter.createdBy.toString() !== adminId
  ) {
    throw new AppError(403, "You can only edit shelters that you created");
  }

  const shelter = await Shelter.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });

  if (!shelter) {
    throw new AppError(404, "Shelter not found");
  }

  return shelter;
};

export const deleteShelterFromDB = async (id: string, adminId: string) => {
  const shelter = await Shelter.findById(id);
  if (!shelter) {
    throw new AppError(404, "Shelter not found");
  }

  // Ownership rule: one admin cannot delete another admin's shelter.
  if (shelter.createdBy && shelter.createdBy.toString() !== adminId) {
    throw new AppError(403, "You can only delete shelters that you created");
  }

  const affectedUsers = await User.find({
    $or: [{ "memberships.shelterId": shelter._id }, { shelterId: shelter._id }],
  });

  for (const user of affectedUsers) {
    const currentMemberships = user.memberships || [];
    const hadShelterMembership = currentMemberships.some(
      (m) => m.shelterId.toString() === id,
    );

    user.memberships = currentMemberships.filter(
      (m) => m.shelterId.toString() !== id,
    );

    if (user.shelterId && user.shelterId.toString() === id) {
      const nextStaffMembership = user.memberships.find(
        (m) => m.role === "shelter_staff",
      );
      user.shelterId = nextStaffMembership?.shelterId;
    }

    await user.save();

    if (hadShelterMembership || user.role === "shelter_staff") {
      await createNotification({
        userId: user._id.toString(),
        type: "system",
        title: "Shelter Access Removed",
        message: `Your approved shelter "${shelter.name}" was deleted by an admin. Please select another shelter or apply again.`,
        link: "/profile",
      });
    }
  }

  await StaffApplication.deleteMany({ shelterId: shelter._id });
  await Shelter.findByIdAndDelete(id);

  return shelter;
};

// Shelter Staff Approval Management
export const getPendingShelterRequestsFromDB = async (adminId: string) => {
  const requests = await StaffApplication.find({
    status: { $in: ["pending", "rejected"] },
  })
    .populate("userId", "firstName lastName email")
    .populate({
      path: "shelterId",
      select: "name address createdBy",
      match: { createdBy: adminId },
    })
    .sort("-requestDate");

  return requests.filter((r) => !!r.shelterId);
};

export const approveShelterRequestInDB = async (
  applicationId: string,
  adminId: string,
) => {
  const application = await StaffApplication.findById(applicationId).populate(
    "shelterId",
    "createdBy",
  );
  if (!application) {
    throw new AppError(404, "Application not found");
  }

  const shelter = application.shelterId as unknown as {
    createdBy?: { toString: () => string };
  };
  if (!shelter?.createdBy || shelter.createdBy.toString() !== adminId) {
    throw new AppError(
      403,
      "You can only approve requests for shelters that you created",
    );
  }

  if (application.status === "approved") {
    throw new AppError(400, "Application is already approved");
  }

  application.status = "approved";
  await application.save();

  // Add membership to user
  const user = await User.findById(application.userId);
  if (user) {
    const exists = user.memberships?.find(
      (m) => m.shelterId.toString() === application.shelterId.toString(),
    );
    if (!exists) {
      if (!user.memberships) user.memberships = [];
      user.memberships.push({
        shelterId: application.shelterId,
        role: "shelter_staff",
      });

      // Update primary if not set
      if (!user.shelterId || user.role === "adopter") {
        user.shelterId = application.shelterId;
        user.role = "shelter_staff";
      }
      await user.save();
    }
  }

  return application;
};

export const rejectShelterRequestInDB = async (
  applicationId: string,
  adminId: string,
) => {
  const application = await StaffApplication.findById(applicationId).populate(
    "shelterId",
    "createdBy",
  );
  if (!application) {
    throw new AppError(404, "Application not found");
  }

  const shelter = application.shelterId as unknown as {
    createdBy?: { toString: () => string };
  };
  if (!shelter?.createdBy || shelter.createdBy.toString() !== adminId) {
    throw new AppError(
      403,
      "You can only reject requests for shelters that you created",
    );
  }

  if (application.status !== "pending") {
    throw new AppError(400, "Application is not in pending status");
  }

  application.status = "rejected";
  await application.save();

  return application;
};
