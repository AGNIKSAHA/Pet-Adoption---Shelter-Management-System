import { Shelter, IShelter } from "./shelter.model";
import { User } from "../user/user.model";
import { StaffApplication } from "./staff-application.model";
import { AppError } from "../../common/middlewares/error.middleware";
import { AuditLog } from "../audit/audit.model";
export const createShelterInDB = async (data: Partial<IShelter>, userId: string, ip?: string, userAgent?: string) => {
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
export const applyToShelterInDB = async (userId: string, shelterId: string, ip?: string, userAgent?: string) => {
    const shelter = await Shelter.findById(shelterId);
    if (!shelter) {
        throw new AppError(404, "Shelter not found");
    }
    const user = await User.findById(userId);
    if (!user) {
        throw new AppError(404, "User not found");
    }
    const hasStaffRole = user.role === "shelter_staff" ||
        user.role === "admin" ||
        (user.roles &&
            (user.roles.includes("shelter_staff") || user.roles.includes("admin")));
    if (!hasStaffRole) {
        throw new AppError(400, "Only shelter staff can apply to a shelter");
    }
    const existingApp = await StaffApplication.findOne({ userId, shelterId });
    if (existingApp) {
        if (existingApp.status === "pending") {
            throw new AppError(400, "You already have a pending application");
        }
        if (existingApp.status === "approved") {
            throw new AppError(400, "You are already approved for this shelter");
        }
        existingApp.status = "pending";
        existingApp.requestDate = new Date();
        await existingApp.save();
        await AuditLog.create({
            userId,
            action: "reapply_to_shelter",
            resource: "staff_application",
            resourceId: existingApp._id,
            ipAddress: ip,
            userAgent,
        });
        return existingApp;
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
export const leaveShelterInDB = async (userId: string, shelterId: string, ip?: string, userAgent?: string) => {
    const shelter = await Shelter.findById(shelterId);
    if (!shelter) {
        throw new AppError(404, "Shelter not found");
    }
    const user = await User.findById(userId);
    if (!user) {
        throw new AppError(404, "User not found");
    }
    const hasMembership = user.memberships?.some((m) => m.shelterId.toString() === shelterId) || false;
    const hasDirectShelter = user.shelterId?.toString() === shelterId;
    if (!hasMembership && !hasDirectShelter) {
        throw new AppError(400, "You are not a member of this shelter");
    }
    user.memberships = (user.memberships || []).filter((m) => m.shelterId.toString() !== shelterId);
    if (user.shelterId?.toString() === shelterId) {
        const fallbackMembership = user.memberships.find((m) => m.role === "shelter_staff");
        user.shelterId = fallbackMembership?.shelterId;
    }
    if (!user.roles?.includes("shelter_staff")) {
        user.roles = Array.from(new Set([...(user.roles || []), "shelter_staff"]));
    }
    user.role = "shelter_staff";
    user.shelterApprovalStatus = user.memberships.length > 0 ? "approved" : undefined;
    await user.save();
    const application = await StaffApplication.findOne({ userId, shelterId });
    if (application && application.status === "approved") {
        application.status = "rejected";
        await application.save();
    }
    await AuditLog.create({
        userId,
        action: "leave_shelter",
        resource: "shelter",
        resourceId: shelter._id,
        ipAddress: ip,
        userAgent,
    });
    return { shelterId };
};
export const getStaffApplicationsInDB = async (userId: string) => {
    return await StaffApplication.find({ userId }).populate("shelterId");
};
export const approveStaffInDB = async (adminId: string, applicationId: string, ip?: string, userAgent?: string) => {
    const application = await StaffApplication.findById(applicationId);
    if (!application) {
        throw new AppError(404, "Application not found");
    }
    if (application.status !== "pending") {
        throw new AppError(400, "Application is not in pending status");
    }
    application.status = "approved";
    await application.save();
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
export const rejectStaffInDB = async (adminId: string, applicationId: string, ip?: string, userAgent?: string) => {
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
