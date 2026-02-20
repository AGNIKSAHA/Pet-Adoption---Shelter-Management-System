import mongoose, { FilterQuery } from "mongoose";
import {
  Application,
  IApplication,
  ApplicationStatus,
} from "./application.model";
import { Pet, IPet } from "../pet/pet.model";
import { IUser } from "../user/user.model";
import { AppError } from "../../common/middlewares/error.middleware";
import { AuditLog } from "../audit/audit.model";
import { createNotification } from "../../common/utils/notification.util";
import {
  buildApplicationStatusDedupKey,
  enqueueApplicationStatusEmail,
} from "../../common/utils/email-outbox.util";

export const createApplicationInDB = async (
  data: {
    petId: string;
    questionnaire: IApplication["questionnaire"];
    references: IApplication["references"];
  },
  userId: string,
  ip: string,
  userAgent?: string,
) => {
  const { petId, questionnaire, references } = data;

  const pet = await Pet.findById(petId);
  if (!pet) {
    throw new AppError(404, "Pet not found");
  }

  if (pet.status !== "available") {
    throw new AppError(400, "Pet is not available for adoption");
  }

  const existingApp = await Application.findOne({
    petId,
    adopterId: userId,
    status: { $in: ["submitted", "reviewing", "interview", "approved"] },
  });

  if (existingApp) {
    throw new AppError(
      409,
      "You already have an active application for this pet",
    );
  }

  const application = await Application.create({
    petId,
    adopterId: userId,
    shelterId: pet.shelterId,
    questionnaire,
    references,
  });

  // Queue background job for notification (non-blocking)
  const { notificationQueue } = await import("../../../queues");
  notificationQueue
    .add({
      userId: pet.shelterId.toString(),
      type: "application_update",
      title: "New Adoption Application",
      message: `New application received for ${pet.name}`,
      link: `/applications/${application._id}`,
    })
    .catch((error: unknown) => {
      console.error("Failed to queue notification job:", error);
      // Fallback to synchronous notification if queue fails
      createNotification({
        userId: pet.shelterId.toString(),
        type: "application_update",
        title: "New Adoption Application",
        message: `New application received for ${pet.name}`,
        link: `/applications/${application._id}`,
      }).catch(console.error);
    });

  // Trigger webhooks for application submission
  const { triggerWebhooks } = await import("../webhook/webhook.service");
  triggerWebhooks("application.submitted", {
    applicationId: application._id.toString(),
    petId: pet._id.toString(),
    petName: pet.name,
    shelterId: pet.shelterId.toString(),
    adopterId: userId,
    submittedAt: application.submittedAt,
  }).catch(console.error);

  await AuditLog.create({
    userId,
    action: "create_application",
    resource: "application",
    resourceId: application._id,
    ipAddress: ip,
    userAgent,
  });

  return application;
};

export const getApplicationsFromDB = async (
  userId: string,
  role: string,
  shelterIdFromToken?: string,
  filters: Record<string, unknown> = {},
) => {
  const { status, shelterId, page = 1, limit = 20 } = filters;
  const query: FilterQuery<IApplication> = {};

  console.log("getApplicationsFromDB called with:", {
    userId,
    role,
    shelterIdFromToken,
    filters,
  });

  if (role === "adopter") {
    query.adopterId = userId;
  } else if (role === "shelter_staff") {
    // If a specific shelterId is provided, use it, otherwise fallback to token's shelterId
    const targetShelterId = (shelterId as string) || shelterIdFromToken;
    if (targetShelterId) {
      query.shelterId = targetShelterId;
    }
  } else if (role === "admin" && shelterId) {
    query.shelterId = shelterId;
  }

  if (status) query.status = status;

  console.log("Query constructed:", query);

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const [applications, total] = await Promise.all([
    Application.find(query)
      .populate("petId", "name species breed photos")
      .populate("adopterId", "firstName lastName email phone")
      .populate("shelterId", "name")
      .populate("reviewedBy", "firstName lastName")
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Application.countDocuments(query),
  ]);

  console.log("Applications found:", {
    count: applications.length,
    total,
    applications: applications.map((app) => ({
      id: app._id,
      petId: app.petId,
      adopterId: app.adopterId,
      status: app.status,
    })),
  });

  return {
    applications,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  };
};

export const getApplicationByIdFromDB = async (
  id: string,
  userId: string,
  role: string,
  shelterIdFromToken?: string,
) => {
  const application = await Application.findById(id)
    .populate("petId")
    .populate("adopterId", "firstName lastName email phone address")
    .populate("shelterId", "name email phone")
    .populate("reviewedBy", "firstName lastName");

  if (!application) {
    throw new AppError(404, "Application not found");
  }

  if (role === "adopter" && application.adopterId._id.toString() !== userId) {
    throw new AppError(403, "Access denied");
  }

  if (role === "shelter_staff") {
    const applicationShelterId = application.shelterId._id.toString();

    console.log("Authorization check for shelter staff:", {
      userId,
      shelterIdFromToken,
      applicationShelterId,
    });

    // Check if the staff's token shelterId matches
    const hasTokenAccess = shelterIdFromToken === applicationShelterId;

    // Also check if the staff has an approved application for this shelter
    let hasApprovedAccess = false;
    if (!hasTokenAccess) {
      const { StaffApplication } =
        await import("../shelter/staff-application.model");
      const staffApp = await StaffApplication.findOne({
        userId,
        shelterId: applicationShelterId,
        status: "approved",
      });
      hasApprovedAccess = !!staffApp;
      console.log("Checked staff application:", {
        hasApprovedAccess,
        foundStaffApp: !!staffApp,
      });
    }

    console.log("Access check result:", { hasTokenAccess, hasApprovedAccess });

    if (!hasTokenAccess && !hasApprovedAccess) {
      throw new AppError(403, "Access denied");
    }
  }

  return application;
};

