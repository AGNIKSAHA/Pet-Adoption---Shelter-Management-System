import { FilterQuery } from "mongoose";
import { User, IUser } from "../user/user.model";
import { Shelter, IShelter } from "../shelter/shelter.model";
import { StaffApplication } from "../shelter/staff-application.model";
import { AppError } from "../../common/middlewares/error.middleware";

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

export const createShelterInDB = async (data: Partial<IShelter>) => {
  return await Shelter.create(data);
};

export const updateShelterInDB = async (
  id: string,
  data: Partial<IShelter>,
) => {
  const shelter = await Shelter.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });

  if (!shelter) {
    throw new AppError(404, "Shelter not found");
  }

  return shelter;
};

export const deleteShelterFromDB = async (id: string) => {
  const shelter = await Shelter.findByIdAndDelete(id);
  if (!shelter) {
    throw new AppError(404, "Shelter not found");
  }
  return shelter;
};

// Shelter Staff Approval Management
export const getPendingShelterRequestsFromDB = async () => {
  return await StaffApplication.find({
    status: "pending",
  })
    .populate("userId", "firstName lastName email")
    .populate("shelterId", "name address")
    .sort("-requestDate");
};

export const approveShelterRequestInDB = async (applicationId: string) => {
  const application = await StaffApplication.findById(applicationId);
  if (!application) {
    throw new AppError(404, "Application not found");
  }

  if (application.status !== "pending") {
    throw new AppError(400, "Application is not in pending status");
  }

  application.status = "approved";
  await application.save();

  return application;
};

export const rejectShelterRequestInDB = async (applicationId: string) => {
  const application = await StaffApplication.findById(applicationId);
  if (!application) {
    throw new AppError(404, "Application not found");
  }

  if (application.status !== "pending") {
    throw new AppError(400, "Application is not in pending status");
  }

  application.status = "rejected";
  await application.save();

  return application;
};
