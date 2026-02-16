import { Shelter, IShelter } from "./shelter.model";
import { User } from "../user/user.model";
import { StaffApplication } from "./staff-application.model";
import { AppError } from "../../common/middlewares/error.middleware";
import { AuditLog } from "../audit/audit.model";

export const createShelterInDB = async (
  data: Partial<IShelter>,
  userId: string,
  ip?: string,
  userAgent?: string,
) => {
  const shelter = await Shelter.create(data);

  await AuditLog.create({
    userId,
    action: "create_shelter",
    resource: "shelter",
    resourceId: shelter._id,
    ipAddress: ip,
    userAgent,
  });

  return shelter;
};

export const getSheltersFromDB = async () => {
  return await Shelter.find({ isActive: true });
};

export const applyToShelterInDB = async (
  userId: string,
  shelterId: string,
  ip?: string,
  userAgent?: string,
) => {
  const shelter = await Shelter.findById(shelterId);
  if (!shelter) {
    throw new AppError(404, "Shelter not found");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(404, "User not found");
  }

  if (user.role !== "shelter_staff") {
    throw new AppError(400, "Only shelter staff can apply to a shelter");
  }

  // Check if already applied
  const existingApp = await StaffApplication.findOne({ userId, shelterId });
  if (existingApp) {
    throw new AppError(400, "You have already applied to this shelter");
  }

  const application = await StaffApplication.create({
    userId,
    shelterId,
    status: "pending",
  });

  await AuditLog.create({
    userId,
    action: "apply_to_shelter",
    resource: "staff_application",
    resourceId: application._id,
    ipAddress: ip,
    userAgent,
  });

  return application;
};

export const getStaffApplicationsInDB = async (userId: string) => {
  return await StaffApplication.find({ userId }).populate("shelterId");
};

export const approveStaffInDB = async (
  adminId: string,
  applicationId: string,
  ip?: string,
  userAgent?: string,
) => {
  const application = await StaffApplication.findById(applicationId);
  if (!application) {
    throw new AppError(404, "Application not found");
  }

  if (application.status !== "pending") {
    throw new AppError(400, "Application is not in pending status");
  }

  application.status = "approved";
  await application.save();

  // Update user role and shelter association
  await User.findByIdAndUpdate(application.userId, {
    role: "shelter_staff",
    shelterId: application.shelterId,
    shelterApprovalStatus: "approved",
  });

  await AuditLog.create({
    userId: adminId,
    action: "approve_staff_application",
    resource: "staff_application",
    resourceId: application._id,
    ipAddress: ip,
    userAgent,
  });

  return application;
};

export const rejectStaffInDB = async (
  adminId: string,
  applicationId: string,
  ip?: string,
  userAgent?: string,
) => {
  const application = await StaffApplication.findById(applicationId);
  if (!application) {
    throw new AppError(404, "Application not found");
  }

  if (application.status !== "pending") {
    throw new AppError(400, "Application is not in pending status");
  }

  application.status = "rejected";
  await application.save();

  await AuditLog.create({
    userId: adminId,
    action: "reject_staff_application",
    resource: "staff_application",
    resourceId: application._id,
    ipAddress: ip,
    userAgent,
  });

  return application;
};