export const updateApplicationStatusInDB = async (
  id: string,
  data: { status: ApplicationStatus; notes?: string; expectedVersion?: number },
  userId: string,
  role: string,
  shelterIdFromToken?: string,
  ip?: string,
  userAgent?: string,
) => {
  const { status, notes, expectedVersion } = data;

  const application =
    await Application.findById(id).populate("petId adopterId");
  if (!application) {
    throw new AppError(404, "Application not found");
  }

  if (role === "shelter_staff") {
    const applicationShelterId = application.shelterId.toString();

    console.log("Update status authorization check:", {
      userId,
      shelterIdFromToken,
      applicationShelterId,
    });

    // Check if the staff's token shelterId matches
    const hasTokenAccess = shelterIdFromToken === applicationShelterId;

    // Also check if the staff has an approved application for this shelter
    let hasApprovedAccess = false;
    if (!hasTokenAccess) {
      const { StaffApplication } =
        await import("../shelter/staff-application.model");
      const staffApp = await StaffApplication.findOne({
        userId,
        shelterId: applicationShelterId,
        status: "approved",
      });
      hasApprovedAccess = !!staffApp;
      console.log("Checked staff application for update:", {
        hasApprovedAccess,
        foundStaffApp: !!staffApp,
      });
    }

    console.log("Update access check result:", {
      hasTokenAccess,
      hasApprovedAccess,
    });

    if (!hasTokenAccess && !hasApprovedAccess) {
      throw new AppError(403, "Access denied");
    }
  }

  if (!Number.isInteger(expectedVersion)) {
    throw new AppError(
      400,
      "expectedVersion is required for concurrent-safe reviews",
    );
  }

  const oldStatus = application.status;
  const updatePayload: Record<string, unknown> = {
    status,
    reviewedBy: new mongoose.Types.ObjectId(userId),
    reviewedAt: new Date(),
  };
  if (notes !== undefined) {
    updatePayload.notes = notes;
  }

  const updatedWithLock = await Application.findOneAndUpdate(
    { _id: id, __v: expectedVersion },
    {
      $set: updatePayload,
      $inc: { __v: 1 },
    },
    { new: true },
  );

  if (!updatedWithLock) {
    const latest = await Application.findById(id)
      .populate("petId", "name species breed photos")
      .populate("adopterId", "firstName lastName email phone")
      .populate("shelterId", "name")
      .populate("reviewedBy", "firstName lastName");

    throw new AppError(
      409,
      "Merge conflict: this application was updated by another reviewer",
      true,
      {
        code: "APPLICATION_VERSION_CONFLICT",
        currentApplication: latest,
      },
    );
  }

  const updatedApplication = await Application.findById(id).populate(
    "petId adopterId",
  );
  if (!updatedApplication) {
    throw new AppError(404, "Application not found");
  }

  if (status === "approved") {
    const pet = await Pet.findById(updatedApplication.petId);
    if (pet && pet.status === "available") {
      pet.status = "adopted";
      pet.adoptionDate = new Date();
      await pet.save();
    }
  }

  // Queue notification and email as background jobs (non-blocking)
  const { notificationQueue } = await import("../../../queues");

  notificationQueue
    .add({
      userId: updatedApplication.adopterId._id.toString(),
      type: "application_update",
      title: "Application Status Update",
      message: `Your application for ${(updatedApplication.petId as unknown as IPet).name} has been ${status}`,
      link: `/applications/${updatedApplication._id}`,
    })
    .catch(console.error);

  enqueueApplicationStatusEmail({
    dedupKey: buildApplicationStatusDedupKey(
      updatedApplication._id.toString(),
      status,
    ),
    to: (updatedApplication.adopterId as unknown as IUser).email,
    petName: (updatedApplication.petId as unknown as IPet).name,
    status,
  }).catch(console.error);

  // Trigger webhooks for application status update
  const { triggerWebhooks } = await import("../webhook/webhook.service");
  triggerWebhooks(`application.${status}`, {
    applicationId: updatedApplication._id.toString(),
    petId: updatedApplication.petId._id.toString(),
    petName: (updatedApplication.petId as unknown as IPet).name,
    shelterId: updatedApplication.shelterId.toString(),
    adopterId: updatedApplication.adopterId._id.toString(),
    adopterEmail: (updatedApplication.adopterId as unknown as IUser).email,
    status,
    reviewedBy: userId,
    reviewedAt: updatedApplication.reviewedAt,
    notes: updatedApplication.notes,
  }).catch(console.error);

  await AuditLog.create({
    userId,
    action: "update_application_status",
    resource: "application",
    resourceId: updatedApplication._id,
    changes: { oldStatus, newStatus: status, notes },
    ipAddress: ip,
    userAgent,
  });

  return updatedApplication;
};

export const withdrawApplicationInDB = async (
  id: string,
  userId: string,
  ip?: string,
  userAgent?: string,
) => {
  const application = await Application.findById(id);
  if (!application) {
    throw new AppError(404, "Application not found");
  }

  if (application.adopterId.toString() !== userId) {
    throw new AppError(403, "You can only withdraw your own applications");
  }

  if (["approved", "rejected"].includes(application.status)) {
    throw new AppError(400, "Cannot withdraw an already processed application");
  }

  application.status = "rejected";
  application.notes = "Withdrawn by applicant";
  await application.save();

  await AuditLog.create({
    userId,
    action: "withdraw_application",
    resource: "application",
    resourceId: application._id,
    ipAddress: ip,
    userAgent,
  });

  return application;
};
