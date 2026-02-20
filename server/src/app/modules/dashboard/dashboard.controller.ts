import { Request, Response } from "express";
import { Pet } from "../pet/pet.model";
import { Application } from "../application/application.model";
import { Foster } from "../foster/foster.model";
import { Shelter } from "../shelter/shelter.model";
import { User } from "../user/user.model";
import { StaffApplication } from "../shelter/staff-application.model";
import { AuditLog } from "../audit/audit.model";
import { catchAsync } from "../../common/middlewares/catch.middleware";

const getCohortMonthKey = (date: Date, timezone?: string) => {
  const fallbackTimezone = "UTC";
  const safeTimezone = timezone || fallbackTimezone;
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: safeTimezone,
      year: "numeric",
      month: "2-digit",
    }).formatToParts(date);
    const year = parts.find((p) => p.type === "year")?.value;
    const month = parts.find((p) => p.type === "month")?.value;
    if (!year || !month) return "unknown";
    return `${year}-${month}`;
  } catch {
    return getCohortMonthKey(date, fallbackTimezone);
  }
};

export const getShelterDashboardStats = catchAsync(
  async (req: Request, res: Response) => {
    let shelterId: string | undefined;

    // Priority 1: Query parameter (for multi-shelter staff or admin)
    if (req.query.shelterId) {
      shelterId = req.query.shelterId as string;
    }
    // Priority 2: User's direct shelterId
    else if (req.user!.shelterId) {
      shelterId = req.user!.shelterId.toString();
    }
    // Priority 3: Check for approved staff applications
    else if (req.user!.role === "shelter_staff") {
      const approvedApp = await StaffApplication.findOne({
        userId: req.user!.id,
        status: "approved",
      });
      if (approvedApp) {
        shelterId = approvedApp.shelterId.toString();
      }
    }

    if (!shelterId) {
      res.json({
        success: true,
        data: {
          stats: {
            petsInCare: 0,
            pendingApplications: 0,
            activeFosters: 0,
            adoptionsThisMonth: 0,
          },
          recentActivity: [],
        },
      });
      return;
    }

    // 1. Pets in Care
    const petsInCare = await Pet.countDocuments({ shelterId, isActive: true });

    // 2. Pending Applications
    const pendingApplications = await Application.countDocuments({
      shelterId,
      status: { $in: ["submitted", "reviewing", "interview"] },
    });

    // 3. Active Fosters
    const activeFosters = await Foster.countDocuments({
      shelterId,
      status: "approved",
    });

    // 4. Adoptions this Month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const adoptionsThisMonth = await Pet.countDocuments({
      shelterId,
      status: "adopted",
      updatedAt: { $gte: startOfMonth }, // Assuming status changes update updatedAt
    });

    // 5. Recent Activity (related to this shelter's resources or staff)
    // Since AuditLog doesn't have shelterId directly, we search by userId if they are staff
    // Or better, we could find logs where resourceId is one of our pets/apps
    const recentActivity = await AuditLog.find({
      userId: req.user!.id,
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("userId", "firstName lastName");

    res.json({
      success: true,
      data: {
        stats: {
          petsInCare,
          pendingApplications,
          activeFosters,
          adoptionsThisMonth,
        },
        recentActivity: recentActivity.map((log) => ({
          id: log._id,
          action: log.action.replace(/_/g, " "),
          target: log.resource,
          time: log.createdAt,
        })),
      },
    });
  },
);

export const getAdopterDashboardStats = catchAsync(
  async (req: Request, res: Response) => {
    const adopterId = req.user!.id;

    const [totalApplications, approvedApplications, recentApps] =
      await Promise.all([
        Application.countDocuments({ adopterId }),
        Application.countDocuments({ adopterId, status: "approved" }),
        Application.find({ adopterId })
          .sort({ createdAt: -1 })
          .limit(5)
          .populate("petId", "name species breed photos")
          .populate("shelterId", "name"),
      ]);

    res.json({
      success: true,
      data: {
        stats: {
          totalApplications,
          approvedApplications,
          pendingReview: totalApplications - approvedApplications, // Simplified
        },
        recentApplications: recentApps,
      },
    });
  },
);

export const getAdminDashboardStats = catchAsync(
  async (_req: Request, res: Response) => {
    const startOfYear = new Date();
    startOfYear.setMonth(0, 1);
    startOfYear.setHours(0, 0, 0, 0);

    const [
      totalShelters,
      totalUsers,
      totalPets,
      adoptionsYTD,
      pendingShelterRequests,
      allShelters,
      allPetsForCohorts,
    ] = await Promise.all([
      Shelter.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: true }),
      Pet.countDocuments({ isActive: true }),
      Pet.countDocuments({
        status: "adopted",
        updatedAt: { $gte: startOfYear },
      }),
      StaffApplication.countDocuments({
        status: "pending",
      }),
      Shelter.find({ isActive: true }).select("_id timezone"),
      Pet.find({ isActive: true }).select("intakeDate status shelterId"),
    ]);

    const shelterTimezoneMap = new Map(
      allShelters.map((shelter) => [
        shelter._id.toString(),
        (shelter as unknown as { timezone?: string }).timezone || "UTC",
      ]),
    );

    const cohortsMap = new Map<
      string,
      { cohortMonth: string; totalIntake: number; adopted: number; inCare: number }
    >();

    allPetsForCohorts.forEach((pet) => {
      const shelterId = String(pet.shelterId);
      const timezone = shelterTimezoneMap.get(shelterId) || "UTC";
      const cohortMonth = getCohortMonthKey(new Date(pet.intakeDate), timezone);

      const existing = cohortsMap.get(cohortMonth) || {
        cohortMonth,
        totalIntake: 0,
        adopted: 0,
        inCare: 0,
      };

      existing.totalIntake += 1;
      if (pet.status === "adopted") {
        existing.adopted += 1;
      } else {
        existing.inCare += 1;
      }
      cohortsMap.set(cohortMonth, existing);
    });

    const intakeCohorts = Array.from(cohortsMap.values())
      .sort((a, b) => (a.cohortMonth < b.cohortMonth ? -1 : 1))
      .map((cohort) => ({
        ...cohort,
        adoptionRate: Number(
          ((cohort.adopted / Math.max(cohort.totalIntake, 1)) * 100).toFixed(2),
        ),
      }));

    res.json({
      success: true,
      data: {
        stats: {
          totalShelters,
          totalUsers,
          totalPets,
          adoptionsYTD,
          pendingShelterRequests,
        },
        analytics: {
          intakeCohorts,
          timezoneMode: "per-shelter",
        },
      },
    });
  },
);
